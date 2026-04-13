import { auth } from "@/auth";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";

export async function assertWorkspaceMember(
  workspaceId: string,
  /** When set (e.g. API key or already-resolved session id), skips reading session. */
  resolvedUserId?: string | null,
): Promise<
  | { ok: true; userId: string }
  | { ok: false; status: number; message: string }
> {
  if (!isDatabaseConfigured()) {
    return { ok: false, status: 503, message: "Database not configured." };
  }
  const session = await auth();
  const userId =
    resolvedUserId?.trim() ||
    session?.user?.id ||
    (typeof session?.user?.email === "string" ? session.user.email : null);
  if (!userId || typeof userId !== "string") {
    return { ok: false, status: 401, message: "Sign in required for workspace actions." };
  }
  const m = await getPrisma().workspaceMember.findFirst({
    where: { workspaceId, userId },
  });
  if (!m) {
    return { ok: false, status: 403, message: "Not a member of this workspace." };
  }
  return { ok: true, userId };
}
