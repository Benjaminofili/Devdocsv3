// src/lib/tiers/config.ts
// Central tier configuration - single source of truth

import type { UserTier, TierConfig } from '../../types'
import { db } from '../firebase/config'
import { doc, getDoc } from 'firebase/firestore'

// ============================================
// SECTION DEFINITIONS
// ============================================

export const BASIC_SECTIONS = [
  'header',
  'installation',
  'environment',
  'license',
  'docker',
  'scripts',
] as const

export const FREE_SECTIONS = [
  ...BASIC_SECTIONS,
  'tech-stack',
  'features',
  'api-docs',
  'deployment',
  'contributing',
  'testing',
] as const

export const PREMIUM_SECTIONS = [
  ...FREE_SECTIONS,
] as const

// ============================================
// TIER CONFIGURATIONS
// ============================================

export const TIER_CONFIGS: Record<UserTier, TierConfig> = {
  anonymous: {
    maxGenerationsPerDay: 5,
    maxSavedReadmes: 0,
    availableSections: [...BASIC_SECTIONS],
    teachingDepth: 'basic',
    canSaveReadmes: false,
    canAccessPrivateRepos: false,
    aiModels: ['gemini', 'groq'],
    exportFormats: ['markdown'],
  },

  free: {
    maxGenerationsPerDay: 50,
    maxSavedReadmes: 10,
    availableSections: [...FREE_SECTIONS],
    teachingDepth: 'standard',
    canSaveReadmes: true,
    canAccessPrivateRepos: false,
    aiModels: ['gemini', 'groq'],
    exportFormats: ['markdown'],
  },

  premium: {
    maxGenerationsPerDay: Infinity,
    maxSavedReadmes: Infinity,
    availableSections: [...PREMIUM_SECTIONS],
    teachingDepth: 'full',
    canSaveReadmes: true,
    canAccessPrivateRepos: true,
    aiModels: ['gemini', 'groq', 'openai', 'anthropic'],
    exportFormats: ['markdown', 'pdf', 'html'],
  },
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getTierConfig(tier: UserTier): TierConfig {
  return TIER_CONFIGS[tier]
}

export function getSectionLimit(tier: UserTier): string[] {
  return TIER_CONFIGS[tier].availableSections
}

export function getGenerationLimit(tier: UserTier): number {
  return TIER_CONFIGS[tier].maxGenerationsPerDay
}

export function getSaveLimit(tier: UserTier): number {
  return TIER_CONFIGS[tier].maxSavedReadmes
}

// ============================================
// GET USER TIER FROM DATABASE (Firestore Version)
// ============================================

export async function getUserTier(userId: string): Promise<UserTier> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId))
    if (userDoc.exists()) {
      return (userDoc.data().tier as UserTier) ?? 'free'
    }
  } catch (error) {
    console.error("Error fetching user tier:", error)
  }
  return 'free'
}
