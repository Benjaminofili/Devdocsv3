// api/generate.ts  — V3 Master README Generator
import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';

import { checkRateLimit, redis } from './lib/redis.js';
import { GenerateMasterSchema } from './_lib/validators/schemas.js';
import { minifyPackageJson } from './_lib/utils/minify-package-json.js';
import { buildMasterPrompt } from './_lib/ai/prompts/master-prompt.js';
import { aiOrchestrator } from './_lib/ai/orchestrator.js';
import { logger } from './_lib/logger.js';
import { isCacheValid } from './_lib/validators/cache.js';
import { CACHE_CONFIG, API_MESSAGES } from './_lib/constants.js';
import { getGenerationLimit } from './_lib/tiers-config.js';
import { withSentry } from './_lib/withSentry.js';
import type { UserTier } from './_lib/types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Firebase init (idempotent)
// ─────────────────────────────────────────────────────────────────────────────

if (!admin.apps.length) {
  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountVar) {
    console.error('[FIREBASE] Missing FIREBASE_SERVICE_ACCOUNT env var');
  } else {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccountVar)),
      });
    } catch (e) {
      console.error('[FIREBASE INIT ERROR]', e);
    }
  }
}

const db = admin.apps.length ? admin.firestore() : null;

// ─────────────────────────────────────────────────────────────────────────────
// Cache key
// We hash: projectName + selectedSectionIds + stack.primary + repoUrl
// so that the same project with a different section selection gets a fresh key.
// ─────────────────────────────────────────────────────────────────────────────

function buildCacheKey(
  projectName: string,
  selectedSectionIds: string[],
  stackPrimary: string,
  repoUrl?: string,
): string {
  const raw = `${projectName}|${selectedSectionIds.join(',')}|${stackPrimary}|${repoUrl ?? ''}`;
  const hash = Buffer.from(raw).toString('base64url').slice(0, 32);
  return `generate:v3:${hash}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  // ── Rate limit by IP ───────────────────────────────────────────────────────
  const ip = (req.headers['x-forwarded-for'] as string) || 'anonymous';
  const rateLimitResult = await checkRateLimit(ip);
  if (!rateLimitResult.allowed) {
    return res.status(429).json({
      success: false,
      error: API_MESSAGES.RATE_LIMIT_EXCEEDED,
      resetAt: rateLimitResult.resetAt,
      remaining: rateLimitResult.remaining,
    });
  }

  // ── Validate body ──────────────────────────────────────────────────────────
  const parseResult = GenerateMasterSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request',
      details: parseResult.error.flatten().fieldErrors,
    });
  }

  const data = parseResult.data;

  // Minify package.json before it touches any prompt or cache key
  const packageJson = minifyPackageJson(
    data.packageJson as Record<string, unknown> | undefined,
  );

  // ── Auth + tier resolution ─────────────────────────────────────────────────
  let userId: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const decoded = await admin.auth().verifyIdToken(authHeader.split(' ')[1]);
      userId = decoded.uid;
    } catch {
      console.warn('[AUTH] Invalid Bearer token — treating as anonymous');
    }
  }

  const sessionId = (req.headers['x-session-id'] as string) || 'default-session';
  const identifier = userId || sessionId;

  let tier: UserTier = 'anonymous';
  if (userId && db) {
    const userDoc = await db.collection('users').doc(userId).get();
    tier = (userDoc.data()?.tier as UserTier) || 'free';
  } else if (userId) {
    tier = 'free';
  }

  // ── Usage limit check ──────────────────────────────────────────────────────
  const limit = getGenerationLimit(tier);
  let currentUsage = 0;

  if (db) {
    const today = new Date().toISOString().split('T')[0];
    const usageDoc = await db.collection('usage').doc(`${identifier}_${today}`).get();
    currentUsage = usageDoc.data()?.count ?? 0;

    if (limit !== Infinity && currentUsage >= limit) {
      return res.status(429).json({
        success: false,
        error: 'usage_limit',
        message: `Daily limit reached for ${tier} tier`,
        usage: { used: currentUsage, limit, remaining: 0, tier, resetAt: null },
      });
    }
  }

  // ── Cache lookup ───────────────────────────────────────────────────────────
  const cacheKey = buildCacheKey(
    data.projectName,
    data.selectedSectionIds,
    data.stack.primary,
    data.repoUrl,
  );

  if (!data.bypassCache) {
    const cached = await redis.get<{ content: string; provider: string }>(cacheKey);
    if (isCacheValid(cached)) {
      logger.info('Cache hit', { cacheKey });
      return res.status(200).json({
        success: true,
        data: cached,
        cached: true,
        tier,
        usage: { remaining: Math.max(0, limit - currentUsage), limit, resetAt: null },
      });
    }
  } else {
    logger.info('[CACHE BYPASS] Forcing fresh generation');
  }

  // ── Build prompt ───────────────────────────────────────────────────────────
  const { system, user } = buildMasterPrompt({ ...data, packageJson });

  // ── LLM call ──────────────────────────────────────────────────────────────
  let aiResponse: { content: string; provider: string };
  try {
    aiResponse = await aiOrchestrator.generate(user, system);
  } catch (error) {
    logger.error('LLM generation failed', error);
    return res.status(502).json({
      success: false,
      error: 'Generation failed — please try again',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  const result = {
    content: aiResponse.content,
    provider: aiResponse.provider,
    sectionsWritten: data.selectedSectionIds,
  };

  // ── Increment usage ────────────────────────────────────────────────────────
  if (db) {
    const today = new Date().toISOString().split('T')[0];
    const usageRef = db.collection('usage').doc(`${identifier}_${today}`);
    await usageRef.set(
      {
        count: admin.firestore.FieldValue.increment(1),
        lastUsed: admin.firestore.FieldValue.serverTimestamp(),
        tier,
      },
      { merge: true },
    );

    if (userId) {
      await db.collection('users').doc(userId).set(
        {
          totalGenerations: admin.firestore.FieldValue.increment(1),
          lastGenerationAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  }

  // ── Cache result ───────────────────────────────────────────────────────────
  if (aiResponse.content?.length > 100) {
    await redis.set(cacheKey, result, { ex: CACHE_CONFIG.GENERATION_TTL_SECONDS });
  }

  // ── History log ───────────────────────────────────────────────────────────
  if (db) {
    db.collection('generation_history')
      .add({
        userId,
        repoUrl: data.repoUrl ?? null,
        projectName: data.projectName,
        selectedSectionIds: data.selectedSectionIds,
        provider: aiResponse.provider,
        tier,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      })
      .catch(e => logger.error('Failed to log generation history', e));
  }

  logger.info('✅ README generated', {
    projectName: data.projectName,
    sections: data.selectedSectionIds.length,
    provider: aiResponse.provider,
    ms: Date.now() - startTime,
  });

  return res.status(200).json({
    success: true,
    data: result,
    cached: false,
    tier,
    usage: {
      remaining: Math.max(0, limit - (currentUsage + 1)),
      limit,
      resetAt: null,
    },
  });
}

export default withSentry(handler);
