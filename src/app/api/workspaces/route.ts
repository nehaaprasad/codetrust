import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";
import { logAudit } from "@/lib/auditLog";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(120),
});

function slugify(s: string): string {
  const t = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return t || "workspace";
}

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
    include: { workspace: true },
  });

  return NextResponse.json({
    items: memberships.map((m) => ({
      role: m.role,
      workspace: m.workspace,
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
  const userId =
    session?.user?.id ?? (typeof session?.user?.email === "string" ? session.user.email : null);
  if (!userId) {
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
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const prisma = getPrisma();
  const slug = `${slugify(parsed.data.name)}-${randomBytes(4).toString("hex")}`;

  const ws = await prisma.workspace.create({
    data: {
      name: parsed.data.name,
      slug,
      members: {
        create: {
          userId,
          role: "owner",
        },
      },
    },
  });

  await logAudit({
    action: "workspace.created",
    workspaceId: ws.id,
    actorUserId: userId,
    meta: { workspaceId: ws.id, slug: ws.slug },
  });

  return NextResponse.json(ws);
}
