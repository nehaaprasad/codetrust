import type { Prisma } from "@/generated/prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";

export async function logAudit(entry: {
  action: string;
  workspaceId?: string | null;
  actorUserId?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    await getPrisma().auditLog.create({
      data: {
        action: entry.action,
        workspaceId: entry.workspaceId ?? null,
        actorUserId: entry.actorUserId ?? null,
        meta: (entry.meta ?? undefined) as Prisma.InputJsonValue,
      },
    });
  } catch (e) {
    console.error("audit log failed:", e);
  }
}
