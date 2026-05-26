// api/generate.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimit, redis } from './lib/redis.js';
import { SECTION_BRICKS } from './_lib/bricks/index.js';
import { generateSectionPrompt } from './_lib/ai/prompts/section-prompts.js';
import { aiOrchestrator } from './_lib/ai/orchestrator.js';
import { logger } from './_lib/logger.js';
import { GenerateRequestSchema } from './_lib/validators/schemas.js';
import { isCacheValid, isContentCacheable } from './_lib/validators/cache.js';
import { CACHE_CONFIG, API_MESSAGES } from './_lib/constants.js';
import { ZodError } from 'zod';
import { getGenerationLimit } from './_lib/tiers-config.js';
import { isSectionAvailable, getSectionTierRequirement } from './_lib/feature-flags.js';
import type { UserTier, DetectedStack } from './_lib/types.js';
import admin from 'firebase-admin';

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
    console.error('[FIREBASE INIT ERROR IN GENERATE]', error);
  }
}

const db = admin.apps.length ? admin.firestore() : null;

interface RepoData {
  files: Array<{ name: string; content: string }>;
  structure: string[];
  packageJson?: Record<string, unknown>;
  existingReadme?: string;
  envExample?: string;
  hasDocker?: boolean;
  hasTests?: boolean;
  hasCI?: boolean;
}

interface CachedResponse {
  sectionId: string;
  content: string;
  explanation: string;
  provider: string;
}

interface GeneratedSectionResult {
  sectionId: string;
  content: string;
  explanation: string;
  provider: string;
}

// Redis-only usage tracking (no Firestore in serverless)
async function checkUsageLimitRedis(identifier: string, tier: UserTier): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const limit = getGenerationLimit(tier);
  if (limit === Infinity) return { allowed: true, remaining: Infinity, limit };
  
  const key = `usage:daily:${identifier}:${new Date().toISOString().slice(0, 10)}`;
  const current = await redis.incr(key);
  if (current === 1) {
    // Set TTL to end of day (86400 seconds)
    await redis.expire(key, 86400);
  }
  const remaining = Math.max(0, limit - current);
  return { allowed: current <= limit, remaining, limit };
}

import { withSentry } from './_lib/withSentry.js';

