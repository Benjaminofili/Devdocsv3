/**
 * AUTH MIDDLEWARE - SINGLE SOURCE OF TRUTH FOR AUTHENTICATION
 * 
 * This middleware decodes the Authorization: Bearer <token> header 
 * using Firebase Admin SDK and returns the uid.
 * 
 * If there is no Bearer token or it is invalid, return 401.
 * x-user-id headers DO NOT EXIST in this codebase.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { ERROR_CODES, createErrorResponse } from '../../shared/error-codes.js';
import { logger } from './logger.js';
import { getTierConfig, type TierId, type TierConfig } from '../../shared/tiers.config.js';

// Initialize Firebase Admin SDK (singleton)
if (!admin.apps.length) {
  try {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountVar) {
      throw new Error('Missing FIREBASE_SERVICE_ACCOUNT environment variable');
    }
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccountVar)),
    });
    logger.info('[AUTH] Firebase Admin SDK initialized successfully');
  } catch (error) {
    logger.error('[AUTH] Firebase initialization failed', error);
    throw error;
  }
}

const auth = admin.auth();
const db = admin.firestore();

export interface AuthenticatedRequest extends VercelRequest {
  auth?: {
    uid: string;
    email?: string;
    tier: TierId;
    tierConfig: TierConfig;
  };
}

export type AuthHandler = (req: AuthenticatedRequest, res: VercelResponse) => Promise<void>;

/**
 * Verify Firebase token and attach auth info to request
 * Returns 401 if token is missing or invalid
 */
export async function verifyFirebaseToken(
  req: VercelRequest,
  res: VercelResponse,
  handler: AuthHandler
): Promise<void> {
  try {
    // Extract Bearer token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('[AUTH] Missing or invalid Authorization header', { 
        hasAuthHeader: !!authHeader,
        startsWithBearer: authHeader?.startsWith('Bearer ') 
      });
      const error = createErrorResponse('AUTH_MISSING_TOKEN');
      return res.status(401).json(error);
    }

    const idToken = authHeader.split(' ')[1];

    if (!idToken) {
      logger.warn('[AUTH] Empty token after Bearer prefix');
      const error = createErrorResponse('AUTH_MISSING_TOKEN');
      return res.status(401).json(error);
    }

    // Verify the token with Firebase Admin SDK
    let decodedToken: admin.auth.DecodedIdToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (verifyError) {
      logger.warn('[AUTH] Token verification failed', verifyError);
      const error = createErrorResponse('AUTH_INVALID_TOKEN');
      return res.status(401).json(error);
    }

    const uid = decodedToken.uid;
    const email = decodedToken.email;

    // Fetch user tier from Firestore
    let tier: TierId = 'free';
    let tierConfig: TierConfig = getTierConfig('free');

    try {
      const userDoc = await db.collection('users').doc(uid).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        tier = (userData?.tier as TierId) || 'free';
        tierConfig = getTierConfig(tier);
        
        logger.debug('[AUTH] User tier loaded from Firestore', { uid, tier });
      } else {
        // Create user document if it doesn't exist
        await db.collection('users').doc(uid).set({
          uid,
          email,
          tier: 'free',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        
        logger.debug('[AUTH] Created new user document', { uid });
      }
    } catch (firestoreError) {
      logger.error('[AUTH] Failed to fetch user tier from Firestore', firestoreError);
      // Continue with default free tier rather than failing completely
      tier = 'free';
      tierConfig = getTierConfig('free');
    }

    // Attach auth info to request object
    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.auth = {
      uid,
      email,
      tier,
      tierConfig,
    };

    logger.info('[AUTH] Authentication successful', { 
      uid, 
      tier,
      email: email ? '[REDACTED]' : undefined 
    });

    // Call the actual handler with authenticated request
    return await handler(authenticatedReq, res);
    
  } catch (error) {
    logger.error('[AUTH] Unexpected authentication error', error);
    const errorResp = createErrorResponse('AUTH_UNAUTHORIZED');
    return res.status(401).json(errorResp);
  }
}

/**
 * Optional authentication - attaches auth if token present, 
 * but doesn't require it (for public repo access)
 */
export async function optionalAuth(
  req: VercelRequest,
  res: VercelResponse,
  handler: AuthHandler
): Promise<void> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided - continue without auth
    return await handler(req as AuthenticatedRequest, res);
  }

  // Token provided - verify it
  return await verifyFirebaseToken(req, res, handler);
}
