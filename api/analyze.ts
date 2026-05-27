// api/analyze.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { StackAnalyzer } from './_lib/analyzers/index.js';
import { getSectionsForStack } from './_lib/bricks/index.js';
import { decrypt } from './_lib/crypto.js';
import { redis, checkRateLimit } from './lib/redis.js';
import { AnalyzeRequestSchema } from './_lib/validators/schemas.js';
import { logger } from './_lib/logger.js';
import { getEnv } from './_lib/env.js';
import { GITHUB_CONFIG } from './_lib/constants.js';
import { withSentry } from './_lib/withSentry.js';
import { minifyContext } from './_lib/utils.js';
import { RepoAnalyzer } from './_lib/intelligence/repo-analyzer.js';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountVar) {
      throw new Error('Missing FIREBASE_SERVICE_ACCOUNT environment variable');
    }
    const serviceAccount = JSON.parse(serviceAccountVar);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('[FIREBASE] Successfully initialized in analyze.ts');
  } catch (error) {
    console.error('[FIREBASE INIT ERROR IN ANALYZE]', error);
    // Don't throw — public repos can still be analyzed without Firebase
  }
}

function filterSectionsByFeatures(sections: any[], repoProfile: any) {
  const features = repoProfile?.features || {};
  return sections.filter(section => {
    if (section.id === 'docker' && !features.hasDocker) return false;
    if (section.id === 'testing' && !features.hasTesting) return false;
    if (section.id === 'ci-cd' && !features.hasCICD) return false;
    if (section.id === 'environment' && !features.hasEnvExample) return false;
    return true;
  });
}

// Safely initialize services
const db = admin.apps.length ? admin.firestore() : null;
const auth = admin.apps.length ? admin.auth() : null;

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

const isImportantFile = (fileName: string): boolean =>
  (GITHUB_CONFIG.IMPORTANT_FILES as readonly string[]).includes(fileName);

