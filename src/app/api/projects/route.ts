import { NextResponse } from "next/server";
import { isDatabaseConfigured, getPrisma } from "@/lib/db";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured." },
      { status: 503 },
    );
  }

  const prisma = getPrisma();

  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    projects.map((p) => ({
      id: p.id,
      name: p.name,
      repoUrl: p.repoUrl,
      analysisCount: 0,
      createdAt: p.createdAt.toISOString(),
    })),
  );
}

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured." },
      { status: 503 },
    );
  }

  let body: { name?: unknown; repoUrl?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : null;
  const repoUrl = typeof body.repoUrl === "string" ? body.repoUrl.trim() : null;

  if (!name || !repoUrl) {
    return NextResponse.json(
      { error: "name and repoUrl are required." },
      { status: 400 },
    );
  }

  const prisma = getPrisma();

  // Check if project with this repoUrl already exists
  const existing = await prisma.project.findUnique({
    where: { repoUrl },
  });

  if (existing) {
    return NextResponse.json({
      id: existing.id,
      name: existing.name,
      repoUrl: existing.repoUrl,
      analysisCount: 0,
      createdAt: existing.createdAt.toISOString(),
    });
  }

  const project = await prisma.project.create({
    data: { name, repoUrl },
  });

  return NextResponse.json({
    id: project.id,
    name: project.name,
    repoUrl: project.repoUrl,
    analysisCount: 0,
    createdAt: project.createdAt.toISOString(),
  });
}