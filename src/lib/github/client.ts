import { Octokit } from "@octokit/rest";

/**
 * Get GitHub token from environment
 */
export function getGitHubToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN is required for GitHub integration.");
  }
  return token;
}

/**
 * Create an authenticated Octokit client
 * Uses server-side token - never exposed to client
 */
export function createGitHubClient(): Octokit {
  const token = getGitHubToken();
  return new Octokit({ auth: token });
}