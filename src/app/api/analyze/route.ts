import { NextResponse } from "next/server";
import type { CodeFile } from "@/lib/analysis/checks";
import { analyzeFiles } from "@/lib/analysis/run";
import { fetchPrFilesForAnalysis } from "@/lib/github/fetchPrFiles";
import { parseGithubPrUrl } from "@/lib/github/parsePrUrl";
import { isDatabaseConfigured, getPrisma } from "@/lib/db";
import { saveAnalysis, type StoredAnalysisInput } from "@/lib/persistAnalysis";
import { analyzeBodySchema } from "@/lib/validation/analyze";

const MAX_TOTAL_BYTES = 1_500_000;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = analyzeBodySchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(" ");
    return NextResponse.json({ error: msg || "Invalid request." }, { status: 400 });
  }

  const data = parsed.data;
  let files: CodeFile[];
  let stored: StoredAnalysisInput;
  let projectId: string | null = null;

  if (data.prUrl?.trim()) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return NextResponse.json(
        {
          error:
            "GITHUB_TOKEN is required on the server to analyze a GitHub pull request URL.",
        },
        { status: 400 },
      );
    }
    const url = data.prUrl.trim();
    if (!parseGithubPrUrl(url)) {
      return NextResponse.json(
        { error: "Invalid GitHub pull request URL format." },
        { status: 400 },
      );
    }
    try {
      const pr = await fetchPrFilesForAnalysis(url, token);
      files = pr.files;
      stored = { kind: "pr", prUrl: url };
      if (isDatabaseConfigured()) {
        const prisma = getPrisma();
        const project = await prisma.project.upsert({
          where: { repoUrl: pr.repoUrl },
          create: { repoUrl: pr.repoUrl, name: pr.title },
          update: { name: pr.title },
        });
        projectId = project.id;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to fetch pull request.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  } else if (data.files && data.files.length > 0) {
    files = data.files;
    stored = {
      kind: "paste",
      files: data.files.map((f) => ({ path: f.path, content: f.content })),
    };
  } else if (data.code?.trim()) {
    const content = data.code.trim();
    files = [{ path: "pasted/snippet.txt", content }];
    stored = { kind: "paste", files: [{ path: "pasted/snippet.txt", content }] };
  } else {
    return NextResponse.json({ error: "Nothing to analyze." }, { status: 400 });
  }

  const total = files.reduce((a, f) => a + f.content.length, 0);
  if (total > MAX_TOTAL_BYTES) {
    return NextResponse.json(
      { error: "Combined source exceeds size limit." },
      { status: 413 },
    );
  }

  const result = await analyzeFiles(files);

  let id: string | null = null;
  if (isDatabaseConfigured()) {
    try {
      const row = await saveAnalysis(result, stored, projectId);
      id = row.id;
    } catch (e) {
      console.error(e);
      return NextResponse.json(
        { error: "Could not persist analysis. Check DATABASE_URL and database availability." },
        { status: 503 },
      );
    }
  }

  return NextResponse.json({
    id,
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
  });
}
