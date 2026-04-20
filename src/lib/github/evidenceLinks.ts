/**
 * Deep-link helpers that turn a finding's `filePath` + `lineNumber` into a
 * stable GitHub permalink. We prefer `blob/<sha>` over `pull/<n>/files`
 * because:
 *
 *   1. `blob/<sha>` permalinks remain valid forever (the SHA never moves).
 *   2. They work after the PR is merged/closed — the files tab fragment
 *      format (`#diff-<hash>R<line>`) stops working once the PR disappears
 *      from the reviewer UI.
 *   3. They render the line with syntax highlighting and a standard GitHub
 *      "copy permalink" behaviour reviewers already know.
 *
 * Input paths are assumed to be GitHub-relative (what `pulls.listFiles`
 * returns, e.g. `src/lib/foo.ts`). We URL-encode each path segment so
 * filenames with spaces or non-ASCII characters still produce a valid URL,
 * and we never emit a link when any required field is missing — callers
 * render plain text in that case.
 */

export type EvidenceContext = {
  owner: string;
  repo: string;
  /** Git SHA of the PR head. Permalinks depend on it. */
  headSha: string;
};

/**
 * Returns a GitHub blob URL pointing at a specific line of a file at the
 * PR's head SHA, or `null` if any required field is missing/empty.
 *
 * Examples:
 *   buildEvidenceLink(ctx, "src/auth.ts", 45)
 *     → "https://github.com/acme/app/blob/abc123/src/auth.ts#L45"
 *   buildEvidenceLink(ctx, "src/auth.ts", null)
 *     → "https://github.com/acme/app/blob/abc123/src/auth.ts"
 *   buildEvidenceLink(ctx, "", 45)
 *     → null  (no path)
 *   buildEvidenceLink({ owner:"", repo:"", headSha:"" }, "x", 1)
 *     → null  (missing context)
 */
export function buildEvidenceLink(
  ctx: EvidenceContext | null | undefined,
  filePath: string | null | undefined,
  lineNumber: number | null | undefined,
): string | null {
  if (!ctx) return null;
  const owner = ctx.owner?.trim();
  const repo = ctx.repo?.trim();
  const sha = ctx.headSha?.trim();
  if (!owner || !repo || !sha) return null;

  const path = filePath?.trim();
  if (!path) return null;

  const encodedPath = path
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");

  const base = `https://github.com/${owner}/${repo}/blob/${sha}/${encodedPath}`;
  if (lineNumber != null && Number.isFinite(lineNumber) && lineNumber > 0) {
    return `${base}#L${Math.floor(lineNumber)}`;
  }
  return base;
}
