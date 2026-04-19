import { NextResponse } from "next/server";
import { isDatabaseConfigured, getPrisma } from "@/lib/db";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured." },
      { status: 503 },
    );
  }

  const { id } = await context.params;

  let body: { outcome?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const outcome = typeof body.outcome === "string" ? body.outcome : null;
  if (outcome !== "incident" && outcome !== "clean") {
    return NextResponse.json(
      { error: "outcome must be 'incident' or 'clean'." },
      { status: 400 },
    );
  }

  const prisma = getPrisma();

  const analysis = await prisma.analysis.findUnique({
    where: { id },
  });

  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
  }

  const updated = await prisma.analysis.update({
    where: { id },
    data: { outcome },
  });

  return NextResponse.json({
    id: updated.id,
    outcome: updated.outcome,
  });
}