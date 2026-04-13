import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";

const MAX = 100;

export async function GET(req: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured." },
      { status: 503 },
    );
  }
  const session = await auth();
  const userId =
    session?.user?.id ?? (typeof session?.user?.email === "string" ? session.user.email : null);
  if (!userId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("workspaceId")?.trim();

  const prisma = getPrisma();
  if (workspaceId) {
    const m = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId },
    });
    if (!m) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
  }

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    select: { workspaceId: true },
  });
  const allowed = new Set(memberships.map((x) => x.workspaceId));

  const rows = await prisma.auditLog.findMany({
    where: workspaceId
      ? { workspaceId }
      : {
          OR: [
            { workspaceId: null },
            { workspaceId: { in: [...allowed] } },
          ],
        },
    orderBy: { createdAt: "desc" },
    take: MAX,
  });

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      action: r.action,
      workspaceId: r.workspaceId,
      actorUserId: r.actorUserId,
      meta: r.meta,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}
