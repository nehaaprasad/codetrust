import { NextResponse } from "next/server";
import { fetchUserRepos } from "@/lib/github/repos";

/**
 * GET /api/github/repos
 * Fetch repositories for the authenticated user
 */
export async function GET() {
  try {
    const repos = await fetchUserRepos();
    return NextResponse.json({ repos });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch repositories";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}