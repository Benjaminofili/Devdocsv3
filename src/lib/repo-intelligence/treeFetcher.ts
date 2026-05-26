import type { FileContent } from '../../api/analyze';

/**
 * Fetches the repository file tree (up to 2000 files) using GitHub API.
 * Returns an array of { name, content } where content may be empty for non‑important files.
 */
export async function fetchTree(repoUrl: string, githubToken?: string): Promise<FileContent[]> {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error('Invalid GitHub URL');
  const [, owner, repo] = match;
  const cleanRepo = repo.replace('.git', '');
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'DevDocs-V3',
  };
  const envToken = process.env.GITHUB_TOKEN;
  const activeToken = githubToken || envToken;
  if (activeToken && typeof activeToken === 'string' && activeToken.trim().length > 15) {
    headers.Authorization = `token ${activeToken.trim()}`;
  }

  const url = `https://api.github.com/repos/${owner}/${cleanRepo}/git/trees/${'main'}?recursive=1`;
  let response = await fetch(url, { headers });
  if (response.status === 401 && headers.Authorization) {
    delete headers.Authorization;
    response = await fetch(url, { headers });
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch repo tree: ${response.status}`);
  }
  const data = await response.json();
  const tree: { path: string; type: string; sha: string; url: string }[] = data.tree || [];
  const limited = tree.slice(0, 2000);
  const files: FileContent[] = limited.map(entry => ({ name: entry.path, content: '' }));
  return files;
}
