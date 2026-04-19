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

  const project = await prisma.project.findUnique({
    where: { id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const analyses = await prisma.analysis.findMany({
    where: { projectId: id },
    select: {
      id: true,
      score: true,
      decision: true,
      summary: true,
      prNumber: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(analyses);
}