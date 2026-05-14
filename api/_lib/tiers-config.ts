import type { UserTier } from './types.js';

export const TIER_CONFIGS: Record<UserTier, { maxGenerationsPerDay: number }> = {
  anonymous: { maxGenerationsPerDay: 5 },
  free: { maxGenerationsPerDay: 50 },
  premium: { maxGenerationsPerDay: Infinity },
};

export function getGenerationLimit(tier: UserTier): number {
  return TIER_CONFIGS[tier]?.maxGenerationsPerDay ?? 5;
}
