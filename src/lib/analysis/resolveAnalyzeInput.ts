import type { CodeFile } from "@/lib/analysis/checks";
import { fetchPrFilesForAnalysis } from "@/lib/github/fetchPrFiles";
import { canonicalRepoUrl } from "@/lib/github/repoUrl";
import { parseGithubPrUrl, type ParsedPrUrl } from "@/lib/github/parsePrUrl";
import { fetchRawPrDiff } from "@/lib/github/diff";
import { isDatabaseConfigured, getPrisma } from "@/lib/db";
import type { StoredAnalysisInput } from "@/lib/persistAnalysis";
import type { AnalyzeBody } from "@/lib/validation/analyze";

export type PreparedAnalyzeInput = {
  files: CodeFile[];
  stored: StoredAnalysisInput;
  projectId: string | null;
  parsedPr: ParsedPrUrl | null;
  workspaceId: string | null;
  prDiff?: string;
  /**
   * PR head SHA, when the input came from a pull request. Used to build
   * stable GitHub permalinks for each finding (see
   * `src/lib/github/evidenceLinks.ts`). Not persisted yet — downstream
   * callers pass it only to the immediate comment-builder, and the rerun
   * path re-fetches the PR to obtain a fresh SHA.
   */
  prHeadSha?: string;
};

/**
 * Resolves validated request body into files and metadata (fetches PR when needed).
 */
export async function resolveAnalyzeInput(
  body: AnalyzeBody,
): Promise<PreparedAnalyzeInput> {
  if (body.prUrl?.trim()) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("GITHUB_TOKEN is required for pull request analysis.");
    }
    const url = body.prUrl.trim();
    const parsed = parseGithubPrUrl(url);
    if (!parsed) {
      throw new Error("Invalid GitHub pull request URL format.");
    }
    const pr = await fetchPrFilesForAnalysis(url, token);
    const prDiff = await fetchRawPrDiff(url, token);
    let projectId: string | null = null;
    if (isDatabaseConfigured()) {
      const prisma = getPrisma();
      const repoKey = canonicalRepoUrl(pr.repoUrl);
      // If projectId was passed, use that; otherwise upsert based on repoUrl
      if (body.projectId) {
        const existing = await prisma.project.findUnique({
          where: { id: body.projectId },
        });
        if (existing) {
          projectId = existing.id;
        }
      }
      if (!projectId) {
        const project = await prisma.project.upsert({
          where: { repoUrl: repoKey },
          create: { repoUrl: repoKey, name: pr.title },
          update: { name: pr.title },
        });
        projectId = project.id;
      }
    }
    return {
      files: pr.files,
      stored: { kind: "pr", prUrl: url },
      projectId,
      parsedPr: parsed,
      workspaceId: body.workspaceId ?? null,
      prDiff,
      prHeadSha: pr.headSha,
    };
  }

  if (body.files && body.files.length > 0) {
    let projectId: string | null = null;
    if (body.projectId && isDatabaseConfigured()) {
      const prisma = getPrisma();
      const existing = await prisma.project.findUnique({
        where: { id: body.projectId },
      });
      if (existing) {
        projectId = existing.id;
      }
    }
    return {
      files: body.files,
      stored: {
        kind: "paste",
        files: body.files.map((f) => ({ path: f.path, content: f.content })),
      },
      projectId,
      parsedPr: null,
      workspaceId: body.workspaceId ?? null,
    };
  }

  if (body.code?.trim()) {
    const content = body.code.trim();
    let projectId: string | null = null;
    if (body.projectId && isDatabaseConfigured()) {
      const prisma = getPrisma();
      const existing = await prisma.project.findUnique({
        where: { id: body.projectId },
      });
      if (existing) {
        projectId = existing.id;
      }
    }
    return {
      files: [{ path: "pasted/snippet.txt", content }],
      stored: {
        kind: "paste",
        files: [{ path: "pasted/snippet.txt", content }],
      },
      projectId,
      parsedPr: null,
      workspaceId: body.workspaceId ?? null,
    };
  }

  throw new Error("Nothing to analyze.");
}
