import { NextRequest, NextResponse } from "next/server";
import { fetchRepoPullRequests } from "@/lib/github/listPrs";

/**
 * GET /api/github/prs?owner=X&repo=Y
 * Fetch pull requests from a repository
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get("owner");
  const repo = searchParams.get("repo");

  if (!owner || !repo) {
    return NextResponse.json(
      { error: "owner and repo query parameters are required" },
      { status: 400 }
    );
  }

  try {
    const prs = await fetchRepoPullRequests(owner, repo);
    return NextResponse.json({ prs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch PRs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}