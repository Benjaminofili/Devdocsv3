import type { RepoProfile } from './types';

/**
 * Maps detected features to eligible README sections.
 * Returns a map of section name -> whether it should be included.
 */
export function mapFeaturesToSections(
  features: RepoProfile['features']
): Record<string, boolean> {
  return {
    'Overview': true,
    'Tech Stack': true,
    'Getting Started': true,
    'Installation': true,
    'Environment Variables': features.auth || features.database || features.payment,
    'Authentication': features.auth,
    'Database Setup': features.database,
    'Caching': features.caching,
    'Payments': features.payment,
    'API Reference': features.api,
    'Testing': features.testing,
    'Deployment': features.deployment,
    'Monitoring & Logging': features.monitoring,
    'Analytics': features.analytics,
    'Documentation': features.docs,
    'Contributing': true,
    'License': true,
  };
}
