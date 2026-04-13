import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { fetchUserRepos } from "@/lib/github/repos";
import { getGitHubAccessTokenFromRequest } from "@/lib/github/getUserAccessToken";

/**
 * GET /api/github/repos
 * Repositories for the signed-in user (OAuth). Requires GitHub sign-in with `repo` scope.
 */
export async function GET(req: NextRequest) {
  try {
    const access = await getGitHubAccessTokenFromRequest(req);
    if (!access) {
      return NextResponse.json(
        {
          error:
            "Sign in with GitHub to list repositories. If you already signed in, sign out and sign in again so we can store repository access.",
        },
        { status: 401 },
      );
    }
    const repos = await fetchUserRepos(access);
    return NextResponse.json({ repos });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch repositories";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
