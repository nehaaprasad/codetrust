import type { CodeFile } from "@/lib/analysis/checks";
import { fetchPrFilesForAnalysis } from "@/lib/github/fetchPrFiles";
import { parseGithubPrUrl, type ParsedPrUrl } from "@/lib/github/parsePrUrl";
import { isDatabaseConfigured, getPrisma } from "@/lib/db";
import type { StoredAnalysisInput } from "@/lib/persistAnalysis";
import type { AnalyzeBody } from "@/lib/validation/analyze";

export type PreparedAnalyzeInput = {
  files: CodeFile[];
  stored: StoredAnalysisInput;
  projectId: string | null;
  parsedPr: ParsedPrUrl | null;
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
    let projectId: string | null = null;
    if (isDatabaseConfigured()) {
      const prisma = getPrisma();
      const project = await prisma.project.upsert({
        where: { repoUrl: pr.repoUrl },
        create: { repoUrl: pr.repoUrl, name: pr.title },
        update: { name: pr.title },
      });
      projectId = project.id;
    }
    return {
      files: pr.files,
      stored: { kind: "pr", prUrl: url },
      projectId,
      parsedPr: parsed,
    };
  }

  if (body.files && body.files.length > 0) {
    return {
      files: body.files,
      stored: {
        kind: "paste",
        files: body.files.map((f) => ({ path: f.path, content: f.content })),
      },
      projectId: null,
      parsedPr: null,
    };
  }

  if (body.code?.trim()) {
    const content = body.code.trim();
    return {
      files: [{ path: "pasted/snippet.txt", content }],
      stored: {
        kind: "paste",
        files: [{ path: "pasted/snippet.txt", content }],
      },
      projectId: null,
      parsedPr: null,
    };
  }

  throw new Error("Nothing to analyze.");
}
