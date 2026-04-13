import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";
import { logAudit } from "@/lib/auditLog";
import { isValidWebhookUrl } from "@/lib/webhooks/deliverAnalysis";
import { assertWorkspaceMember } from "@/lib/workspaceAuth";
import { z } from "zod";

const createSchema = z.object({
  url: z.string().url().max(2048),
  secret: z.string().max(256).optional().nullable(),
  workspaceId: z.string().cuid(),
  enabled: z.boolean().optional(),
});

export async function GET() {
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

  const prisma = getPrisma();
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    select: { workspaceId: true },
  });
  const ids = memberships.map((m) => m.workspaceId);
  if (ids.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const hooks = await prisma.developerWebhook.findMany({
    where: { workspaceId: { in: ids } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    items: hooks.map((h) => ({
      id: h.id,
      url: h.url,
      enabled: h.enabled,
      workspaceId: h.workspaceId,
      hasSecret: Boolean(h.secret),
      createdAt: h.createdAt.toISOString(),
    })),
  });
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
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
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
  const { url, secret, workspaceId } = parsed.data;
  if (!isValidWebhookUrl(url)) {
    return NextResponse.json(
      { error: "URL must be http(s); use https in production." },
      { status: 400 },
    );
  }

  const m = await assertWorkspaceMember(workspaceId);
  if (!m.ok) {
    return NextResponse.json({ error: m.message }, { status: m.status });
  }

  const prisma = getPrisma();
  const row = await prisma.developerWebhook.create({
    data: {
      url: url.trim(),
      secret: secret?.trim() || null,
      enabled: parsed.data.enabled ?? true,
      workspaceId,
    },
  });

  await logAudit({
    action: "developer_webhook.created",
    workspaceId,
    actorUserId: actor,
    meta: { webhookId: row.id },
  });

  return NextResponse.json({
    id: row.id,
    url: row.url,
    enabled: row.enabled,
    workspaceId: row.workspaceId,
  });
}
