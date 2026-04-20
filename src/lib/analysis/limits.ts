/**
 * Env-configurable caps for the analyze pipeline.
 *
 * `ANALYZE_MAX_TOTAL_BYTES` bounds the combined size of all files fed into
 * the deterministic checks, guarding memory/CPU on the server. The default
 * is kept at 1.5 MB to match historical behavior; operators can raise it for
 * very large PRs by setting the env var in `.env` (or on Vercel).
 *
 * Values are clamped to a sane window so a typo (e.g. `100` or `5_000_000_000`)
 * can't accidentally disable the guard or OOM the server.
 */

const DEFAULT_ANALYZE_MAX_TOTAL_BYTES = 1_500_000;
const MIN_ANALYZE_MAX_TOTAL_BYTES = 100_000;
const MAX_ANALYZE_MAX_TOTAL_BYTES = 50_000_000;

export function getAnalyzeMaxTotalBytes(): number {
  const raw = process.env.ANALYZE_MAX_TOTAL_BYTES?.trim();
  if (!raw) return DEFAULT_ANALYZE_MAX_TOTAL_BYTES;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_ANALYZE_MAX_TOTAL_BYTES;
  return Math.min(
    MAX_ANALYZE_MAX_TOTAL_BYTES,
    Math.max(MIN_ANALYZE_MAX_TOTAL_BYTES, Math.floor(n)),
  );
}
