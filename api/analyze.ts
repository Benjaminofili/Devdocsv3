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
      throw new Error("Missing FIREBASE_SERVICE_ACCOUNT environment variable");
    }
    const serviceAccount = JSON.parse(serviceAccountVar);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('[FIREBASE] Successfully initialized in analyze.ts');
  } catch (error) {
    console.error('[FIREBASE INIT ERROR IN ANALYZE]', error);
    // Don't throw here, just log, so public repos can still be analyzed without Firebase
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
    let githubToken = (request.body as any).githubToken;

    // Fallback: Fetch token from Firestore if we have a Firebase session
    if (!githubToken && auth && db) {
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        try {
          const idToken = authHeader.split(' ')[1];
          const decodedToken = await auth.verifyIdToken(idToken);
          const userDoc = await db.collection('users').doc(decodedToken.uid).get();
          const userData = userDoc.data();
          if (userData?.githubTokenEncrypted) {
            githubToken = decrypt(userData.githubTokenEncrypted);
          } else if (userData?.githubToken) {
            githubToken = userData.githubToken; // Fallback for old data
          }
          if (githubToken) {
            logger.info('Successfully retrieved fallback token from Firestore');
          }
        } catch (e) {
          console.error("Failed to fetch fallback token from Firestore:", e);
        }
      }
    }

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
    let contextFiles: { name: string, content: string }[] = [];

    const envToken = getEnv().GITHUB_TOKEN;
    const activeToken = githubToken || envToken;
    const validToken = (typeof activeToken === 'string' && activeToken.trim().length > 15 && activeToken !== 'undefined' && activeToken !== 'null')
      ? activeToken.trim()
      : null;

    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': GITHUB_CONFIG.USER_AGENT || 'DevDocs-V3',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (validToken) {
      headers['Authorization'] = `token ${validToken}`;
    }

    if (repoUrl) {
      // New V2 flow: fetch repo tree, analyze, then fetch key files
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) throw new Error('Invalid GitHub URL');
      const [, owner, repo] = match;
      const cleanRepo = repo.replace('.git', '');

      // 1️⃣ Fetch repo details to get default branch
      const repoDetailsRes = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`, { headers });
      if (!repoDetailsRes.ok) {
        throw new Error(`GitHub API rejected repo details request: ${repoDetailsRes.status} ${repoDetailsRes.statusText}`);
      }
      const repoDetails = await repoDetailsRes.json();
      const defaultBranch = repoDetails.default_branch || 'main';

      // 2️⃣ Fetch the ENTIRE recursive file tree
      const treeUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/git/trees/${defaultBranch}?recursive=1`;
      const treeRes = await fetch(treeUrl, { headers });
      if (!treeRes.ok) {
        throw new Error(`GitHub Tree API failed: ${treeRes.status} ${treeRes.statusText}`);
      }
      const treeData = await treeRes.json();

      // 3️⃣ Safety check: Ensure the tree actually exists
      if (!treeData.tree || !Array.isArray(treeData.tree)) {
        throw new Error('Repository is empty or GitHub did not return a valid file tree.');
      }

      // 4️⃣ Run the V2 Intelligence Engine!
      const analyzer = new RepoAnalyzer(treeData.tree);
      const repoProfile = analyzer.analyze();

      console.log('🧠 V2 Analysis Complete:', repoProfile);

      // 5️⃣ Fetch high‑value key file contents
      const fetched = await fetchKeyFileContents(repoUrl, repoProfile.keyFiles, headers);
      fileContents = fetched.fileContents;
      contextFiles = fetched.contextFiles;

      // Preserve repoProfile for response
      (response as any)._repoProfile = repoProfile;
    } else if (files) {
      fileContents = files;
    }

    const analyzer = new StackAnalyzer(fileContents);
    const stack = analyzer.analyze();
    stack.contextFiles = contextFiles;

    // Determine suggested sections based on stack
    const suggestedSections = getSectionsForStack(stack);
    const filteredSections = filterSectionsByFeatures(
        suggestedSections,
        (response as any)._repoProfile?.features ?? {}
    );

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
      suggestedSections: filteredSections,
      files: fileContents.map(f => f.name),
      repoData,
    };

    if (cacheKey) {
      await redis.set(cacheKey, result, { ex: 900 });
    }

    logger.info('📊 Analysis complete', { stack: stack.primary });

    return response.status(200).json({
      success: true,
      data: { ...result, repoProfile: (response as any)._repoProfile },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Analysis error:', errorMessage);
    return response.status(500).json({ error: 'Failed to analyze repository', details: errorMessage });
  }
}

