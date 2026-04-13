import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";
import { logAudit } from "@/lib/auditLog";
import { assertWorkspaceMember } from "@/lib/workspaceAuth";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  pattern: z.string().min(1).max(2000),
  category: z.enum([
    "security",
    "logic",
    "performance",
    "testing",
    "accessibility",
    "maintainability",
  ]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  workspaceId: z.string().cuid(),
  enabled: z.boolean().optional(),
});

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
  const filterWs = url.searchParams.get("workspaceId")?.trim();

  const prisma = getPrisma();
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    select: { workspaceId: true },
  });
  const allowed = new Set(memberships.map((m) => m.workspaceId));

  if (!filterWs && allowed.size === 0) {
    return NextResponse.json({ items: [] });
  }

  if (filterWs) {
    if (!allowed.has(filterWs)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
  }

  const rows = await prisma.customRule.findMany({
    where: {
      workspaceId: filterWs ? filterWs : { in: [...allowed] },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured." },
      { status: 503 },
    );
  }
  const session = await auth();
  const actor =
    session?.user?.id ?? (typeof session?.user?.email === "string" ? session.user.email : null);
  if (!actor) {
    return NextResponse.json({ error: "Sign in to manage custom rules." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join(" ") },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const m = await assertWorkspaceMember(data.workspaceId);
  if (!m.ok) {
    return NextResponse.json({ error: m.message }, { status: m.status });
  }

  const prisma = getPrisma();
  const row = await prisma.customRule.create({
    data: {
      name: data.name,
      pattern: data.pattern,
      category: data.category,
      severity: data.severity,
      enabled: data.enabled ?? true,
      workspaceId: data.workspaceId,
    },
  });

  await logAudit({
    action: "custom_rule.created",
    workspaceId: data.workspaceId,
    actorUserId: actor,
    meta: { ruleId: row.id, name: row.name },
  });

  return NextResponse.json(row);
}
