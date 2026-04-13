import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createApiKey } from "@/lib/apiKeys";
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
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const prisma = getPrisma();
  const items = await prisma.apiKey.findMany({
    where: { userId: session.user.id },
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
  });
  return NextResponse.json({
    items: items.map((row) => ({
      id: row.id,
      name: row.name,
      prefix: row.prefix,
      lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
      revokedAt: row.revokedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      analysisCount: row._count.analyses,
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
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const name =
    typeof body === "object" &&
    body !== null &&
    "name" in body &&
    typeof (body as { name: unknown }).name === "string"
      ? (body as { name: string }).name
      : "API key";

  const created = await createApiKey(session.user.id, name);

  return NextResponse.json({
    id: created.id,
    key: created.secret,
    prefix: created.prefix,
    createdAt: created.createdAt.toISOString(),
    warning: "Copy this key now; it will not be shown again.",
  });
}
