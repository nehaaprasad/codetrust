import { createHash, randomBytes } from "node:crypto";
import { getPrisma } from "@/lib/db";

export function hashApiKeySecret(plain: string): string {
  return createHash("sha256").update(plain, "utf8").digest("hex");
}

function generateSecret(): string {
  return `act_${randomBytes(24).toString("base64url")}`;
}

export function prefixFromSecret(secret: string): string {
  if (secret.length <= 14) return `${secret}…`;
  return `${secret.slice(0, 12)}…`;
}

export async function validateApiKeyBearer(plain: string): Promise<{
  id: string;
  userId: string;
} | null> {
  const keyHash = hashApiKeySecret(plain.trim());
  const prisma = getPrisma();
  const row = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: { id: true, userId: true, revokedAt: true },
  });
  if (!row || row.revokedAt) return null;
  await prisma.apiKey.update({
    where: { id: row.id },
    data: { lastUsedAt: new Date() },
  });
  return { id: row.id, userId: row.userId };
}

export async function createApiKey(
  userId: string,
  name: string,
): Promise<{ id: string; secret: string; prefix: string; createdAt: Date }> {
  const secret = generateSecret();
  const keyHash = hashApiKeySecret(secret);
  const prefix = prefixFromSecret(secret);
  const prisma = getPrisma();
  const row = await prisma.apiKey.create({
    data: { userId, name: name.trim() || "API key", keyHash, prefix },
  });
  return {
    id: row.id,
    secret,
    prefix: row.prefix,
    createdAt: row.createdAt,
  };
}
