import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { fetchRepoPullRequests } from "@/lib/github/listPrs";
import { getGitHubAccessTokenFromRequest } from "@/lib/github/getUserAccessToken";

/**
 * GET /api/github/prs?owner=X&repo=Y
 * Pull requests for a repo (signed-in user's OAuth token).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");

  if (!owner || !repo) {
    return NextResponse.json(
      { error: "owner and repo query parameters are required" },
      { status: 400 },
    );
  }

  const access = await getGitHubAccessTokenFromRequest(request);
  if (!access) {
    return NextResponse.json(
      {
        error:
          "Sign in with GitHub to list pull requests. Sign out and back in if this persists.",
      },
      { status: 401 },
    );
  }

  try {
    const prs = await fetchRepoPullRequests(owner, repo, { accessToken: access });
    return NextResponse.json({ prs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch pull requests";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
