import { createGitHubClient, createGitHubClientForUser } from "./client";
import type { GitHubPullRequest } from "./types";

const MAX_PRS = 30;

/**
 * Fetch pull requests from a repository.
 * Uses the user's OAuth token when `accessToken` is set; otherwise the server PAT.
 */
export async function fetchRepoPullRequests(
  owner: string,
  repo: string,
  options?: {
    accessToken?: string;
    state?: "open" | "closed" | "all";
    sort?: "created" | "updated" | "popularity" | "long-running";
    direction?: "asc" | "desc";
  }
): Promise<GitHubPullRequest[]> {
  const octokit = options?.accessToken
    ? createGitHubClientForUser(options.accessToken)
    : createGitHubClient();

  const { data: prs } = await octokit.pulls.list({
    owner,
    repo,
    state: options?.state ?? "all",
    sort: options?.sort ?? "updated",
    direction: options?.direction ?? "desc",
    per_page: MAX_PRS,
  });

  const result: GitHubPullRequest[] = [];

  for (const pr of prs) {
    // Get file stats for each PR (additions, deletions, changed files)
    let stats = { additions: 0, deletions: 0, changedFiles: 0 };

    try {
      const { data: files } = await octokit.pulls.listFiles({
        owner,
        repo,
        pull_number: pr.number,
        per_page: 1,
      });
      // Use the listsReturnsCount header for changed files count
      stats = {
        additions: files.reduce((sum, f) => sum + f.additions, 0),
        deletions: files.reduce((sum, f) => sum + f.deletions, 0),
        changedFiles: files.length,
      };
    } catch {
      // Ignore errors getting stats
    }

    result.push({
      id: pr.id,
      number: pr.number,
      title: pr.title ?? "",
      state: pr.state === "open" ? "open" : "closed",
      htmlUrl: pr.html_url,
      user: {
        login: pr.user?.login ?? "",
        avatarUrl: pr.user?.avatar_url ?? "",
      },
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      mergedAt: pr.merged_at ?? null,
      head: {
        ref: pr.head.ref,
        sha: pr.head.sha,
      },
      base: {
        ref: pr.base.ref,
        sha: pr.base.sha,
      },
      changedFiles: stats.changedFiles,
      additions: stats.additions,
      deletions: stats.deletions,
    });
  }

  return result;
}