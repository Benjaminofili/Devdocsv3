import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import admin from 'firebase-admin';
import { withSentry } from '../_lib/withSentry.js';

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
    
    console.log('[FIREBASE WEBHOOK] Successfully initialized via JSON string');
  } catch (error) {
    console.error('[FIREBASE WEBHOOK INIT ERROR]', error);
    throw error;
  }
}

const db = admin.apps.length ? admin.firestore() : null;

/**
 * Vercel Serverless Function: Paystack Webhook Handler
 * Endpoint: /api/paystack/webhook
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

  // Read raw request body
  const rawBody = await getRawBody(request);

  // Security: Validate Paystack signature using raw payload
  const hash = crypto
    .createHmac('sha512', secret)
    .update(rawBody)
    .digest('hex');

  if (hash !== signature) {
    console.error('[API/PAYSTACK/WEBHOOK] Invalid Signature');
    return response.status(401).json({ error: 'Invalid signature' });
  }

  // Parse the raw JSON payload
  const event = JSON.parse(rawBody);

  try {
    if (event.event === 'charge.success' || event.event === 'subscription.create') {
      const userId = event.data.metadata?.userId;

      if (userId) {
        if (!db) {
          throw new Error('Database not initialized in webhook');
        }
        await db.collection('users').doc(userId).update({
          tier: 'premium',
          subscriptionStatus: 'active',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        console.log(`[API/PAYSTACK/WEBHOOK] User ${userId} upgraded to premium`);
      }
    }

    return response.status(200).send('OK');

  } catch (error) {
    console.error('[API/PAYSTACK/WEBHOOK] Error processing event:', error);
    return response.status(200).send('Processed with errors');
  }
}

export default withSentry(handler);

