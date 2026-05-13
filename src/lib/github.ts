/**
 * Frontend utility for GitHub API interactions via the V3 Proxy.
 */

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
}

/**
 * Fetches the authenticated user's GitHub repositories via the backend proxy.
 * @param githubToken - The user's GitHub OAuth token.
 * @returns Promise<GitHubRepo[]>
 */
export async function fetchUserRepos(githubToken: string): Promise<GitHubRepo[]> {
  if (!githubToken) {
    throw new Error('GitHub token is required to fetch repositories.');
  }

  const response = await fetch('/api/github/repos', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${githubToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch repositories: ${response.statusText}`);
  }

  return response.json();
}
