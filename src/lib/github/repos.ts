import { createGitHubClientForUser } from "./client";
import type { GitHubRepo } from "./types";

const MAX_REPOS = 100;

/**
 * Fetch repositories for the signed-in user (OAuth access token from NextAuth).
 */
export async function fetchUserRepos(accessToken: string): Promise<GitHubRepo[]> {
  const octokit = createGitHubClientForUser(accessToken);

  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: "updated",
    per_page: MAX_REPOS,
  });

  return data.map((repo) => ({
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner.login,
    description: repo.description,
    private: repo.private,
    htmlUrl: repo.html_url,
    defaultBranch: repo.default_branch,
    updatedAt: repo.updated_at,
    language: repo.language,
    stargazersCount: repo.stargazers_count,
    forksCount: repo.forks_count,
  }));
}