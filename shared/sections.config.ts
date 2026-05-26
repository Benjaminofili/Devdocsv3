/**
 * SECTION CONFIGURATION - SINGLE SOURCE OF TRUTH
 * Defines all available README sections with metadata
 */

export const SECTIONS = {
  // ALWAYS INCLUDED (core sections)
  project_overview: {
    id: 'project_overview' as const,
    name: 'Project Overview',
    description: 'A clear explanation of what the project does and why it exists',
    isRequired: true,
    order: 1,
  },
  tech_stack: {
    id: 'tech_stack' as const,
    name: 'Tech Stack',
    description: 'The technologies, frameworks, and tools used in the project',
    isRequired: true,
    order: 2,
  },
  getting_started: {
    id: 'getting_started' as const,
    name: 'Getting Started',
    description: 'Quick start guide for new users',
    isRequired: true,
    order: 3,
  },
  installation: {
    id: 'installation' as const,
    name: 'Installation',
    description: 'Step-by-step installation instructions',
    isRequired: true,
    order: 4,
  },
  
  // CONDITIONAL SECTIONS (only if feature probe returns true)
  testing: {
    id: 'testing' as const,
    name: 'Testing',
    description: 'How to run tests and the testing framework used',
    isRequired: false,
    requiresFeature: 'hasTests' as const,
    order: 5,
  },
  docker: {
    id: 'docker' as const,
    name: 'Docker',
    description: 'Docker setup and containerization instructions',
    isRequired: false,
    requiresFeature: 'hasDocker' as const,
    order: 6,
  },
  ci_cd: {
    id: 'ci_cd' as const,
    name: 'CI/CD',
    description: 'Continuous integration and deployment configuration',
    isRequired: false,
    requiresFeature: 'hasCI' as const,
    order: 7,
  },
  environment: {
    id: 'environment' as const,
    name: 'Environment Setup',
    description: 'Environment variables and configuration',
    isRequired: false,
    requiresFeature: 'hasEnvExample' as const,
    order: 8,
  },
  database: {
    id: 'database' as const,
    name: 'Database',
    description: 'Database setup, migrations, and ORM configuration',
    isRequired: false,
    requiresFeature: 'hasDatabase' as const,
    order: 9,
  },
  api_reference: {
    id: 'api_reference' as const,
    name: 'API Reference',
    description: 'API endpoints and usage documentation',
    isRequired: false,
    requiresFeature: 'hasAPIRoutes' as const,
    order: 10,
  },
  deployment: {
    id: 'deployment' as const,
    name: 'Deployment',
    description: 'Deployment instructions and platform configuration',
    isRequired: false,
    requiresFeature: 'hasDeployConfig' as const,
    order: 11,
  },
  contributing: {
    id: 'contributing' as const,
    name: 'Contributing',
    description: 'Guidelines for contributing to the project',
    isRequired: false,
    requiresFeature: 'hasContribGuide' as const,
    order: 12,
  },
  monorepo_guide: {
    id: 'monorepo_guide' as const,
    name: 'Monorepo Guide',
    description: 'Instructions for working in a monorepo structure',
    isRequired: false,
    requiresFeature: 'isMonorepo' as const,
    order: 13,
  },
  mobile_setup: {
    id: 'mobile_setup' as const,
    name: 'Mobile Setup',
    description: 'Mobile app setup for iOS and Android',
    isRequired: false,
    requiresFeature: 'hasMobileApp' as const,
    order: 14,
  },
} as const;

export type SectionId = keyof typeof SECTIONS;

export type RequiredSectionId = 'project_overview' | 'tech_stack' | 'getting_started' | 'installation';

export type ConditionalSectionId = Exclude<SectionId, RequiredSectionId>;

/**
 * Feature flags that control section eligibility
 */
export type FeatureFlag = 
  | 'hasTests'
  | 'hasDocker'
  | 'hasCI'
  | 'hasEnvExample'
  | 'hasDatabase'
  | 'hasAPIRoutes'
  | 'hasDeployConfig'
  | 'hasContribGuide'
  | 'isMonorepo'
  | 'hasMobileApp';

/**
 * Get all required section IDs (always included)
 */
export function getRequiredSections(): SectionId[] {
  return Object.entries(SECTIONS)
    .filter(([, config]) => config.isRequired)
    .map(([id]) => id as SectionId);
}

/**
 * Get section config by ID
 */
export function getSectionConfig(sectionId: SectionId) {
  return SECTIONS[sectionId];
}

/**
 * Get the feature requirement for a conditional section
 */
export function getSectionFeatureRequirement(sectionId: ConditionalSectionId): FeatureFlag | undefined {
  const config = SECTIONS[sectionId] as typeof SECTIONS[ConditionalSectionId];
  return config?.requiresFeature;
}
