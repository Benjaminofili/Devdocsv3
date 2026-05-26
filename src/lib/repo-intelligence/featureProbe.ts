import type { FileContent } from '../analyze';
import type { RepoProfile } from './types';

/**
 * Probes the file list for the presence of common features.
 * Returns the features sub-object of RepoProfile.
 */
export function probeFeatures(files: FileContent[]): RepoProfile['features'] {
  const names = files.map(f => f.name.toLowerCase());

  const has = (...patterns: string[]) =>
    patterns.some(p => names.some(n => n.includes(p)));

  return {
    auth: has('auth', 'authentication', 'login', 'oauth', 'firebase', 'next-auth'),
    payment: has('payment', 'billing', 'stripe', 'paystack', 'paypal', 'checkout'),
    database: has(
      'prisma', 'mongoose', 'sequelize', 'typeorm', 'drizzle',
      'postgres', 'mongodb', 'mysql', 'sqlite', 'supabase'
    ),
    caching: has('redis', 'cache', 'memcache'),
    testing: has('__tests__', '.test.', '.spec.', 'jest', 'vitest', 'pytest', 'cypress'),
    deployment: has('vercel', 'netlify', 'heroku', 'dockerfile', 'docker-compose', 'fly.toml', 'railway'),
    monitoring: has('sentry', 'datadog', 'logtail', 'pino', 'winston', 'monitoring'),
    api: has('api/', 'routes/', 'handlers/', 'controllers/'),
    analytics: has('analytics', 'mixpanel', 'posthog', 'segment', 'amplitude'),
    docs: has('docs/', 'documentation/', '.mdx', 'storybook'),
  };
}
