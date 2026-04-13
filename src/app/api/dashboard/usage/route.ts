import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured." },
      { status: 503 },
    );
  }
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const userId = session.user.id;
  const prisma = getPrisma();
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalAnalyses, last7Days, decisionGroups, apiKeys] = await Promise.all([
    prisma.analysis.count({ where: { userId } }),
    prisma.analysis.count({
      where: { userId, createdAt: { gte: since7d } },
    }),
    prisma.analysis.groupBy({
      by: ["decision"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
        _count: { select: { analyses: true } },
      },
    }),
  ]);

  const byDecision = { SAFE: 0, RISKY: 0, BLOCK: 0 };
  for (const row of decisionGroups) {
    const k = row.decision as keyof typeof byDecision;
    if (k in byDecision) {
      byDecision[k] = row._count._all;
    }
  }

  return NextResponse.json({
    totalAnalyses,
    last7Days,
    byDecision,
    apiKeys: apiKeys.map((k) => ({
      id: k.id,
      name: k.name,
      prefix: k.prefix,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      revokedAt: k.revokedAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
      analysisCount: k._count.analyses,
    })),
  });
}
