export const RATE_LIMIT = {
  REQUESTS_PER_WINDOW: 50,
  WINDOW_SIZE: '10 m',
  PREFIX: 'devdocs:ratelimit',
} as const;

export const CACHE_CONFIG = {
  ANALYSIS_TTL_SECONDS: 900,      // 15 minutes
  GENERATION_TTL_SECONDS: 86400,  // 24 hours
  MIN_VALID_CONTENT_LENGTH: 100,
} as const;

export const API_MESSAGES = {
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please try again later.',
  SECTION_NOT_FOUND: 'Section not found',
  GENERATION_FAILED: 'Failed to generate content. Please try again later.',
  ANALYSIS_FAILED: 'Failed to analyze repository',
  INVALID_GITHUB_URL: 'Invalid GitHub URL',
  MISSING_PROJECT_NAME: 'Project name is required',
  MISSING_REPO_URL: 'Provide either repoUrl or files',
} as const;

export const GITHUB_CONFIG = {
  API_VERSION: 'application/vnd.github.v3+json',
  USER_AGENT: 'DevDocs-README-Generator',
  IMPORTANT_FILES: [
    'package.json',
    'requirements.txt',
    'pyproject.toml',
    'go.mod',
    'Cargo.toml',
    '.env.example',
    '.env.sample',
    'Dockerfile',
    'docker-compose.yml',
    'docker-compose.yaml',
    'README.md',
    'readme.md',
    'tsconfig.json',
    'next.config.js',
    'next.config.mjs',
    'next.config.ts',
  ],
  IMPORTANT_DIRECTORIES: ['src', 'app', 'pages', 'components', 'lib', 'utils', 'api', 'routes'],
} as const;
