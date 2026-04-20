import { Octokit } from "@octokit/rest";
import type { CodeFile } from "@/lib/analysis/checks";
import { parseGithubPrUrl, repoUrlFromParsed } from "./parsePrUrl";

/**
 * Cap per-file content (bytes) fed into the deterministic checks. Combined
 * with `MAX_FILES` and `ANALYZE_MAX_TOTAL_BYTES` (see `lib/analysis/limits.ts`)
 * this keeps memory bounded for pathological PRs.
 */
const MAX_FILE_BYTES = 256 * 1024;
const MAX_FILES = 80;

/**
 * Size threshold (bytes) below which we feed the **full file** through to
 * the analyzer. At or above this we fall back to the diff patch (changed
 * hunks only). Small files get accurate project-wide signals (length,
 * cross-line patterns, existing issues the PR didn't touch); large files
 * still get *some* analysis instead of crashing the 1.5 MB combined cap.
 */
const FULL_CONTENT_THRESHOLD_BYTES = 100 * 1024;

/**
 * Build per-file analysis inputs for a PR using a **hybrid** strategy:
 *
 *   - Small/medium files (< `FULL_CONTENT_THRESHOLD_BYTES`): fetch the full
 *     file at the PR's head via `repos.getContent`. This preserves the
 *     pre-patches behaviour where checks can inspect the entire file and
 *     find issues outside the changed hunks.
 *   - Large files (>= threshold) or files whose blob GitHub won't inline:
 *     fall back to the PR's diff patch (added + context lines only). This
 *     stops one huge generated file from blowing the combined-bytes cap.
 *   - Files where neither path yields usable text are skipped.
 *
 * Note on sizing: GitHub's `diff-entry` objects returned by `pulls.listFiles`
 * do NOT expose a `size` field (only `additions`/`deletions`/`changes`).
 * The authoritative file size is returned by `repos.getContent`, so that is
 * the field consulted here; the single call both tells us how big the file
 * is and hands us the content when it's small enough to use directly.
 */
export async function fetchPrFilesForAnalysis(
  prUrl: string,
  token: string,
): Promise<{ files: CodeFile[]; repoUrl: string; title: string; headSha: string }> {
  const parsed = parseGithubPrUrl(prUrl);
  if (!parsed) {
    throw new Error("Invalid GitHub pull request URL.");
  }

  const octokit = new Octokit({ auth: token });
  const { owner, repo, pull_number } = parsed;

  const { data: pr } = await octokit.pulls.get({
    owner,
    repo,
    pull_number,
  });

  const headSha = pr.head.sha;
  const { data: prFiles } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number,
    per_page: 100,
  });

  const files: CodeFile[] = [];
  for (const f of prFiles) {
    if (files.length >= MAX_FILES) break;
    if (f.status === "removed" || !f.filename) continue;
    if (shouldSkipPath(f.filename)) continue;

    const patch = (f as { patch?: string }).patch;

    // 1) Try full content for small/medium files.
    const fullContent = await tryFetchFullContent(octokit, {
      owner,
      repo,
      path: f.filename,
      ref: headSha,
    });

    if (fullContent && fullContent.size < FULL_CONTENT_THRESHOLD_BYTES) {
      const text = fullContent.text;
      if (text && !/\0/.test(text) && Buffer.byteLength(text, "utf8") <= MAX_FILE_BYTES) {
        files.push({ path: f.filename, content: text });
        continue;
      }
    }

    // 2) Fall back to patch-derived content for large files (or when
    //    getContent couldn't deliver usable text).
    if (!patch) continue;
    const patchContent = extractAddedAndContext(patch);
    if (!patchContent) continue;
    if (/\0/.test(patchContent)) continue;
    if (Buffer.byteLength(patchContent, "utf8") > MAX_FILE_BYTES) continue;

    files.push({ path: f.filename, content: patchContent });
  }

  if (files.length === 0) {
    throw new Error("No readable text files found for this pull request.");
  }

  return {
    files,
    repoUrl: repoUrlFromParsed(parsed),
    title: pr.title ?? `${owner}/${repo}#${pull_number}`,
    headSha,
  };
}

/**
 * Attempt to fetch a blob's full contents at `ref`. Returns the authoritative
 * `size` reported by the Contents API plus decoded text when GitHub inlined
 * the body. Returns `null` on error (binary, submodule, 404, etc.) — callers
 * should then fall back to the diff patch.
 */
async function tryFetchFullContent(
  octokit: Octokit,
  args: { owner: string; repo: string; path: string; ref: string },
): Promise<{ size: number; text: string | null } | null> {
  try {
    const { data } = await octokit.repos.getContent(args);
    if (Array.isArray(data) || data.type !== "file") return null;
    const size = typeof data.size === "number" ? data.size : 0;
    // Files >1 MB come back with `content: ""` and encoding "none"; caller
    // will fall through to the patch branch via the size threshold.
    if (!("content" in data) || !data.content) {
      return { size, text: null };
    }
    const buf = Buffer.from(data.content, "base64");
    return { size, text: buf.toString("utf8") };
  } catch {
    return null;
  }
}

/**
 * Given a unified diff patch, return the post-PR view of the changed hunks:
 * added lines plus surrounding context, with diff markers stripped. Hunk
 * headers (`@@ ...`) and "\ No newline at end of file" markers are dropped;
 * removed (`-`) lines are dropped so we don't feed obsolete code to the
 * checks.
 */
function extractAddedAndContext(patch: string): string {
  const out: string[] = [];
  for (const raw of patch.split("\n")) {
    if (raw.length === 0) {
      out.push("");
      continue;
    }
    const marker = raw[0];
    if (marker === "@" || marker === "\\") continue;
    if (marker === "-") continue;
    if (marker === "+" || marker === " ") {
      out.push(raw.slice(1));
      continue;
    }
    // Unexpected prefix — keep verbatim rather than silently drop.
    out.push(raw);
  }
  return out.join("\n");
}

function shouldSkipPath(path: string): boolean {
  const lower = path.toLowerCase();
  if (lower.includes("/node_modules/")) return true;
  if (lower.includes("/dist/") || lower.includes("/build/")) return true;
  if (lower.includes("/.next/") || lower.includes("/.turbo/")) return true;
  if (/\.(png|jpg|jpeg|gif|webp|ico|pdf|zip|gz|woff2?|ttf|eot)$/i.test(path))
    return true;
  // Lockfiles: machine-generated, huge, always noise in any code-review tool.
  // Keeping them out frees up the 80-file budget and the combined-bytes cap
  // for files where the rules can actually produce signal.
  const basename = path.split("/").pop()?.toLowerCase() ?? "";
  const lockFileNames = new Set([
    "bun.lock",
    "bun.lockb",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "cargo.lock",
    "go.sum",
    "poetry.lock",
    "pipfile.lock",
    "composer.lock",
    "gemfile.lock",
    "flake.lock",
  ]);
  if (lockFileNames.has(basename)) return true;
  return false;
}
