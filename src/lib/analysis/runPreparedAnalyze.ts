import { analyzeFiles } from "@/lib/analysis/run";
import {
  buildPrCommentBody,
  createOrUpdatePrComment,
} from "@/lib/github/postPrComment";
import { isDatabaseConfigured } from "@/lib/db";
import { canonicalRepoUrl } from "@/lib/github/repoUrl";
import { repoUrlFromParsed } from "@/lib/github/parsePrUrl";
import { logAudit } from "@/lib/auditLog";
import { saveAnalysis } from "@/lib/persistAnalysis";
import type { ProgressJob } from "@/lib/queue/jobProgressApi";
import { deliverAnalysisWebhooks } from "@/lib/webhooks/deliverAnalysis";
import type { PreparedAnalyzeInput } from "./resolveAnalyzeInput";

export type AnalyzePipelineJson = {
  id: string | null;
  prCommentUrl: string | null;
  prCommentId: string | null;
  modelVersion: string;
  score: number;
  decision: string;
  summary: string;
  issues: Array<{
    category: string;
    severity: string;
    message: string;
    filePath?: string;
    lineNumber?: number | null;
  }>;
  sources: Array<{
    url?: string | null;
    title?: string | null;
    excerpt?: string | null;
    trustLevel?: string | null;
  }>;
  dimensionScores: Record<string, number>;
  prFeedback?: {
    decision: string;
    score: number;
    summary: string;
    issues: Array<{
      filePath: string;
      lineNumber: number | null;
      severity: string;
      message: string;
      whyItMatters: string;
      category: string;
    }>;
    isPrSpecific: boolean;
  };
};

export async function runPreparedAnalyze(
  input: PreparedAnalyzeInput,
  job?: ProgressJob,
  persistContext?: { userId?: string | null; apiKeyId?: string | null; projectId?: string },
): Promise<AnalyzePipelineJson> {
  const { files, stored, projectId, parsedPr, workspaceId, prDiff, prHeadSha } =
    input;

  await job?.updateProgress({ stage: "analyzing" });
  const result = await analyzeFiles(files, {
    workspaceId: workspaceId ?? null,
    prDiff: prDiff ?? undefined,
  });

  await job?.updateProgress({ stage: "scoring" });

  await job?.updateProgress({ stage: "persisting" });

  let prCommentUrl: string | null = null;
  let prCommentId: string | null = null;
  if (parsedPr) {
    const shouldPost = process.env.GITHUB_POST_PR_COMMENT !== "false";
    const ghToken = process.env.GITHUB_TOKEN;
    if (shouldPost && ghToken) {
      try {
        const evidence =
          prHeadSha?.trim()
            ? {
                owner: parsedPr.owner,
                repo: parsedPr.repo,
                headSha: prHeadSha,
              }
            : undefined;
        const commentBody = buildPrCommentBody(result, evidence);
        const ref = await createOrUpdatePrComment(
          ghToken,
          parsedPr,
          commentBody,
          undefined,
        );
        prCommentUrl = ref.htmlUrl;
        prCommentId = ref.commentId;
      } catch (e) {
        console.error("GitHub PR comment failed:", e);
      }
    }
  }

  let id: string | null = null;
  if (isDatabaseConfigured()) {
    const prMeta =
      parsedPr && stored.kind === "pr"
        ? {
            repoUrl: canonicalRepoUrl(repoUrlFromParsed(parsedPr)),
            prUrl: stored.prUrl.trim(),
            prNumber: parsedPr.pull_number,
            prHeadSha: prHeadSha ?? null,
          }
        : {
            repoUrl: null as string | null,
            prUrl: null as string | null,
            prNumber: null as number | null,
            prHeadSha: null as string | null,
          };

    const row = await saveAnalysis(result, stored, projectId, {
      prCommentUrl,
      prCommentId,
      workspaceId: workspaceId ?? null,
      userId: persistContext?.userId ?? null,
      apiKeyId: persistContext?.apiKeyId ?? null,
      ...prMeta,
    });
    id = row.id;
  }

  if (id) {
    await logAudit({
      action: "analysis.completed",
      workspaceId: workspaceId ?? null,
      meta: { analysisId: id, decision: result.decision, score: result.score },
    });
    void deliverAnalysisWebhooks({
      analysisId: id,
      workspaceId: workspaceId ?? null,
      result,
      repoMeta:
        parsedPr && stored.kind === "pr"
          ? {
              repoUrl: canonicalRepoUrl(repoUrlFromParsed(parsedPr)),
              prUrl: stored.prUrl.trim(),
              prNumber: parsedPr.pull_number,
            }
          : null,
    }).catch((e) => console.error("developer webhooks:", e));
  }

  await job?.updateProgress({ stage: "complete" });

  return {
    id,
    prCommentUrl,
    prCommentId,
    modelVersion: result.modelVersion,
    score: result.score,
    decision: result.decision,
    summary: result.summary,
    issues: result.issues.map((i) => ({
      category: i.category,
      severity: i.severity,
      message: i.message,
      filePath: i.filePath,
      lineNumber: i.lineNumber,
    })),
    sources: result.sources,
    dimensionScores: result.dimensionScores,
    ...(result.prFeedback
      ? {
          prFeedback: {
            decision: result.prFeedback.decision,
            score: result.prFeedback.score,
            summary: result.prFeedback.summary,
            issues: result.prFeedback.issues.map((i) => ({
              filePath: i.filePath,
              lineNumber: i.lineNumber,
              severity: i.severity,
              message: i.message,
              whyItMatters: i.whyItMatters,
              category: i.category,
            })),
            isPrSpecific: result.prFeedback.isPrSpecific,
          },
        }
      : {}),
  };
}