// ------------------------------------------------------------------
// Main handler
// ------------------------------------------------------------------
async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting (keyed on IP — will move to uid once auth middleware lands)
  const ip = (request.headers['x-forwarded-for'] as string) || 'anonymous';
  const rateLimitResult = await checkRateLimit(ip);

  if (!rateLimitResult.allowed) {
    return response.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Please try again later.',
      resetAt: rateLimitResult.resetAt,
    });
  }

  let repoProfile: any = null;

  try {
    const parseResult = AnalyzeRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return response.status(400).json({
        error: 'Invalid request',
        details: parseResult.error.format(),
      });
    }

    const { repoUrl, files } = parseResult.data;
    let githubToken = (request.body as any).githubToken;

    // Server-side token retrieval — never trust a client-provided token value
    if (!githubToken && auth && db) {
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const idToken = authHeader.split(' ')[1];
          const decoded = await auth.verifyIdToken(idToken);
          const userDoc = await db.collection('users').doc(decoded.uid).get();
          const userData = userDoc.data();

          if (userData?.githubTokenEncrypted) {
            githubToken = decrypt(userData.githubTokenEncrypted);
          } else if (userData?.githubToken) {
            // TODO: migrate legacy plaintext tokens — encrypt on next write
            githubToken = userData.githubToken;
          }

          if (githubToken) {
            logger.info('token_retrieved', { uid: decoded.uid });
          }
        } catch (e) {
          logger.warn('token_retrieval_failed', { error: String(e) });
        }
      }
    }

    // Cache check
    let cacheKey = '';
    if (repoUrl) {
      cacheKey = `analyze:${repoUrl}`;
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.info('cache_hit', { cacheKey });
        return response.status(200).json({ success: true, data: cached });
      }
    }

    let fileContents: FileContent[] = [];
    let contextFiles: { name: string; content: string }[] = [];

    const envToken = getEnv().GITHUB_TOKEN;
    const activeToken = githubToken || envToken;
    const validToken =
      typeof activeToken === 'string' &&
        activeToken.trim().length > 15 &&
        activeToken !== 'undefined' &&
        activeToken !== 'null'
        ? activeToken.trim()
        : null;

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': GITHUB_CONFIG.USER_AGENT || 'DevDocs-V3',
      'X-GitHub-Api-Version': '2022-11-28',
    };
    if (validToken) {
      headers['Authorization'] = `token ${validToken}`;
    }

    if (repoUrl) {
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) throw new Error('Invalid GitHub URL');
      const [, owner, repo] = match;
      const cleanRepo = repo.replace('.git', '');

      // 1. Repo details (default branch)
      const repoDetailsRes = await fetch(
        `https://api.github.com/repos/${owner}/${cleanRepo}`,
        { headers },
      );
      if (!repoDetailsRes.ok) {
        throw new Error(
          `GitHub API error: ${repoDetailsRes.status} ${repoDetailsRes.statusText}`,
        );
      }
      const repoDetails = await repoDetailsRes.json();
      const defaultBranch = repoDetails.default_branch || 'main';

      // 2. Full recursive file tree
      const treeRes = await fetch(
        `https://api.github.com/repos/${owner}/${cleanRepo}/git/trees/${defaultBranch}?recursive=1`,
        { headers },
      );
      if (!treeRes.ok) {
        throw new Error(
          `GitHub Tree API error: ${treeRes.status} ${treeRes.statusText}`,
        );
      }
      const treeData = await treeRes.json();

      if (!treeData.tree || !Array.isArray(treeData.tree)) {
        throw new Error('Repository is empty or GitHub did not return a valid file tree.');
      }

      // 3. Intelligence engine — produces RepoProfile
      const analyzer = new RepoAnalyzer(treeData.tree);
      repoProfile = analyzer.analyze();
      logger.info('repo_analysis_complete', { repoUrl });

      // 4. Fetch high-value file contents
      const fetched = await fetchKeyFileContents(
        repoUrl,
        repoProfile.keyFiles,
        headers,
        defaultBranch,
      );
      fileContents = fetched.fileContents;
      contextFiles = fetched.contextFiles;

    } else if (files) {
      fileContents = files;
    }

    const stackAnalyzer = new StackAnalyzer(fileContents);
    const stack = stackAnalyzer.analyze();
    stack.contextFiles = contextFiles;

    const suggestedSections = getSectionsForStack(stack);
    const filteredSections = filterSectionsByFeatures(
      suggestedSections,
      repoProfile?.features ?? {},
    );

    const packageJsonFile = fileContents.find(f => f.name === 'package.json');
    const existingReadme = fileContents.find(f =>
      f.name.toLowerCase() === 'readme.md' || f.name.toLowerCase() === 'readme',
    );
    const envExample = fileContents.find(f =>
      f.name === '.env.example' || f.name === '.env.sample',
    );

    let packageJson: Record<string, unknown> | undefined;
    if (packageJsonFile?.content) {
      try {
        packageJson = JSON.parse(packageJsonFile.content);
      } catch {
        logger.warn('package_json_parse_failed');
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
        f.name === 'docker-compose.yaml',
      ),
      hasTests: fileContents.some(f =>
        f.name.includes('test') ||
        f.name.includes('spec') ||
        f.name.includes('__tests__') ||
        f.name.includes('.test.') ||
        f.name.includes('.spec.'),
      ),
      hasCI: fileContents.some(f =>
        f.name.includes('.github/workflows') ||
        f.name.includes('.gitlab-ci') ||
        f.name.includes('azure-pipelines'),
      ),
    };

    const result = {
      stack,
      suggestedSections: filteredSections,
      files: fileContents.map(f => f.name),
      repoData,
    };

    if (cacheKey) {
      await redis.set(cacheKey, result, { ex: 900 });
    }

    logger.info('analysis_complete', { stack: stack.primary });

    // ✅ Return the response
    return response.status(200).json({
      success: true,
      data: { ...result, repoProfile },
    });

  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('analysis_failed', { error: message });
    return response.status(500).json({
      error: 'Failed to analyze repository',
      details: message,
    });
  }
} // ← handler closed

// ------------------------------------------------------------------
// Helper: fetch key file contents from GitHub raw
// ------------------------------------------------------------------
async function fetchKeyFileContents(
  repoUrl: string,
  keyFiles: string[],
  headers: Record<string, string>,
  defaultBranch: string,
): Promise<{ fileContents: FileContent[]; contextFiles: { name: string; content: string }[] }> {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error('Invalid GitHub URL');
  const [, owner, repo] = match;
  const cleanRepo = repo.replace('.git', '');

  const fileContents: FileContent[] = [];
  const contextFiles: { name: string; content: string }[] = [];

  for (const filePath of keyFiles) {
    try {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${cleanRepo}/${defaultBranch}/${filePath}`;
      const res = await fetch(rawUrl, { headers });
      if (!res.ok) continue;

      const text = await res.text();
      const baseName = filePath.split('/').pop() || '';

      fileContents.push({ name: filePath, content: text });

      if (isImportantFile(baseName)) {
        contextFiles.push({ name: baseName, content: minifyContext(text, baseName) });
      }
    } catch {
      // Skip individual file errors — don't abort the whole analysis
    }
  }

  return { fileContents, contextFiles };
}

// ✅ Export must be the last line
export default withSentry(handler);