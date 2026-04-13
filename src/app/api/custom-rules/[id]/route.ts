import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";
import { logAudit } from "@/lib/auditLog";
import { assertWorkspaceMember } from "@/lib/workspaceAuth";
import { z } from "zod";

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  name: z.string().min(1).max(120).optional(),
  pattern: z.string().min(1).max(2000).optional(),
});

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
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const prisma = getPrisma();
  const existing = await prisma.customRule.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (!existing.workspaceId) {
    return NextResponse.json({ error: "Cannot edit global rules via API." }, { status: 403 });
  }

  const m = await assertWorkspaceMember(existing.workspaceId);
  if (!m.ok) {
    return NextResponse.json({ error: m.message }, { status: m.status });
  }

  const row = await prisma.customRule.update({
    where: { id },
    data: parsed.data,
  });

  await logAudit({
    action: "custom_rule.updated",
    workspaceId: existing.workspaceId,
    actorUserId: actor,
    meta: { ruleId: id, changes: parsed.data },
  });

  return NextResponse.json(row);
}
