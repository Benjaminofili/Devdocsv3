import type { VercelRequest, VercelResponse } from '@vercel/node';
import { redis } from './lib/redis';
import { getGenerationLimit } from '../src/lib/tiers/config';
import type { UserTier } from '../src/types';
import { withSentry } from '../src/lib/withSentry';

async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const userId = request.query.userId as string | null;
  const sessionId = request.query.sessionId as string | null;
  const tier = (request.query.tier as UserTier) || 'anonymous';

  if (!sessionId && !userId) {
    return response.status(400).json({ error: 'Missing identifier' });
  }

  const identifier = userId ?? `anon:${sessionId}`;
  const today = new Date().toISOString().split('T')[0];
  const key = `usage:daily:${identifier}:${today}`;
  const limit = getGenerationLimit(tier);

  try {
    const currentCount = (await redis.get<number>(key)) ?? 0;

    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    return response.status(200).json({
      used: currentCount,
      limit,
      remaining: Math.max(0, limit - currentCount),
      tier,
      resetAt: tomorrow.toISOString(),
    });
  } catch (error) {
    return response.status(500).json({ error: 'Failed to fetch usage' });
  }
}

export default withSentry(handler);