export default withSentry(handler);


async function fetchRepoContents(repoUrl: string, githubToken?: string): Promise<{ fileContents: FileContent[], contextFiles: { name: string, content: string }[] }> {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error('Invalid GitHub URL');

  const [, owner, repo] = match;
  const cleanRepo = repo.replace('.git', '');

  // 1. Strict Token Validation
  const envToken = getEnv().GITHUB_TOKEN;
  const activeToken = githubToken || envToken;
  const validToken = (typeof activeToken === 'string' && activeToken.trim().length > 15 && activeToken !== 'undefined' && activeToken !== 'null') 
    ? activeToken.trim() 
    : null;

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': GITHUB_CONFIG.USER_AGENT || 'DevDocs-V3'
  };

  if (validToken) {
    headers['Authorization'] = `token ${validToken}`;
  }

  const fileContents: FileContent[] = [];
  const contextFiles: { name: string, content: string }[] = [];
  const url = `https://api.github.com/repos/${owner}/${cleanRepo}/contents`;

  // 2. The Fetch with Auto-Retry for Public Repos
  let rootResponse = await fetch(url, { headers });

  if (rootResponse.status === 401 && validToken) {
    console.warn(`[GITHUB FETCH] Token rejected (401). Retrying as unauthenticated request for public fallback...`);
    delete headers['Authorization'];
    rootResponse = await fetch(url, { headers });
  }

  if (!rootResponse.ok) {
    console.error(`[GITHUB FETCH ERROR] ${rootResponse.status} for URL: ${url}`);
    throw new Error(`Failed to fetch repository: ${rootResponse.status} ${rootResponse.statusText}`);
  }

  const rootContents: GitHubFile[] = await rootResponse.json() as GitHubFile[];

  // 3. Hydrate Context (High-value files)
  const highValueRegex = /(^|\/)(package\.json|requirements\.txt|models\.py|schema\.prisma|seed_data\.py)$/i;
  const matchedHighValue = rootContents
    .filter(f => highValueRegex.test(f.name) && f.type === 'file')
    .slice(0, 4);

  for (const file of matchedHighValue) {
    if (file.download_url) {
      try {
        const fileResponse = await fetch(file.download_url, { headers });
        if (fileResponse.ok) {
          const rawContent = await fileResponse.text();
          contextFiles.push({
            name: file.name,
            content: minifyContext(rawContent, file.name)
          });
          logger.info(`[CONTEXT] Hydrated ${file.name}`);
        }
      } catch (e) {
        logger.warn(`Failed to hydrate context for ${file.name}`);
      }
    }
  }

  // 4. Fetch Important Files for Analysis
  for (const file of rootContents) {
    if (isImportantFile(file.name) && file.type === 'file' && file.download_url) {
      try {
        const fileResponse = await fetch(file.download_url, { headers });
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

  return { fileContents, contextFiles };
}

// New helper to fetch the raw contents of key files identified by RepoAnalyzer
async function fetchKeyFileContents(
  repoUrl: string,
  keyFiles: string[],
  headers: Record<string, string>
): Promise<{ fileContents: FileContent[]; contextFiles: { name: string; content: string }[] }> {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error('Invalid GitHub URL');
  const [, owner, repo] = match;
  const cleanRepo = repo.replace('.git', '');

  // Get default branch (repeat fetch, cheap compared to many file fetches)
  const repoDetailsRes = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`, { headers });
  if (!repoDetailsRes.ok) throw new Error('Repo not found');
  const repoDetails = await repoDetailsRes.json();
  const defaultBranch = repoDetails.default_branch;

  const fileContents: FileContent[] = [];
  const contextFiles: { name: string; content: string }[] = [];

  for (const filePath of keyFiles) {
    try {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${cleanRepo}/${defaultBranch}/${filePath}`;
      const res = await fetch(rawUrl, { headers });
      if (!res.ok) continue;
      const text = await res.text();
      fileContents.push({ name: filePath, content: text });

      // If this file is considered important, also add to contextFiles (minified)
      const baseName = filePath.split('/').pop() || '';
      if (isImportantFile(baseName)) {
        contextFiles.push({ name: baseName, content: minifyContext(text, baseName) });
      }
    } catch (e) {
      // ignore individual file errors
    }
  }
  return { fileContents, contextFiles };
}
