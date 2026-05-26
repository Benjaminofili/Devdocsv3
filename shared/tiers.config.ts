/**
 * THE SINGLE SOURCE OF TRUTH FOR TIER CONFIGURATION
 * Imported by BOTH frontend and backend. No duplication ever again.
 */

export const TIERS = {
  free: {
    id: 'free' as const,
    name: 'Free',
    generationsPerMonth: 5,
    maxRepoSizeMB: 50,
    sectionSelectEnabled: false,
    historyDays: 7,
    price: 0,
  },
  pro: {
    id: 'pro' as const,
    name: 'Pro',
    generationsPerMonth: 50,
    maxRepoSizeMB: 500,
    sectionSelectEnabled: true,
    historyDays: 90,
    price: 6000,        // in kobo (₦60)
    paystackPlanCode: 'PLN_xxxxx',
  },
  lifetime: {
    id: 'lifetime' as const,
    name: 'Lifetime',
    generationsPerMonth: Infinity,
    maxRepoSizeMB: 1000,
    sectionSelectEnabled: true,
    historyDays: Infinity,
    price: 600000,      // in kobo (₦6000 one-time)
  },
} as const;

export type TierId = keyof typeof TIERS;

export interface TierConfig {
  id: string;
  name: string;
  generationsPerMonth: number;
  maxRepoSizeMB: number;
  sectionSelectEnabled: boolean;
  historyDays: number;
  price: number;
  paystackPlanCode?: string;
}

/**
 * Get tier config by ID
 */
export function getTierConfig(tierId: TierId): TierConfig {
  return TIERS[tierId] as unknown as TierConfig;
}

/**
 * Check if a tier has unlimited generations
 */
export function hasUnlimitedGenerations(tierId: TierId): boolean {
  return TIERS[tierId].generationsPerMonth === Infinity;
}

/**
 * Get the price for a tier in kobo
 */
export function getTierPrice(tierId: TierId): number {
  return TIERS[tierId].price;
}
