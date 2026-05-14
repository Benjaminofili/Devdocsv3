import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import admin from 'firebase-admin';

// Bulletproof Firebase Initialization
if (!admin.apps.length) {
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.VITE_FIREBASE_CLIENT_EMAIL;
    
    let privateKey = process.env.FIREBASE_PRIVATE_KEY_BASE64 
      ? Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, 'base64').toString('utf8')
      : (process.env.FIREBASE_PRIVATE_KEY || process.env.VITE_FIREBASE_PRIVATE_KEY);

    if (privateKey) {
      // Remove any literal quotes Vercel might have wrapped around the string
      privateKey = privateKey.replace(/^['"]|['"]$/g, '');
      // Fix both escaped backslash-n and actual literal newlines
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Missing Firebase credentials in webhook");
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log('[FIREBASE WEBHOOK] Successfully initialized');
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
import { withSentry } from '../_lib/withSentry.js';

async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  const signature = request.headers['x-paystack-signature'] as string;
  const secret = process.env.PAYSTACK_SECRET_KEY as string;

  // Security: Validate Paystack signature
  const hash = crypto
    .createHmac('sha512', secret)
    .update(JSON.stringify(request.body))
    .digest('hex');

  if (hash !== signature) {
    console.error('[API/PAYSTACK/WEBHOOK] Invalid Signature');
    return response.status(401).json({ error: 'Invalid signature' });
  }

  const event = request.body;

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

