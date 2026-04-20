import { NextResponse } from "next/server";
import { analyzeFiles } from "@/lib/analysis/run";
import type { CodeFile } from "@/lib/analysis/checks";
import { fetchPrFilesForAnalysis } from "@/lib/github/fetchPrFiles";
import { fetchRawPrDiff } from "@/lib/github/diff";
import { parseGithubPrUrl } from "@/lib/github/parsePrUrl";
import {
  buildPrCommentBody,
  createOrUpdatePrComment,
} from "@/lib/github/postPrComment";
import { postInlineReviewComments } from "@/lib/github/postInlineReview";
import { extractChangedLines } from "@/lib/analysis/diff-parser";
import { isDatabaseConfigured, getPrisma } from "@/lib/db";
import {
  updateAnalysisRerun,
  type StoredAnalysisInput,
} from "@/lib/persistAnalysis";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured." },
      { status: 503 },
    );
  }

  const { id } = await context.params;
  const prisma = getPrisma();
  const row = await prisma.analysis.findUnique({ where: { id } });
  if (!row) {
    return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
  }

  const raw = row.inputJson;
  if (!raw || typeof raw !== "object") {
    return NextResponse.json(
      { error: "No stored input available for rerun." },
      { status: 400 },
    );
  }

  const input = raw as StoredAnalysisInput;
  let files: CodeFile[];
  let rerunHeadSha: string | undefined;
  let rerunPrDiff: string | undefined;

  if (input.kind === "paste") {
    if (!input.files?.length) {
      return NextResponse.json({ error: "Invalid stored paste input." }, { status: 400 });
    }
    files = input.files;
  } else if (input.kind === "pr") {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "GITHUB_TOKEN is required to rerun a pull request analysis." },
        { status: 400 },
      );
    }
    try {
      const pr = await fetchPrFilesForAnalysis(input.prUrl, token);
      files = pr.files;
      rerunHeadSha = pr.headSha;
      rerunPrDiff = await fetchRawPrDiff(input.prUrl, token);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to fetch pull request.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  } else {
    return NextResponse.json({ error: "Unknown stored input kind." }, { status: 400 });
  }

  const result = await analyzeFiles(files, {
    workspaceId: row.workspaceId,
    prDiff: rerunPrDiff,
  });

  let prCommentPatch: { url: string | null; id: string | null } | undefined;
  if (input.kind === "pr") {
    const shouldPost = process.env.GITHUB_POST_PR_COMMENT !== "false";
    const token = process.env.GITHUB_TOKEN;
    const parsed = parseGithubPrUrl(input.prUrl);
    if (parsed && shouldPost && token) {
      try {
        const evidence = rerunHeadSha
          ? { owner: parsed.owner, repo: parsed.repo, headSha: rerunHeadSha }
          : undefined;
        const body = buildPrCommentBody(result, evidence);
        const ref = await createOrUpdatePrComment(
          token,
          parsed,
          body,
          row.prCommentId,
        );
        prCommentPatch = { url: ref.htmlUrl, id: ref.commentId };
      } catch (e) {
        console.error("GitHub PR comment on rerun failed:", e);
      }

      if (
        process.env.GITHUB_POST_INLINE_REVIEW_COMMENTS !== "false" &&
        rerunHeadSha &&
        rerunPrDiff?.trim()
      ) {
        try {
          const changedRegions = extractChangedLines(rerunPrDiff).files;
          await postInlineReviewComments({
            token,
            parsed,
            headSha: rerunHeadSha,
            issues: result.issues,
            changedRegions,
          });
        } catch (e) {
          console.error("[inline-review] rerun post failed:", e);
        }
      }
    }
  }

  const updated = await updateAnalysisRerun(id, result, prCommentPatch, {
    prHeadSha: rerunHeadSha ?? null,
  });
  if (!updated) {
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }

  return NextResponse.json({
    id: updated.id,
    prCommentUrl: updated.prCommentUrl,
    prCommentId: updated.prCommentId,
    modelVersion: result.modelVersion,
    score: updated.score,
    decision: updated.decision,
    previousScore: updated.previousScore,
    previousDecision: updated.previousDecision,
    summary: updated.summary,
    issues: result.issues.map((i) => ({
      category: i.category,
      severity: i.severity,
      message: i.message,
      filePath: i.filePath,
      lineNumber: i.lineNumber,
    })),
    sources: result.sources,
    dimensionScores: result.dimensionScores,
  });
}
