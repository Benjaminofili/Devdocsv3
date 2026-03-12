// src/lib/tiers/config-server.ts
// Firebase-free tier config for use in Node.js serverless API functions.
// Do NOT import from firebase/* in this file.

import type { UserTier } from '../../types';

export function getGenerationLimit(tier: UserTier): number {
  if (tier === 'premium') return Infinity;
  if (tier === 'free') return 50;
  return 5; // anonymous
}

export function getSaveLimit(tier: UserTier): number {
  if (tier === 'premium') return Infinity;
  if (tier === 'free') return 10;
  return 0;
}
