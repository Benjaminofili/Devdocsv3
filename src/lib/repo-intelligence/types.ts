export interface RepoProfile {
  // Core stack information
  primaryStack: string; // e.g., "nextjs", "django", "go"
  secondaryStacks: string[]; // any additional detected stacks
  language: string; // primary programming language
  packageManager: string; // npm, yarn, pip, poetry, go, cargo, etc.

  // Presence flags
  hasDocker: boolean;
  hasCI: boolean;
  hasTesting: boolean;
  hasEnvFile: boolean;

  // Detected frameworks & libraries
  frameworks: string[];
  dependencies: Record<string, string>;

  // Domain hints from file names / deps
  domainHints: string[];

  // Architectural classification (monorepo, microservices, serverless, etc.)
  architecture: string;

  // Feature probes – what optional README sections should be generated
  features: {
    auth: boolean;
    payment: boolean;
    database: boolean;
    caching: boolean;
    testing: boolean;
    deployment: boolean;
    monitoring: boolean;
    api: boolean;
    analytics: boolean;
    docs: boolean;
  };

  // Mapping of features to README sections that are applicable
  eligibleSections: Record<string, boolean>;

  // Context to feed to LLM, respecting token budget (max 8000 tokens)
  context: string;
}
