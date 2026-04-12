import { createHmac, timingSafeEqual } from "crypto";

/** Verify `X-Hub-Signature-256: sha256=<hex>` from GitHub webhooks. */
export function verifyGitHubWebhookSignature(
  secret: string,
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const digest = signatureHeader.slice("sha256=".length);
  const expected = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");
  try {
    const a = Buffer.from(digest, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
