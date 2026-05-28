// shared/tiers.config.ts

export type TierId = 'anonymous' | 'free' | 'pro' | 'agency';

export interface TierConfig {
  id:                     TierId;
  name:                   string;
  generationsPerMonth:    number;
  maxRepoSizeMB:          number;
  allowPrivateRepos:      boolean;
  premiumSectionsEnabled: boolean;
  historyDays:            number;
  removeWatermark:        boolean;
  priceMonthlyNGN:        number; // in Kobo for Paystack
  paystackPlanCode?:      string;
}

// Null-prototype object: inherited keys (__proto__, constructor, toString, etc.)
// can never be reached via bracket notation with attacker-controlled input.
export const TIERS: Record<TierId, TierConfig> = Object.assign(
  Object.create(null) as Record<TierId, TierConfig>,
  {
    anonymous: {
      id:                     'anonymous',
      name:                   'Guest',
      generationsPerMonth:    3,
      maxRepoSizeMB:          50,
      allowPrivateRepos:      false,
      premiumSectionsEnabled: false,
      historyDays:            0,
      removeWatermark:        false,
      priceMonthlyNGN:        0,
    },
    free: {
      id:                     'free',
      name:                   'Hobbyist',
      generationsPerMonth:    10,
      maxRepoSizeMB:          100,
      allowPrivateRepos:      false,
      premiumSectionsEnabled: false,
      historyDays:            7,
      removeWatermark:        false,
      priceMonthlyNGN:        0,
    },
    pro: {
      id:                     'pro',
      name:                   'Pro Freelancer',
      generationsPerMonth:    100,
      maxRepoSizeMB:          500,
      allowPrivateRepos:      true,
      premiumSectionsEnabled: true,
      historyDays:            365,
      removeWatermark:        true,
      priceMonthlyNGN:        600000, // ₦6,000 in Kobo
      paystackPlanCode:       'PLN_y204dppkjg7r8mv',
    },
    agency: {
      id:                     'agency',
      name:                   'Agency Team',
      generationsPerMonth:    500,
      maxRepoSizeMB:          2000,
      allowPrivateRepos:      true,
      premiumSectionsEnabled: true,
      historyDays:            Infinity,
      removeWatermark:        true,
      priceMonthlyNGN:        3500000, // ₦35,000 in Kobo
      paystackPlanCode:       'PLN_d06hclkbwl3ng4q',
    },
  } as const,
);

/**
 * Safely retrieve a tier config by ID.
 *
 * Uses Object.hasOwn to guard against prototype-chain traversal before
 * the bracket-notation access, so passing "__proto__" or "constructor"
 * as `id` throws rather than returning an inherited property.
 */
export function getTierConfig(id: TierId): TierConfig {
  // Narrow to string first so the type-system stays happy even if a
  // caller bypasses TypeScript with a runtime cast.
  const safeId = typeof id === 'string' ? id : '';

  if (!Object.hasOwn(TIERS, safeId)) {
    throw new Error(`Unknown tier: "${safeId}"`);
  }

  return TIERS[safeId as TierId];
}

/** Convenience: returns true if the given string is a valid TierId. */
export function isValidTierId(value: unknown): value is TierId {
  return typeof value === 'string' && Object.hasOwn(TIERS, value);
}