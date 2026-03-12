// api/generate.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkRateLimit, redis } from '../src/lib/rate-limit';
import { SECTION_BRICKS } from '../src/lib/bricks';
import { generateSectionPrompt } from '../src/lib/ai/prompts/section-prompts';
import { aiOrchestrator } from '../src/lib/ai/orchestrator';
import { logger } from '../src/lib/logger';
import { GenerateRequestSchema } from '../src/lib/validators/schemas';
import { isCacheValid, isContentCacheable } from '../src/lib/validators/cache';
import { CACHE_CONFIG, API_MESSAGES } from '../src/config/constants';
import { ZodError } from 'zod';
import { getGenerationLimit } from '../src/lib/tiers/config-server';
import { isSectionAvailable, getSectionTierRequirement } from '../src/lib/tiers/feature-flags';
import type { UserTier, DetectedStack } from '../src/types';

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

export default async function handler(
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

    const { sectionId, projectName, repoUrl, repoData, isFirstSection = true } = parseResult.data;

    // Normalize stack
    const stack: DetectedStack = {
      ...parseResult.data.stack,
      domainHints: parseResult.data.stack.domainHints || [],
    };

    // Determine tier from headers only (no Firestore needed)
    const userId = request.headers['x-user-id'] as string || null;
    const sessionId = request.headers['x-session-id'] as string || 'default-session';
    
    // Simple tier: authenticated users are 'free', anonymous are 'anonymous'
    const tier: UserTier = userId ? 'free' : 'anonymous';

    // Section availability check
    if (!isSectionAvailable(sectionId, tier)) {
      const requiredTier = getSectionTierRequirement(sectionId);
      return response.status(403).json({
        success: false,
        error: 'premium_feature',
        message: `"${sectionId}" requires ${requiredTier} access`,
      });
    }

    // Usage limit check (Redis-only, no Firestore)
    const usageIdentifier = userId || sessionId;
    let usageAllowed = true;
    let usageRemaining = 999;
    let usageLimit = getGenerationLimit(tier);

    if (isFirstSection) {
      const usageCheck = await checkUsageLimitRedis(usageIdentifier, tier);
      usageAllowed = usageCheck.allowed;
      usageRemaining = usageCheck.remaining;
      usageLimit = usageCheck.limit;

      if (!usageAllowed) {
        return response.status(429).json({
          success: false,
          error: 'usage_limit',
          message: `Usage limit reached for ${tier} tier`,
          usage: { used: usageLimit, limit: usageLimit, remaining: 0, tier, resetAt: null },
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

    const cached = await redis.get<CachedResponse>(cacheKey);
    if (isCacheValid(cached)) {
      return response.status(200).json({
        success: true,
        data: cached,
        cached: true,
        tier,
        usage: { remaining: usageRemaining, limit: usageLimit, resetAt: null },
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

    // Cache valid response
    if (isContentCacheable(aiResponse.content)) {
      await redis.set(cacheKey, result, { ex: CACHE_CONFIG.GENERATION_TTL_SECONDS });
    }

    logger.info('✅ Generated section', { sectionId, provider: aiResponse.provider, ms: Date.now() - startTime });

    return response.status(200).json({
      success: true,
      data: result,
      cached: false,
      tier,
      usage: { remaining: usageRemaining, limit: usageLimit, resetAt: null },
    });

  } catch (error) {
    logger.error('Generation processing failed', error);
    return response.status(500).json({ success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}

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
