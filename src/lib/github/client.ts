import { Octokit } from "@octokit/rest";

/**
 * Get GitHub token from environment (PR fetch, comments, webhooks worker).
 */
export function getGitHubToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN is required for GitHub integration.");
  }
  return token;
}

/** Server-side PAT for analysis pipeline and integrations. */
export function createGitHubClient(): Octokit {
  const token = getGitHubToken();
  return new Octokit({ auth: token });
}

/** Per-user OAuth token from NextAuth (repo / PR browser APIs only). */
export function createGitHubClientForUser(accessToken: string): Octokit {
  return new Octokit({ auth: accessToken });
}