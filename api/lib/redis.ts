import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { RATE_LIMIT } from '../../src/config/constants';

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error('Missing UPSTASH_REDIS environment variables');
}

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const rateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(
    RATE_LIMIT.REQUESTS_PER_WINDOW,
    RATE_LIMIT.WINDOW_SIZE as any
  ),
  analytics: true,
  prefix: RATE_LIMIT.PREFIX,
});

export async function checkRateLimit(identifier: string) {
  const { success, limit, reset, remaining } = await rateLimiter.limit(identifier);

  return {
    allowed: success,
    limit,
    remaining,
    resetAt: new Date(reset),
  };
}
