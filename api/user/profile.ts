/**
 * GET /api/user/profile
 * 
 * Returns user profile with tier, usage, and plan information.
 * Requires Bearer token authentication.
 * 
 * Response: { tier, generationsUsed, generationsLimit, tierUpdatedAt }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { withSentry } from '../_lib/withSentry.js';
import { logger } from '../_lib/logger.js';
import { verifyFirebaseToken, type AuthenticatedRequest } from '../_lib/auth.js';
import { getTierConfig, type TierId } from '../../shared/tiers.config.js';

// Firebase initialization handled by auth middleware

async function handler(
  request: AuthenticatedRequest,
  response: VercelResponse,
) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Auth is handled by verifyFirebaseToken wrapper
    const uid = request.auth?.uid;
    
    if (!uid) {
      logger.warn('[PROFILE] No authenticated user found');
      return response.status(401).json({ error: 'Unauthorized' });
    }

    const db = admin.firestore();

    // Fetch user document from Firestore
    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      // Create user document if it doesn't exist
      const email = request.auth?.email;
      await db.collection('users').doc(uid).set({
        uid,
        email,
        tier: 'free',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      logger.info('[PROFILE] Created new user document', { uid });
      
      return response.status(200).json({
        success: true,
        profile: {
          uid,
          email,
          tier: 'free',
          tierConfig: getTierConfig('free'),
          generationsUsed: 0,
          generationsLimit: getTierConfig('free').generationsPerMonth,
          tierUpdatedAt: null,
        },
      });
    }

    const userData = userDoc.data();
    const tier: TierId = (userData?.tier as TierId) || 'free';
    const tierConfig = getTierConfig(tier);

    // Get current usage from Firestore
    const today = new Date().toISOString().split('T')[0];
    const usageDoc = await db.collection('usage').doc(`${uid}_${today}`).get();
    const generationsUsed = usageDoc.data()?.count || 0;

    logger.info('[PROFILE] Retrieved user profile', { uid, tier });

    return response.status(200).json({
      success: true,
      profile: {
        uid,
        email: userData?.email || request.auth?.email,
        tier,
        tierConfig: {
          id: tierConfig.id,
          name: tierConfig.name,
          generationsPerMonth: tierConfig.generationsPerMonth,
          maxRepoSizeMB: tierConfig.maxRepoSizeMB,
          sectionSelectEnabled: tierConfig.sectionSelectEnabled,
          historyDays: tierConfig.historyDays,
        },
        generationsUsed,
        generationsLimit: tierConfig.generationsPerMonth,
        tierUpdatedAt: userData?.tierUpdatedAt?.toDate?.()?.toISOString() || null,
      },
    });

  } catch (error) {
    logger.error('[PROFILE] Failed to retrieve user profile', error);
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
