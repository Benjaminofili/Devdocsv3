import type { FileContent } from '../analyze';

/**
 * Classifies the repository architecture.
 * Returns 'monorepo', 'microservices', or 'single'.
 */
export function classifyArchitecture(files: FileContent[]): 'monorepo' | 'microservices' | 'single' {
  const names = files.map(f => f.name);

  const isMonorepo =
    names.some(n => n === 'pnpm-workspace.yaml') ||
    names.some(n => n === 'lerna.json') ||
    names.some(n => n === 'nx.json') ||
    names.some(n => n === 'turbo.json') ||
    // Multiple package.json files at different depths
    names.filter(n => n === 'package.json' || n.endsWith('/package.json')).length > 1;

  const isMicroservices =
    names.some(n => n === 'docker-compose.yml' || n === 'docker-compose.yaml') &&
    names.some(n => n.includes('services/') || n.includes('microservices/'));

  if (isMonorepo) return 'monorepo';
  if (isMicroservices) return 'microservices';
  return 'single';
}
