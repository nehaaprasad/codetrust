import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
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
  const { id } = await context.params;
  const prisma = getPrisma();
  const row = await prisma.apiKey.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!row) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  await prisma.apiKey.update({
    where: { id },
    data: { revokedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
