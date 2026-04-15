import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { fetchRepoPullRequests } from "@/lib/github/listPrs";
import { getGitHubAccessTokenFromRequest } from "@/lib/github/getUserAccessToken";

export const runtime = "nodejs";

/**
 * GET /api/github/prs?owner=X&repo=Y&state=open|all|closed
 * Lists PRs; for **forks**, resolves to **upstream** so PRs match GitHub’s main flow.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");
  const stateParam = searchParams.get("state");
  const state =
    stateParam === "closed" || stateParam === "all" || stateParam === "open"
      ? stateParam
      : "open";

  if (!owner || !repo) {
    return NextResponse.json(
      { error: "owner and repo query parameters are required" },
      { status: 400 },
    );
  }

  const oauth = await getGitHubAccessTokenFromRequest(request);
  const pat = process.env.GITHUB_TOKEN?.trim();

  if (!oauth && !pat) {
    return NextResponse.json(
      {
        error:
          "Sign in with GitHub (or set GITHUB_TOKEN) to list pull requests. Sign out and back in if this persists.",
      },
      { status: 401 },
    );
  }

  const tryToken = oauth ?? pat!;

  try {
    let { prs, prSource } = await fetchRepoPullRequests(owner, repo, {
      accessToken: tryToken,
      state,
    });

    if (prs.length === 0 && oauth && pat && oauth !== pat) {
      const second = await fetchRepoPullRequests(owner, repo, {
        accessToken: pat,
        state,
      });
      prs = second.prs;
      prSource = second.prSource;
    }

    return NextResponse.json({ prs, prSource });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch pull requests";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
