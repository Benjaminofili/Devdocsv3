import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { redis } from '../redis.js';
import { TIERS, TierId, TierConfig } from '../../../shared/tiers.config.js';

// Ensure Firebase Admin is initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    if (Object.keys(serviceAccount).length > 0) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
  } catch (e) {
    console.error('[FIREBASE] Init error in middleware', e);
  }
}

export interface AuthenticatedRequest extends VercelRequest {
  auth: {
    uid: string;
    tier: TierId;
    tierConfig: TierConfig;
  };
}

export type ProtectedHandler = (
  req: AuthenticatedRequest,
  res: VercelResponse
) => Promise<void> | void;

export function withAuth(handler: ProtectedHandler, options = { consumeCredit: true }) {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      let uid: string | null = null;
      let tierId: TierId = 'anonymous';

      // 1. Verify Firebase Token
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const idToken = authHeader.split(' ')[1];
          const decoded = await admin.auth().verifyIdToken(idToken);
          uid = decoded.uid;
          
          // Fetch Tier from Firestore (Un-spoofable)
          if (admin.apps.length) {
            const userDoc = await admin.firestore().collection('users').doc(uid).get();
            tierId = (userDoc.data()?.tier as TierId) || 'free';
          } else {
            tierId = 'free'; // Fallback if firebase isn't fully configured locally
          }
        } catch (e) {
          console.warn('[AUTH] Invalid token, falling back to anonymous');
        }
      }

      // Fallback for Anonymous
      if (!uid) {
        uid = (req.headers['x-session-id'] as string) || (req.headers['x-forwarded-for'] as string) || 'anonymous';
        tierId = 'anonymous';
      }

      const tierConfig = TIERS[tierId];

      // 2. Redis Rate Limiting (Monthly)
      if (options.consumeCredit && tierConfig.generationsPerMonth !== Infinity) {
        const month = new Date().toISOString().slice(0, 7); // YYYY-MM
        const key = `usage:${tierId}:${uid}:${month}`;
        
        const current = await redis.incr(key);
        if (current === 1) {
          await redis.expire(key, 32 * 24 * 60 * 60); // ~1 month TTL
        }

        if (current > tierConfig.generationsPerMonth) {
          return res.status(429).json({
            success: false,
            error: 'usage_limit',
            message: `Monthly limit reached for ${tierConfig.name} tier.`,
            upgradeRequired: tierId === 'free' ? 'pro' : null,
          });
        }
      }

      // 3. Attach to Request
      (req as AuthenticatedRequest).auth = { uid, tier: tierId, tierConfig };

      // 4. Execute Handler
      return handler(req as AuthenticatedRequest, res);

    } catch (error) {
      console.error('[MIDDLEWARE] Error:', error);
      return res.status(500).json({ error: 'Internal middleware error' });
    }
  };
}
