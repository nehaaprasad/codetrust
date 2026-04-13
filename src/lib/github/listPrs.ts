import { createGitHubClientForUser } from "./client";
import type { GitHubPullRequest } from "./types";

const MAX_PRS = 50;

/** Explains where we ran `pulls.list` (forks list PRs on upstream). */
export type PrListSource = {
  selectedFullName: string;
  listingFullName: string;
  forkResolvedToUpstream: boolean;
};

/**
 * Fetch pull requests from a repository.
 * If the repo is a **fork**, we list PRs on the **upstream** parent — that is where
 * open-source PRs usually live; the fork itself often has zero PRs.
 */
export async function fetchRepoPullRequests(
  owner: string,
  repo: string,
  options: {
    accessToken: string;
    state?: "open" | "closed" | "all";
    sort?: "created" | "updated" | "popularity" | "long-running";
    direction?: "asc" | "desc";
  },
): Promise<{ prs: GitHubPullRequest[]; prSource: PrListSource }> {
  const octokit = createGitHubClientForUser(options.accessToken);
  const selectedFullName = `${owner}/${repo}`;

  const { data: repoInfo } = await octokit.repos.get({ owner, repo });

  let listOwner = owner;
  let listRepo = repo;
  let forkResolvedToUpstream = false;

  if (repoInfo.fork && repoInfo.parent) {
    listOwner = repoInfo.parent.owner.login;
    listRepo = repoInfo.parent.name;
    forkResolvedToUpstream = true;
  }

  const { data: prs } = await octokit.pulls.list({
    owner: listOwner,
    repo: listRepo,
    state: options.state ?? "open",
    sort: options.sort ?? "updated",
    direction: options.direction ?? "desc",
    per_page: MAX_PRS,
  });

  const listingFullName = `${listOwner}/${listRepo}`;

  return {
    prs: prs.map((pr) => ({
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
      changedFiles: 0,
      additions: 0,
      deletions: 0,
    })),
    prSource: {
      selectedFullName,
      listingFullName,
      forkResolvedToUpstream,
    },
  };
}
