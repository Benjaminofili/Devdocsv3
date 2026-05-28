// shared/tiers.config.ts
export type TierId = 'anonymous' | 'free' | 'pro' | 'agency';

export interface TierConfig {
  id: TierId;
  name: string;
  generationsPerMonth: number;
  maxRepoSizeMB: number;
  allowPrivateRepos: boolean;
  premiumSectionsEnabled: boolean;
  historyDays: number;
  removeWatermark: boolean;
  priceMonthlyNGN: number; // In Kobo for Paystack
  paystackPlanCode?: string;
}

export const TIERS: Record<TierId, TierConfig> = {
  anonymous: {
    id: 'anonymous',
    name: 'Guest',
    generationsPerMonth: 3,
    maxRepoSizeMB: 50,
    allowPrivateRepos: false,
    premiumSectionsEnabled: false,
    historyDays: 0,
    removeWatermark: false,
    priceMonthlyNGN: 0,
  },
  free: {
    id: 'free',
    name: 'Hobbyist',
    generationsPerMonth: 10,
    maxRepoSizeMB: 100,
    allowPrivateRepos: false,
    premiumSectionsEnabled: false,
    historyDays: 7,
    removeWatermark: false,
    priceMonthlyNGN: 0,
  },
  pro: {
    id: 'pro',
    name: 'Pro Freelancer',
    generationsPerMonth: 100,
    maxRepoSizeMB: 500,
    allowPrivateRepos: true,
    premiumSectionsEnabled: true,
    historyDays: 365,
    removeWatermark: true,
    priceMonthlyNGN: 600000, // ₦6,000 in Kobo
    paystackPlanCode: 'PLN_y204dppkjg7r8mv',
  },
  agency: {
    id: 'agency',
    name: 'Agency Team',
    generationsPerMonth: 500,
    maxRepoSizeMB: 2000,
    allowPrivateRepos: true,
    premiumSectionsEnabled: true,
    historyDays: Infinity,
    removeWatermark: true,
    priceMonthlyNGN: 3500000, // ₦35,000 in Kobo
    paystackPlanCode: 'PLN_d06hclkbwl3ng4q', // Updated agency plan code
  },
} as const;

// Helper to retrieve tier config
export function getTierConfig(id: TierId): TierConfig {
  return TIERS[id];
}
  anonymous: {
    id: 'anonymous',
    name: 'Guest',
    generationsPerMonth: 3,
    maxRepoSizeMB: 50,
    allowPrivateRepos: false,
    premiumSectionsEnabled: false,
    historyDays: 0,
    removeWatermark: false,
    priceMonthlyNGN: 0,
  },
  free: {
    id: 'free',
    name: 'Hobbyist',
    generationsPerMonth: 10,
    maxRepoSizeMB: 100,
    allowPrivateRepos: false,
    premiumSectionsEnabled: false,
    historyDays: 7,
    removeWatermark: false,
    priceMonthlyNGN: 0,
  },
  pro: {
    id: 'pro',
    name: 'Pro Freelancer',
    generationsPerMonth: 100,
    maxRepoSizeMB: 500,
    allowPrivateRepos: true,
    premiumSectionsEnabled: true,
    historyDays: 365,
    removeWatermark: true,
    priceMonthlyNGN: 1000000, // ₦10,000 in Kobo
    paystackPlanCode: 'PLN_PRO_MONTHLY_PLACEHOLDER', // Replace with real code
  },
  agency: {
    id: 'agency',
    name: 'Agency Team',
    generationsPerMonth: 500,
    maxRepoSizeMB: 2000,
    allowPrivateRepos: true,
    premiumSectionsEnabled: true,
    historyDays: Infinity,
    removeWatermark: true,
    priceMonthlyNGN: 3500000, // ₦35,000 in Kobo
    paystackPlanCode: 'PLN_AGENCY_MONTHLY_PLACEHOLDER', // Replace with real code
  },
} as const;
