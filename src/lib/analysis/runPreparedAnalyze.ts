import { analyzeFiles } from "@/lib/analysis/run";
import {
  buildPrCommentBody,
  createOrUpdatePrComment,
} from "@/lib/github/postPrComment";
import { isDatabaseConfigured } from "@/lib/db";
import { saveAnalysis } from "@/lib/persistAnalysis";
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
};

export async function runPreparedAnalyze(
  input: PreparedAnalyzeInput,
): Promise<AnalyzePipelineJson> {
  const { files, stored, projectId, parsedPr } = input;

  const result = await analyzeFiles(files);

  let prCommentUrl: string | null = null;
  let prCommentId: string | null = null;
  if (parsedPr) {
    const shouldPost = process.env.GITHUB_POST_PR_COMMENT !== "false";
    const ghToken = process.env.GITHUB_TOKEN;
    if (shouldPost && ghToken) {
      try {
        const commentBody = buildPrCommentBody(result);
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
    const row = await saveAnalysis(result, stored, projectId, {
      prCommentUrl,
      prCommentId,
    });
    id = row.id;
  }

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
  };
}
