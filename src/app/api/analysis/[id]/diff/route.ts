import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/db";
import { parseDiff, type ParsedDiff } from "@/lib/github/diff";
import { parseGithubPrUrl } from "@/lib/github/parsePrUrl";

/**
 * GET /api/analysis/[id]/diff
 *
 * Returns the unified diff of the pull request that produced this
 * analysis, parsed into per-file hunks for the UI diff viewer.
 *
 * The PR URL comes from `Analysis.prUrl`, which is the canonical
 * field set by `saveAnalysis` whenever the run was for a pull request.
 * A previous version read from `Analysis.sources` — that table is for
 * AI-cited reference documents, not for the PR itself, so every PR
 * analysis was incorrectly reported as having no PR attached. This
 * route no longer touches `sources`.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const prisma = getPrisma();
  const analysis = await prisma.analysis.findUnique({
    where: { id },
    select: { prUrl: true },
  });

  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }
  if (!analysis.prUrl) {
    return NextResponse.json(
      {
        error:
          "This analysis is not linked to a pull request (e.g. a paste-only run). There is no diff to show.",
      },
      { status: 400 },
    );
  }

  const parsed = parseGithubPrUrl(analysis.prUrl);
  if (!parsed) {
    return NextResponse.json(
      { error: "Stored PR URL is not a valid GitHub pull request URL." },
      { status: 400 },
    );
  }

  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(
      {
        error:
          "GITHUB_TOKEN is not configured on the server. Set it to fetch PR diffs from GitHub.",
      },
      { status: 500 },
    );
  }

  let diffResult: ParsedDiff;
  try {
    const response = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/pulls/${parsed.pull_number}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3.diff",
          "User-Agent": "ai-code-trust",
        },
        cache: "no-store",
      },
    );

    if (response.status === 404) {
      return NextResponse.json(
        {
          error:
            "Pull request not found on GitHub — it may have been deleted, moved, or GITHUB_TOKEN may lack access to the repository.",
        },
        { status: 404 },
      );
    }
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return NextResponse.json(
        {
          error: `GitHub returned ${response.status} while fetching the PR diff${
            body ? `: ${body.slice(0, 200)}` : "."
          }`,
        },
        { status: 502 },
      );
    }

    const diffText = await response.text();
    diffResult = parseDiff(diffText);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[analysis-diff] fetch failed:", message);
    return NextResponse.json(
      { error: `Failed to fetch diff from GitHub: ${message}` },
      { status: 502 },
    );
  }

  return NextResponse.json(diffResult);
}
