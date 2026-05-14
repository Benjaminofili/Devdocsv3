export type WaitlistFeature =
  | 'private-repos'
  | 'premium-ai'
  | 'unlimited-generations'
  | 'version-history'
  | 'custom-templates'
  | 'team-features'
  | 'export-formats'
  | 'advanced-sections';

export type UserTier = 'anonymous' | 'free' | 'premium';

export type AIProvider = 'openai' | 'gemini' | 'anthropic' | 'ollama' | 'groq';

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

export interface AIResponse {
  content: string;
  provider: AIProvider;
  tokensUsed?: number;
}

export interface DetectedStack {
  language: string;
  framework?: string;
  database?: string;
  auth?: string;
  styling?: string;
  tools?: string[];
  primary?: StackType | string;
  secondary?: string | string[];
  packageManager?: string;
  hasDocker?: boolean;
  hasTesting?: boolean;
  hasCI?: boolean;
  domainHints?: string[];
  version?: string;
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
  stackSpecific: (StackType | string)[];
  template: string;
  order: number;
}

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
