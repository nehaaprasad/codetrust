type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

/**
 * Simple in-memory sliding window per key (IP or user id).
 * Set RATE_LIMIT_ENABLED=false to disable.
 */
export function checkRateLimit(key: string): {
  ok: boolean;
  limit: number;
  windowMs: number;
} {
  if (process.env.RATE_LIMIT_ENABLED === "false") {
    return { ok: true, limit: MAX_REQUESTS, windowMs: WINDOW_MS };
  }
  const limit = Number.parseInt(process.env.RATE_LIMIT_MAX ?? "", 10);
  const max = Number.isFinite(limit) && limit > 0 ? limit : MAX_REQUESTS;
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, b);
  }
  b.count += 1;
  if (b.count > max) {
    return { ok: false, limit: max, windowMs: WINDOW_MS };
  }
  return { ok: true, limit: max, windowMs: WINDOW_MS };
}

export function clientIpFromRequest(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    return xff.split(",")[0]?.trim() ?? "unknown";
  }
  return req.headers.get("x-real-ip") || "unknown";
}
