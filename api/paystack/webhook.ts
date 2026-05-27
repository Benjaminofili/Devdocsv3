import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import admin from 'firebase-admin';
import { withSentry } from '../_lib/withSentry.js';
import { logger } from '../_lib/logger.js';
import { TIERS, type TierId } from '../../shared/tiers.config.js';
import { ERROR_CODES, createErrorResponse } from '../../shared/error-codes.js';

// Disable Vercel body parsing to retain raw payload
export const config = { api: { bodyParser: false } };

/**
 * Helper to read raw request body as string
 */
async function getRawBody(req: VercelRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk.toString();
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// Bulletproof Firebase Initialization
if (!admin.apps.length) {
  try {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (!serviceAccountVar) {
      throw new Error("Missing FIREBASE_SERVICE_ACCOUNT environment variable");
    }

    const serviceAccount = JSON.parse(serviceAccountVar);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    
    logger.info('[FIREBASE WEBHOOK] Successfully initialized via JSON string');
  } catch (error) {
    logger.error('[FIREBASE WEBHOOK INIT ERROR]', error);
    throw error;
  }
}

const db = admin.apps.length ? admin.firestore() : null;

/**
 * Vercel Serverless Function: Paystack Webhook Handler
 * Endpoint: /api/paystack/webhook
 * 
 * FLOW:
 * 1. Verify Paystack-Signature header (HMAC-SHA512) — reject if invalid
 * 2. Parse event. Only handle 'charge.success'.
 * 3. Extract: amount, metadata.uid, metadata.plan, reference
 * 4. Check idempotency: if reference already processed in Firestore 
 *    billingEvents collection, return 200 (no-op)
 * 5. Verify: event.data.amount >= TIERS[plan].price — reject if not
 * 6. Update users/{uid}.tier in Firestore
 * 7. Store { reference, uid, plan, amount, processedAt } in 
 *    billingEvents/{reference}
 * 8. Return 200
 */

async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const signature = request.headers['x-paystack-signature'] as string;
  const secret = process.env.PAYSTACK_SECRET_KEY as string;

  if (!secret) {
    logger.error('[WEBHOOK] Missing PAYSTACK_SECRET_KEY environment variable');
    return response.status(500).json({ error: 'Server configuration error' });
  }

  // Read raw request body
  const rawBody = await getRawBody(request);

  logger.webhook('received', { reference: 'pending' });

  // Security: Validate Paystack signature using raw payload
  const hash = crypto
    .createHmac('sha512', secret)
    .update(rawBody)
    .digest('hex');

  if (hash !== signature) {
    logger.webhook('rejected', { reason: 'Invalid signature' });
    const error = createErrorResponse('BILLING_INVALID_SIGNATURE');
    return response.status(401).json(error);
  }

  logger.webhook('verified', { reference: 'pending' });

  // Parse the raw JSON payload
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch (parseError) {
    logger.error('[WEBHOOK] Failed to parse event JSON', parseError);
    return response.status(400).json({ error: 'Invalid event payload' });
  }

  try {
    // Handle downgrades
    if (event.event === 'subscription.disable' || event.event === 'charge.failed') {
      // In subscription.disable, customer metadata might hold the uid
      const uid = event.data?.customer?.metadata?.userId || event.data?.metadata?.userId;
      if (uid && db) {
        await db.collection('users').doc(uid).update({
          tier: 'free',
          subscriptionStatus: 'inactive',
          tierUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        logger.warn(`[WEBHOOK] Downgraded user ${uid} to free due to ${event.event}.`);
      }
      return response.status(200).send('OK');
    }

    // Only handle charge.success events for upgrades
    if (event.event !== 'charge.success') {
      logger.debug('[WEBHOOK] Ignoring unhandled event', { event: event.event });
      return response.status(200).send('OK');
    }

    const eventData = event.data;
    const reference = eventData.reference;
    const amount = eventData.amount;
    const userId = eventData.metadata?.userId;
    const plan = eventData.metadata?.plan as TierId | undefined;

    if (!reference) {
      logger.warn('[WEBHOOK] Missing reference in event data');
      return response.status(400).json({ error: 'Missing reference' });
    }

    if (!userId) {
      logger.warn('[WEBHOOK] Missing userId in metadata');
      return response.status(400).json({ error: 'Missing userId in metadata' });
    }

    if (!db) {
      throw new Error('Database not initialized in webhook');
    }

    // IDEMPOTENCY CHECK: Has this reference already been processed?
    const existingEventDoc = await db.collection('billingEvents').doc(reference).get();
    if (existingEventDoc.exists) {
      logger.webhook('received', { reference, reason: 'Already processed (idempotent)' });
      return response.status(200).send('OK'); // Idempotent - return success
    }

    // PLAN VALIDATION: Determine the plan from metadata or infer from amount
    let validatedPlan: TierId | null = null;

    if (plan && TIERS[plan]) {
      // Verify amount matches or exceeds the plan price
      const expectedPrice = TIERS[plan].price;
      if (amount < expectedPrice) {
        logger.webhook('rejected', { 
          reference, 
          reason: `Amount mismatch: paid ${amount}, expected ${expectedPrice}` 
        });
        const error = createErrorResponse('BILLING_AMOUNT_MISMATCH');
        return response.status(400).json(error);
      }
      validatedPlan = plan;
    } else {
      // Infer plan from amount if not provided in metadata
      for (const [tierId, tierConfig] of Object.entries(TIERS)) {
        if (amount >= tierConfig.price && tierConfig.price > 0) {
          validatedPlan = tierId as TierId;
          break;
        }
      }

      if (!validatedPlan) {
        logger.webhook('rejected', { reference, reason: 'Could not validate plan from amount' });
        return response.status(400).json({ error: 'Invalid payment amount' });
      }
    }

    // UPDATE USER TIER in Firestore
    await db.collection('users').doc(userId).update({
      tier: validatedPlan,
      subscriptionStatus: 'active',
      tierUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.tier('updated', { uid: userId, newTier: validatedPlan });

    // STORE BILLING EVENT for idempotency and audit trail
    await db.collection('billingEvents').doc(reference).set({
      reference,
      uid: userId,
      plan: validatedPlan,
      amount,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      event: event.event,
    });

    logger.webhook('verified', { reference, uid: userId, plan: validatedPlan });
    logger.info(`[WEBHOOK] User ${userId} upgraded to ${validatedPlan}`);

    return response.status(200).send('OK');

  } catch (error) {
    logger.error('[WEBHOOK] Error processing event', error);
    return response.status(500).json({ error: 'Internal server error' });
  }
}

export default withSentry(handler);