async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    // Rate limiting by IP
    const ip = (request.headers['x-forwarded-for'] as string) || 'anonymous';
    const rateLimitResult = await checkRateLimit(ip);

    if (!rateLimitResult.allowed) {
      return response.status(429).json({
        success: false,
        error: API_MESSAGES.RATE_LIMIT_EXCEEDED,
        resetAt: rateLimitResult.resetAt,
        remaining: rateLimitResult.remaining,
      });
    }

    // Body validation
    const parseResult = GenerateRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return response.status(400).json({
        success: false,
        error: 'Invalid request',
        details: parseResult.error.flatten().fieldErrors,
      });
    }

    const { sectionId, projectName, repoUrl, repoData, isFirstSection = true, bypassCache = false } = parseResult.data;

    // Normalize stack
    const stack: DetectedStack = {
      ...parseResult.data.stack,
      domainHints: parseResult.data.stack.domainHints || [],
      contextFiles: parseResult.data.stack.contextFiles || [],
    };

    console.log(`[GENERATE] Received ${stack.contextFiles?.length || 0} context files`);
    if (bypassCache) {
      console.log(`[CACHE BYPASS] Forcing fresh generation for section: ${sectionId}`);
    }

    // Determine tier securely from Firestore if authenticated
    let userId: string | null = null;
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const idToken = authHeader.split(' ')[1];
        const decoded = await admin.auth().verifyIdToken(idToken);
        userId = decoded.uid;
      } catch (e) {
        console.warn('Invalid Bearer token on generate route');
      }
    }
    const sessionId = request.headers['x-session-id'] as string || 'default-session';
    
    let tier: UserTier = 'anonymous';
    if (userId) {
      if (db) {
        const userDoc = await db.collection('users').doc(userId).get();
        tier = (userDoc.data()?.tier as UserTier) || 'free';
      } else {
        tier = 'free';
      }
    }

    // Section availability check
    if (!isSectionAvailable(sectionId, tier)) {
      const requiredTier = getSectionTierRequirement(sectionId);
      return response.status(403).json({
        success: false,
        error: 'premium_feature',
        message: `"${sectionId}" requires ${requiredTier} access`,
      });
    }

    // Usage limit check (Firestore-backed)
    const identifier = userId || sessionId;
    const limit = getGenerationLimit(tier);
    let currentUsage = 0;

    if (isFirstSection && db && identifier) {
      const today = new Date().toISOString().split('T')[0];
      const usageDoc = await db.collection('usage').doc(`${identifier}_${today}`).get();
      currentUsage = usageDoc.data()?.count || 0;

      if (limit !== Infinity && currentUsage >= limit) {
        return response.status(429).json({
          success: false,
          error: 'usage_limit',
          message: `Usage limit reached for ${tier} tier`,
          usage: { used: currentUsage, limit: limit, remaining: 0, tier, resetAt: null },
        });
      }
    }

    // Find section config
    const section = SECTION_BRICKS.find(s => s.id === sectionId);
    if (!section) {
      return response.status(404).json({ success: false, error: API_MESSAGES.SECTION_NOT_FOUND });
    }

    // Build context and prompt
    const additionalContext = buildEnhancedContext(repoData as any, stack, projectName, repoUrl || undefined);
    const prompt = generateSectionPrompt(section, stack, projectName, additionalContext, repoUrl || undefined);

    // Cache handling
    const contextHash = repoData
      ? Buffer.from(JSON.stringify(repoData.structure?.slice(0, 10) || [])).toString('base64').slice(0, 20)
      : '';
    const projectSpecificHash = Buffer.from(`${projectName}:${sectionId}:${stack.primary}:${contextHash}`).toString('base64');
    const cacheKey = `generate:${projectSpecificHash}`;

    // Skip cache return if bypassCache is true
    const cached = await redis.get<CachedResponse>(cacheKey);
    if (isCacheValid(cached) && !bypassCache) {
      return response.status(200).json({
        success: true,
        data: cached,
        cached: true,
        tier,
        usage: { remaining: Math.max(0, limit - currentUsage), limit, resetAt: null },
      });
    }

    // Generate content
    const aiResponse = await aiOrchestrator.generate(prompt, additionalContext);
    const result: GeneratedSectionResult = {
      sectionId,
      content: aiResponse.content,
      explanation: section.whyImportant,
      provider: aiResponse.provider,
    };

    // Increment usage in Firestore on success
    if (db && identifier) {
      const today = new Date().toISOString().split('T')[0];
      const usageRef = db.collection('usage').doc(`${identifier}_${today}`);
      await usageRef.set({
        count: admin.firestore.FieldValue.increment(1),
        lastUsed: admin.firestore.FieldValue.serverTimestamp(),
        tier
      }, { merge: true });

      if (userId) {
        await db.collection('users').doc(userId).set({
          totalGenerations: admin.firestore.FieldValue.increment(1),
          lastGenerationAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
    }

    // Cache valid response
    if (isContentCacheable(aiResponse.content)) {
      await redis.set(cacheKey, result, { ex: CACHE_CONFIG.GENERATION_TTL_SECONDS });
    }

    // Log to generation_history in Firestore
    if (db) {
      try {
        await db.collection('generation_history').add({
          userId,
          repoUrl: repoUrl || null,
          projectName: projectName || null,
          sectionId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (historyError) {
        logger.error('Failed to log generation history to Firestore', historyError);
      }
    }

    logger.info('✅ Generated section', { sectionId, provider: aiResponse.provider, ms: Date.now() - startTime });

    return response.status(200).json({
      success: true,
      data: result,
      cached: false,
      tier,
      usage: { remaining: Math.max(0, limit - (currentUsage + 1)), limit, resetAt: null },
    });

  } catch (error) {
    logger.error('Generation processing failed', error);
    return response.status(500).json({ success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}

export default withSentry(handler);


function buildEnhancedContext(
  repoData: RepoData | undefined,
  stack: DetectedStack,
  projectName: string,
  repoUrl?: string
): string {
  const sections: string[] = [];
  sections.push(`=== PROJECT: ${projectName} ===`);
  sections.push(`Stack: ${stack.primary} (${stack.language})`);
  
  if (repoData?.packageJson) {
    sections.push('\n=== PACKAGE.JSON ===');
    if (repoData.packageJson.description) sections.push(`📌 DESCRIPTION: "${repoData.packageJson.description}"`);
    if (repoData.packageJson.scripts) {
      sections.push('\n📜 SCRIPTS:');
      Object.entries(repoData.packageJson.scripts as Record<string, string>).forEach(([n, c]) => sections.push(`  ${n}: ${c}`));
    }
  }
  
  if (repoData?.structure?.length) {
    sections.push('\n=== FILE STRUCTURE ===');
    sections.push(repoData.structure.slice(0, 30).join('\n'));
  }
  
  return sections.join('\n');
}
