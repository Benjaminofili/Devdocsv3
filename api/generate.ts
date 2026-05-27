import type { VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';

import { checkRateLimit, redis } from './lib/redis.js';
import { GenerateMasterSchema } from './_lib/validators/schemas.js';
import { minifyPackageJson } from './_lib/utils/minify-package-json.js';
import { buildMasterPrompt } from './_lib/ai/prompts/master-prompt.js';
import { aiOrchestrator } from './_lib/ai/orchestrator.js';
import { logger } from './_lib/logger.js';
import { isCacheValid } from './_lib/validators/cache.js';
import { CACHE_CONFIG } from './_lib/constants.js';
import { withAuth, type AuthenticatedRequest } from './_lib/middleware/withAuth.js';
import { withSentry } from './_lib/withSentry.js';

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

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const { uid, tier, tierConfig } = req.auth;

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

  // 🛡️ Enforce Private Repo Paywall
  // (We check if the repo is private based on a hint or if analyze sent it. 
  // For now, if the payload includes `isPrivateRepo`, we strictly enforce it)
  if (req.body.isPrivateRepo && !tierConfig.allowPrivateRepos) {
    return res.status(403).json({
      success: false,
      error: 'private_repo_paywall',
      message: 'Private repositories require the Pro plan.',
      upgradeRequired: 'pro',
    });
  }

  // 🛡️ Enforce Premium Sections Paywall
  // These should match the premium sections defined in bricks/index.ts
  const premiumSections = ['api-docs', 'architecture', 'database-schema'];
  const hasPremiumSelection = data.selectedSectionIds.some((id: string) => 
    premiumSections.includes(id)
  );

  if (hasPremiumSelection && !tierConfig.premiumSectionsEnabled) {
    return res.status(403).json({
      success: false,
      error: 'premium_section_paywall',
      message: 'Premium sections require the Pro plan.',
      upgradeRequired: 'pro',
    });
  }

  // Minify package.json before it touches any prompt or cache key
  const packageJson = minifyPackageJson(
    data.packageJson as Record<string, unknown> | undefined,
  );

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

  // ── Cache result ───────────────────────────────────────────────────────────
  if (aiResponse.content?.length > 100) {
    await redis.set(cacheKey, result, { ex: CACHE_CONFIG.GENERATION_TTL_SECONDS });
  }

  // ── History log ───────────────────────────────────────────────────────────
  if (admin.apps.length) {
    admin.firestore().collection('generation_history')
      .add({
        userId: uid !== 'anonymous' ? uid : null,
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
  });
}

// Ensure the middleware wraps the handler securely
export default withSentry(withAuth(handler as any));
