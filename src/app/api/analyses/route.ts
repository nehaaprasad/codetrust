import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canonicalRepoUrl } from "@/lib/github/repoUrl";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";

const MAX_LIMIT = 100;

export async function GET(req: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured." },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const limitRaw = url.searchParams.get("limit");
  const decision = url.searchParams.get("decision")?.trim();
  const repoUrlParam = url.searchParams.get("repoUrl")?.trim();
  const scope = url.searchParams.get("scope")?.trim();

  let limit = 30;
  if (limitRaw) {
    const n = Number.parseInt(limitRaw, 10);
    if (!Number.isFinite(n) || n < 1) {
      return NextResponse.json({ error: "Invalid limit." }, { status: 400 });
    }
    limit = Math.min(n, MAX_LIMIT);
  }

  const validDecisions = new Set(["SAFE", "RISKY", "BLOCK", "INCONCLUSIVE"]);
  if (decision && !validDecisions.has(decision)) {
    return NextResponse.json(
      { error: "Invalid decision filter (use SAFE, RISKY, or BLOCK)." },
      { status: 400 },
    );
  }

  const where: {
    decision?: string;
    repoUrl?: string;
    userId?: string;
  } = {};
  if (decision) where.decision = decision;
  if (repoUrlParam) {
    where.repoUrl = canonicalRepoUrl(repoUrlParam);
  }
  if (scope === "mine") {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Sign in to list your analyses." },
        { status: 401 },
      );
    }
    where.userId = session.user.id;
  }

  try {
    const prisma = getPrisma();
    const items = await prisma.analysis.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        projectId: true,
        repoUrl: true,
        prUrl: true,
        prNumber: true,
        score: true,
        decision: true,
        summary: true,
        prCommentUrl: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      items: items.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Could not load analyses." },
      { status: 500 },
    );
  }
}
