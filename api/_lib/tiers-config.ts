import type { UserTier, TierConfig } from './types.js';

export const BASIC_SECTIONS = [
  'header',
  'installation',
  'environment',
  'license',
  'docker',
  'scripts',
] as const;

export const FREE_SECTIONS = [
  ...BASIC_SECTIONS,
  'tech-stack',
  'features',
  'api-docs',
  'deployment',
  'contributing',
  'testing',
] as const;

export const PREMIUM_SECTIONS = [
  ...FREE_SECTIONS,
] as const;

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
};

export function getGenerationLimit(tier: UserTier): number {
  return TIER_CONFIGS[tier]?.maxGenerationsPerDay ?? 5;
}
