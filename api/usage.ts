import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { getGenerationLimit } from './_lib/tiers-config.js';
import type { UserTier } from './_lib/types.js';
import { withSentry } from './_lib/withSentry.js';

if (!admin.apps.length) {
  try {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountVar) {
      throw new Error("Missing FIREBASE_SERVICE_ACCOUNT environment variable");
    }
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccountVar)),
    });
  } catch (error) {
    console.error('[FIREBASE INIT ERROR IN USAGE]', error);
  }
}

const db = admin.apps.length ? admin.firestore() : null;

async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const userId = request.query.userId as string | null;
  const sessionId = request.query.sessionId as string | null;
  const tier = (request.query.tier as UserTier) || 'anonymous';

  if (!sessionId && !userId) {
    return response.status(400).json({ error: 'Missing identifier' });
  }

  const identifier = userId ?? sessionId; // Clean identifier
  const today = new Date().toISOString().split('T')[0];
  const limit = getGenerationLimit(tier);

  try {
    let currentCount = 0;
    if (db) {
      const usageDoc = await db.collection('usage').doc(`${identifier}_${today}`).get();
      currentCount = usageDoc.data()?.count || 0;
    }

    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    return response.status(200).json({
      used: currentCount,
      limit,
      remaining: Math.max(0, limit - currentCount),
      tier,
      resetAt: tomorrow.toISOString(),
    });
  } catch (error) {
    console.error('[API/USAGE ERROR]', error);
    return response.status(500).json({ error: 'Failed to fetch usage' });
  }
}

export default withSentry(handler);
