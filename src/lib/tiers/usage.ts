// src/lib/tiers/usage.ts
// Tracks and enforces usage limits
// Uses Redis for fast limit checks + Firestore for persistent logging

import { Redis } from '@upstash/redis'
import { db } from '../firebase/config'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { getGenerationLimit } from './config'
import { logger } from '@/lib/logger'
import type { UserTier, UsageInfo, UsageCheckResult } from '@/types'

// ============================================
// REDIS CLIENT
// ============================================

import { getEnv } from '@/lib/env'

const env = getEnv()
const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL || '',
  token: env.UPSTASH_REDIS_REST_TOKEN || '',
})


// ============================================
// KEY HELPERS
// ============================================

function getDailyKey(identifier: string): string {
  const today = new Date().toISOString().split('T')[0]
  return `usage:daily:${identifier}:${today}`
}

function getResetTime(): string {
  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  tomorrow.setUTCHours(0, 0, 0, 0)
  return tomorrow.toISOString()
}

// ============================================
// CHECK USAGE
// ============================================

export async function checkUsage(
  userId: string | null,
  sessionId: string | null,
  tier: UserTier
): Promise<UsageCheckResult> {
  const limit = getGenerationLimit(tier)
  const identifier = userId ?? `anon:${sessionId}`
  const key = getDailyKey(identifier)

  try {
    const currentCount = (await redis.get<number>(key)) ?? 0

    const usage: UsageInfo = {
      used: currentCount,
      limit,
      remaining: Math.max(0, limit - currentCount),
      tier,
      resetAt: getResetTime(),
    }

    if (currentCount >= limit) {
      return {
        allowed: false,
        usage,
        message:
          tier === 'anonymous'
            ? `Sign in with GitHub to get ${getGenerationLimit('free')} free generations per day!`
            : 'You\'ve reached your daily limit. Resets at midnight UTC.',
      }
    }

    return { allowed: true, usage }
  } catch (error) {
    logger.warn('Usage check failed, allowing generation', { error: error instanceof Error ? error.message : 'Unknown' })
    return {
      allowed: true,
      usage: {
        used: 0,
        limit,
        remaining: limit,
        tier,
        resetAt: getResetTime(),
      },
    }
  }
}

// ============================================
// RECORD USAGE
// ============================================

export async function recordUsage(
  userId: string | null,
  sessionId: string | null,
  tier: UserTier,
  metadata: {
    action: 'generate' | 'analyze'
    stack?: string
    repoUrl?: string
  }
): Promise<UsageInfo> {
  const identifier = userId ?? `anon:${sessionId}`
  const key = getDailyKey(identifier)

  try {
    const newCount = await redis.incr(key)
    await redis.expire(key, 86400)

    // Log to Firestore instead of Supabase
    logToFirestore(userId, sessionId, metadata).catch((err) =>
      logger.warn('Failed to log usage to Firestore', { error: err instanceof Error ? err.message : 'Unknown' })
    )

    const limit = getGenerationLimit(tier)

    return {
      used: newCount,
      limit,
      remaining: Math.max(0, limit - newCount),
      tier,
      resetAt: getResetTime(),
    }
  } catch (error) {
    logger.warn('Failed to record usage', { error: error instanceof Error ? error.message : 'Unknown' })
    const limit = getGenerationLimit(tier)
    return {
      used: 0,
      limit,
      remaining: limit,
      tier,
      resetAt: getResetTime(),
    }
  }
}

// ============================================
// GET CURRENT USAGE
// ============================================

export async function getCurrentUsage(
  userId: string | null,
  sessionId: string | null,
  tier: UserTier
): Promise<UsageInfo> {
  const identifier = userId ?? `anon:${sessionId}`
  const key = getDailyKey(identifier)
  const limit = getGenerationLimit(tier)

  try {
    const currentCount = (await redis.get<number>(key)) ?? 0

    return {
      used: currentCount,
      limit,
      remaining: Math.max(0, limit - currentCount),
      tier,
      resetAt: getResetTime(),
    }
  } catch {
    return {
      used: 0,
      limit,
      remaining: limit,
      tier,
      resetAt: getResetTime(),
    }
  }
}

export const checkUsageLimit = checkUsage
export const incrementUsage = recordUsage

// ============================================
// FIRESTORE LOGGING
// ============================================

async function logToFirestore(
  userId: string | null,
  sessionId: string | null,
  metadata: {
    action: 'generate' | 'analyze'
    stack?: string
    repoUrl?: string
  }
): Promise<void> {
  await addDoc(collection(db, 'usage_tracking'), {
    user_id: userId,
    session_id: sessionId,
    action: metadata.action,
    stack: metadata.stack ?? null,
    repo_url: metadata.repoUrl ?? null,
    created_at: serverTimestamp(),
    metadata: {},
  })
}
