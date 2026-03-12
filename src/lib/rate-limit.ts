// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { RATE_LIMIT } from '../config/constants';

// Create Redis client
import { getEnv } from './env';

const env = getEnv();
export const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL || '',
  token: env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Create rate limiter
export const rateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(
        RATE_LIMIT.REQUESTS_PER_WINDOW,
        RATE_LIMIT.WINDOW_SIZE as any
    ),
    analytics: true,
    prefix: RATE_LIMIT.PREFIX,
});

// Helper to check rate limit
export async function checkRateLimit(identifier: string) {
    const { success, limit, reset, remaining } = await rateLimiter.limit(identifier);

    return {
        allowed: success,
        limit,
        remaining,
        resetAt: new Date(reset),
    };
}
