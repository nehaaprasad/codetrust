import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { parseDiff, type ParsedDiff } from "@/lib/github/diff";
import { parseGithubPrUrl } from "@/lib/github/parsePrUrl";

/**
 * GET /api/analysis/[id]/diff
 * Get diff data for a stored analysis (PR-based only)
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const prisma = getPrisma();

  // Fetch analysis from DB
  const analysis = await prisma.analysis.findUnique({
    where: { id },
    include: { sources: true },
  });

  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  // Find the PR URL from sources
  const prSource = analysis.sources.find((s: { url: string | null }) => s.url?.includes("/pull/"));
  if (!prSource?.url) {
    return NextResponse.json(
      { error: "No pull request associated with this analysis" },
      { status: 400 }
    );
  }

  // Parse PR URL
  const parsed = parseGithubPrUrl(prSource.url);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid PR URL" }, { status: 400 });
  }

  let diffResult: ParsedDiff;

  try {
    // Get token from server-side env
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "GITHUB_TOKEN not configured" },
        { status: 500 }
      );
    }

    // Fetch diff using raw GitHub API with accept header
    const response = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/pulls/${parsed.pull_number}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3.diff",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const diffText = await response.text();
    diffResult = parseDiff(diffText);
  } catch (err) {
    console.error("Failed to fetch diff:", err);
    return NextResponse.json({ error: "Failed to fetch diff from GitHub" }, { status: 500 });
  }

  return NextResponse.json(diffResult);
}