/**
 * POST /api/billing/checkout
 * 
 * Initialize a Paystack checkout for upgrading user tier.
 * Server reads price from TIERS[plan].price (never from client).
 * 
 * Request: { plan: 'pro' | 'lifetime' }
 * Response: { authorizationUrl, reference }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { withSentry } from '../_lib/withSentry.js';
import { logger } from '../_lib/logger.js';
import { verifyFirebaseToken, type AuthenticatedRequest } from '../_lib/auth.js';
import { TIERS, type TierId } from '../../shared/tiers.config.js';
import { ERROR_CODES, createErrorResponse } from '../../shared/error-codes.js';

async function handler(
  request: AuthenticatedRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const uid = request.auth?.uid;
    
    if (!uid) {
      logger.warn('[CHECKOUT] No authenticated user found');
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const { plan } = request.body as { plan?: string };

    if (!plan || !['pro', 'lifetime'].includes(plan)) {
      const error = createErrorResponse('BILLING_PLAN_NOT_FOUND');
      return response.status(400).json(error);
    }

    const tierId = plan as TierId;
    const tierConfig = TIERS[tierId];

    if (!tierConfig) {
      const error = createErrorResponse('BILLING_PLAN_NOT_FOUND');
      return response.status(404).json(error);
    }

    // Get user email from Firestore or auth
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();
    const email = userData?.email || request.auth?.email;

    if (!email) {
      logger.error('[CHECKOUT] No email found for user', { uid });
      return response.status(400).json({ error: 'User email not found' });
    }

    // SERVER-SIDE PRICE DETERMINATION (never trust client)
    const amount = tierConfig.price;

    logger.info('[CHECKOUT] Initializing payment', { uid, plan, amount, email });

    // Call Paystack initialize API
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount,
        callback_url: `${request.headers.origin || 'https://devdocs.example.com'}/dashboard`,
        metadata: {
          userId: uid,
          plan: tierId,
        },
      }),
    });

    const data = await paystackResponse.json();

    if (!paystackResponse.ok || !data.status) {
      logger.error('[CHECKOUT] Paystack initialization failed', { 
        status: paystackResponse.status, 
        message: data.message 
      });
      return response.status(paystackResponse.status).json({
        error: 'Payment initialization failed',
        details: data.message || 'Unknown error',
      });
    }

    logger.info('[CHECKOUT] Payment initialized successfully', { 
      reference: data.data.reference,
      authorizationUrl: data.data.authorization_url 
    });

    return response.status(200).json({
      success: true,
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
      amount,
      plan: tierId,
    });

  } catch (error) {
    logger.error('[CHECKOUT] Failed to initialize payment', error);
    return response.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Export the handler wrapped with authentication middleware
 */
async function authenticatedHandler(
  request: VercelRequest,
  response: VercelResponse,
) {
  await verifyFirebaseToken(request, response, handler);
}

export default withSentry(authenticatedHandler);
