// src/types/index.ts

export type StackType =
  | 'nextjs'
  | 'react'
  | 'vue'
  | 'angular'
  | 'express'
  | 'nestjs'
  | 'django'
  | 'flask'
  | 'fastapi'
  | 'go'
  | 'rust'
  | 'unknown';

export type AIProvider = 'openai' | 'gemini' | 'anthropic' | 'ollama' | 'groq';

export interface DetectedStack {
  primary: StackType;
  secondary: StackType[];
  language: string;
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'poetry' | 'go' | 'cargo';
  hasDocker: boolean;
  hasCI: boolean;
  hasTesting: boolean;
  hasEnvFile: boolean;
  frameworks: string[];
  dependencies: Record<string, string>;
  domainHints: string[];
}

export interface RepoAnalysis {
  name: string;
  description: string | null;
  stack: DetectedStack;
  suggestedSections: SectionConfig[];
  files: string[];
}

export interface SectionConfig {
  id: string;
  name: string;
  description: string;
  whyImportant: string;
  howToWrite: string;
  videoUrl?: string;
  docsUrl?: string;
  isRecommended: boolean;
  isRequired: boolean;
  stackSpecific: StackType[];
  template: string;
  order: number;
}

export interface GeneratedSection {
  id: string;
  content: string;
  explanation: string;
}

export interface ReadmeConfig {
  repoUrl?: string;
  projectName: string;
  stack: DetectedStack;
  selectedSections: string[];
  customizations: Record<string, string>;
}

export interface AIResponse {
  content: string;
  provider: AIProvider;
  tokensUsed?: number;
}

// ============================================
// AUTH & USER TYPES
// ============================================

export type UserTier = 'anonymous' | 'free' | 'premium'

export interface UserProfile {
  id: string
  github_username: string | null
  avatar_url: string | null
  display_name: string | null
  tier: UserTier
  created_at: string
  updated_at: string
}

// ============================================
// USAGE TYPES
// ============================================

export interface UsageInfo {
  used: number
  limit: number
  remaining: number
  tier: UserTier
  resetAt: string | null // ISO string for next reset
}

export interface UsageCheckResult {
  allowed: boolean
  usage: UsageInfo
  message?: string
}

// ============================================
// WAITLIST TYPES
// ============================================

export type WaitlistFeature =
  | 'private-repos'
  | 'premium-ai'
  | 'unlimited-generations'
  | 'version-history'
  | 'custom-templates'
  | 'team-features'
  | 'export-formats'
  | 'advanced-sections'

export type ValueLevel = 'nice-to-have' | 'time-saver' | 'need-for-work'

export interface WaitlistEntry {
  email: string
  feature: WaitlistFeature
  useCase?: string
  valueLevel?: ValueLevel
}

export interface WaitlistResponse {
  success: boolean
  message: string
  waitingCount?: number
}

// ============================================
// SAVED README TYPES
// ============================================

export interface SavedReadme {
  id: string
  user_id: string
  title: string
  repo_url: string | null
  stack: string | null
  sections: string[]
  content: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ============================================
// FEEDBACK TYPES
// ============================================

export type FeedbackType = 'bug' | 'feature' | 'general' | 'ux'

export interface FeedbackEntry {
  type: FeedbackType
  message: string
  email?: string
  page?: string
}

// ============================================
// TIER FEATURE TYPES
// ============================================

export interface TierConfig {
  maxGenerationsPerDay: number
  maxSavedReadmes: number
  availableSections: string[]
  teachingDepth: 'basic' | 'standard' | 'full'
  canSaveReadmes: boolean
  canAccessPrivateRepos: boolean
  aiModels: string[]
  exportFormats: string[]
}

// ============================================
// ADMIN TYPES
// ============================================

export interface AdminStats {
  total_users: number
  users_this_week: number
  total_generations: number
  generations_today: number
  popular_stacks: Array<{ stack: string; count: number }> | null
  waitlist_by_feature: Array<{ feature: string; count: number }> | null
  recent_waitlist: Array<{
    email: string
    feature: string
    use_case: string | null
    value_level: string | null
    created_at: string
  }> | null
  recent_feedback: Array<{
    type: string
    message: string
    email: string | null
    created_at: string
  }> | null
}
