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
import { getUserTier, getGenerationLimit } from '../src/lib/tiers/config';
import { checkUsageLimit, recordUsage } from '../src/lib/tiers/usage';
import { isSectionAvailable, getSectionTierRequirement } from '../src/lib/tiers/feature-flags';
import type { UserTier, UsageCheckResult, DetectedStack } from '../src/types';
import { db } from '../src/lib/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

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

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();

  try {
    // Rate limiting
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

    // User and Session tracking from headers (passed by client)
    const userId = request.headers['x-user-id'] as string || null;
    const sessionId = request.headers['x-session-id'] as string || 'default-session';
    
    let tier: UserTier = 'anonymous';
    if (userId) {
      tier = await getUserTier(userId);
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

    // Usage limit check
    let usageResult: UsageCheckResult;
    if (isFirstSection) {
        usageResult = await checkUsageLimit(userId, sessionId, tier);
        if (!usageResult.allowed) {
          return response.status(429).json({
            success: false,
            error: 'usage_limit',
            message: `Usage limit reached for ${tier} tier`,
            usage: usageResult.usage,
          });
        }
    } else {
        usageResult = {
            allowed: true,
            usage: {
              used: 0,
              limit: getGenerationLimit(tier),
              remaining: 1,
              tier,
              resetAt: new Date().toISOString()
            }
        };
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
      if (isFirstSection) {
        await recordUsage(userId, sessionId, tier, { action: 'generate', stack: stack.primary, repoUrl: repoUrl || undefined });
      }
      
      return response.status(200).json({
        success: true,
        data: cached,
        cached: true,
        tier,
        usage: {
            remaining: Math.max(0, usageResult.usage.remaining - 1),
            limit: usageResult.usage.limit,
            resetAt: usageResult.usage.resetAt,
        }
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

    // Track usage and log to history
    if (isFirstSection) {
      await recordUsage(userId, sessionId, tier, { action: 'generate', stack: stack.primary, repoUrl: repoUrl || undefined });
    }

    // Log to Firestore history
    await addDoc(collection(db, 'generation_history'), {
      user_id: userId,
      session_id: sessionId,
      repo_url: repoUrl || null,
      project_name: projectName,
      stack: stack.primary,
      section_id: sectionId,
      content: aiResponse.content,
      provider: aiResponse.provider,
      tier,
      created_at: serverTimestamp(),
    });

    return response.status(200).json({
      success: true,
      data: result,
      cached: false,
      tier,
      usage: {
          remaining: Math.max(0, usageResult.usage.remaining - 1),
          limit: usageResult.usage.limit,
          resetAt: usageResult.usage.resetAt,
      }
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
  
  return sections.join('\n');
}
