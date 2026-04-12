import type { Prisma } from "@/generated/prisma/client";
import type { AnalysisResult } from "@/lib/analysis/run";
import { getPrisma } from "@/lib/db";

export type StoredAnalysisInput =
  | { kind: "paste"; files: { path: string; content: string }[] }
  | { kind: "pr"; prUrl: string };

export async function saveAnalysis(
  result: AnalysisResult,
  input: StoredAnalysisInput,
  projectId: string | null,
  options?: { prCommentUrl?: string | null; prCommentId?: string | null },
) {
  const prisma = getPrisma();
  const data: Prisma.AnalysisCreateInput = {
    score: result.score,
    decision: result.decision,
    summary: result.summary,
    modelVersion: result.modelVersion,
    dimensionScores: result.dimensionScores as unknown as Prisma.InputJsonValue,
    prCommentUrl: options?.prCommentUrl ?? null,
    prCommentId: options?.prCommentId ?? null,
    inputJson: input as Prisma.InputJsonValue,
    issues: {
      create: result.issues.map((i) => ({
        category: i.category,
        severity: i.severity,
        description: i.message,
        filePath: i.filePath?.trim() ? i.filePath : null,
        lineNumber: i.lineNumber ?? null,
      })),
    },
    sources: {
      create: result.sources.map((s) => ({
        url: s.url ?? null,
        title: s.title ?? null,
        excerpt: s.excerpt ?? null,
        trustLevel: s.trustLevel ?? null,
      })),
    },
  };

  if (projectId) {
    data.project = { connect: { id: projectId } };
  }

  return prisma.analysis.create({ data });
}

export async function updateAnalysisRerun(
  analysisId: string,
  result: AnalysisResult,
  prComment?: { url: string | null; id: string | null } | null,
) {
  const prisma = getPrisma();
  const existing = await prisma.analysis.findUnique({
    where: { id: analysisId },
  });
  if (!existing) return null;

  await prisma.issue.deleteMany({ where: { analysisId } });
  await prisma.source.deleteMany({ where: { analysisId } });

  return prisma.analysis.update({
    where: { id: analysisId },
    data: {
      previousScore: existing.score,
      previousDecision: existing.decision,
      score: result.score,
      decision: result.decision,
      summary: result.summary,
      modelVersion: result.modelVersion,
      dimensionScores: result.dimensionScores as unknown as Prisma.InputJsonValue,
      ...(prComment != null
        ? {
            prCommentUrl: prComment.url,
            prCommentId: prComment.id,
          }
        : {}),
      issues: {
        create: result.issues.map((i) => ({
          category: i.category,
          severity: i.severity,
          description: i.message,
          filePath: i.filePath?.trim() ? i.filePath : null,
          lineNumber: i.lineNumber ?? null,
        })),
      },
      sources: {
        create: result.sources.map((s) => ({
          url: s.url ?? null,
          title: s.title ?? null,
          excerpt: s.excerpt ?? null,
          trustLevel: s.trustLevel ?? null,
        })),
      },
    },
  });
}
