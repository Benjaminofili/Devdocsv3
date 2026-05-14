// api/analyze.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { StackAnalyzer } from '../src/lib/analyzers/index.js';
import { getSectionsForStack } from '../src/lib/bricks/index.js';
import { redis, checkRateLimit } from './lib/redis.js';
import { AnalyzeRequestSchema } from '../src/lib/validators/schemas.js';
import { logger } from '../src/lib/logger.js';
import { getEnv } from '../src/lib/env.js';
import { GITHUB_CONFIG } from './_lib/constants.js';
import { withSentry } from './_lib/withSentry.js';

interface FileContent {
  name: string;
  content: string;
}

interface GitHubFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url: string | null;
}

const isImportantFile = (fileName: string): boolean => {
  return (GITHUB_CONFIG.IMPORTANT_FILES as readonly string[]).includes(fileName);
};

async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const ip = (request.headers['x-forwarded-for'] as string) || 'anonymous';
  const rateLimitResult = await checkRateLimit(ip);

  if (!rateLimitResult.allowed) {
    return response.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Please try again later.',
      resetAt: rateLimitResult.resetAt,
    });
  }

  try {
    const parseResult = AnalyzeRequestSchema.safeParse(request.body);

    if (!parseResult.success) {
      return response.status(400).json({ error: 'Invalid request', details: parseResult.error.format() });
    }

    const { repoUrl, files } = parseResult.data;

    let cacheKey = '';
    if (repoUrl) {
      cacheKey = `analyze:${repoUrl}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.cache('hit', cacheKey);
        return response.status(200).json({ success: true, data: cached });
      }
    }

    let fileContents: FileContent[] = [];

    if (repoUrl) {
      fileContents = await fetchRepoContents(repoUrl);
    } else if (files) {
      fileContents = files;
    }

    const analyzer = new StackAnalyzer(fileContents);
    const stack = analyzer.analyze();
    const suggestedSections = getSectionsForStack(stack);

    const packageJsonFile = fileContents.find(f => f.name === 'package.json');
    const existingReadme = fileContents.find(f =>
      f.name.toLowerCase() === 'readme.md' || f.name.toLowerCase() === 'readme'
    );
    const envExample = fileContents.find(f =>
      f.name === '.env.example' || f.name === '.env.sample'
    );

    let packageJson: Record<string, unknown> | undefined;
    if (packageJsonFile?.content) {
      try {
        packageJson = JSON.parse(packageJsonFile.content);
      } catch {
        logger.warn('Failed to parse package.json');
      }
    }

    const repoData = {
      files: fileContents.filter(f => f.content),
      structure: fileContents.map(f => f.name),
      packageJson,
      existingReadme: existingReadme?.content,
      envExample: envExample?.content,
      hasDocker: fileContents.some(f =>
        f.name === 'Dockerfile' ||
        f.name === 'docker-compose.yml' ||
        f.name === 'docker-compose.yaml'
      ),
      hasTests: fileContents.some(f =>
        f.name.includes('test') ||
        f.name.includes('spec') ||
        f.name.includes('__tests__') ||
        f.name.includes('.test.') ||
        f.name.includes('.spec.')
      ),
      hasCI: fileContents.some(f =>
        f.name.includes('.github/workflows') ||
        f.name.includes('.gitlab-ci') ||
        f.name.includes('azure-pipelines')
      ),
    };

    const result = {
      stack,
      suggestedSections,
      files: fileContents.map(f => f.name),
      repoData,
    };

    if (cacheKey) {
      await redis.set(cacheKey, result, { ex: 900 });
    }

    logger.info('📊 Analysis complete', { stack: stack.primary });

    return response.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return response.status(500).json({ error: 'Failed to analyze repository', details: errorMessage });
  }
}

export default withSentry(handler);


async function fetchRepoContents(repoUrl: string): Promise<FileContent[]> {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error('Invalid GitHub URL');

  const [, owner, repo] = match;
  const cleanRepo = repo.replace('.git', '');

  const headers = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': GITHUB_CONFIG.USER_AGENT,
    Authorization: '',
  };

  const env = getEnv();
  if (env.GITHUB_TOKEN) {
    headers.Authorization = `token ${env.GITHUB_TOKEN}`;
  } else {
    delete (headers as any).Authorization;
  }

  const fileContents: FileContent[] = [];

  const rootResponse = await fetch(
    `https://api.github.com/repos/${owner}/${cleanRepo}/contents`,
    { headers }
  );

  if (!rootResponse.ok) {
    throw new Error(`Failed to fetch repository: ${rootResponse.status} ${rootResponse.statusText}`);
  }

  const rootContents: GitHubFile[] = await rootResponse.json() as GitHubFile[];

  for (const file of rootContents) {
    if (isImportantFile(file.name) && file.type === 'file' && file.download_url) {
      try {
        const fileResponse = await fetch(file.download_url);
        if (fileResponse.ok) {
          const content = await fileResponse.text();
          fileContents.push({ name: file.name, content });
        }
      } catch (error) {
        fileContents.push({ name: file.name, content: '' });
      }
    }
  }

  const importantDirs = GITHUB_CONFIG.IMPORTANT_DIRECTORIES;

  for (const dir of importantDirs) {
    const dirEntry = rootContents.find(f => f.name === dir && f.type === 'dir');

    if (dirEntry) {
      try {
        const dirResponse = await fetch(
          `https://api.github.com/repos/${owner}/${cleanRepo}/contents/${dir}`,
          { headers }
        );

        if (dirResponse.ok) {
          const dirContents: GitHubFile[] = await dirResponse.json() as GitHubFile[];
          for (const file of dirContents) {
            fileContents.push({
              name: `${dir}/${file.name}`,
              content: ''
            });
          }
        }
      } catch (error) {
        // Ignore errors
      }
    }
  }

  try {
    const workflowResponse = await fetch(
      `https://api.github.com/repos/${owner}/${cleanRepo}/contents/.github/workflows`,
      { headers }
    );

    if (workflowResponse.ok) {
      const workflows: GitHubFile[] = await workflowResponse.json() as GitHubFile[];
      for (const file of workflows) {
        fileContents.push({
          name: `.github/workflows/${file.name}`,
          content: ''
        });
      }
    }
  } catch {
    // No workflows
  }

  for (const file of rootContents) {
    if (!fileContents.some(f => f.name === file.name)) {
      fileContents.push({ name: file.name, content: '' });
    }
  }

  return fileContents;
}
