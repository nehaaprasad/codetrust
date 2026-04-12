import { NextResponse } from "next/server";
import { isDatabaseConfigured, getPrisma } from "@/lib/db";

export async function GET(
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
  const row = await prisma.analysis.findUnique({
    where: { id },
    include: { issues: true, sources: true },
  });

  if (!row) {
    return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: row.id,
    score: row.score,
    decision: row.decision,
    previousScore: row.previousScore,
    previousDecision: row.previousDecision,
    summary: row.summary,
    modelVersion: row.modelVersion,
    createdAt: row.createdAt.toISOString(),
    issues: row.issues.map((i) => ({
      category: i.category,
      severity: i.severity,
      message: i.description,
      filePath: i.filePath,
      lineNumber: i.lineNumber,
    })),
    sources: row.sources.map((s) => ({
      url: s.url,
      title: s.title,
      excerpt: s.excerpt,
      trustLevel: s.trustLevel,
    })),
  });
}
