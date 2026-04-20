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
 * Build per-file analysis inputs from a PR's **diff patches** rather than
 * downloading each head-ref blob in full. This is the "changed code only"
 * view: we extract the added + context lines from each unified diff hunk
 * and pass them through as if they were the file's content.
 *
 * Why patches instead of full files:
 *   - Analysis scales with the size of the **change**, not the repo. A 94-
 *     file PR against a large codebase is usually well under a megabyte of
 *     actual diff, even when the head-ref files combined are tens of MB.
 *   - One API call (`pulls.listFiles`) instead of N `repos.getContent` calls.
 *   - Checks run on code the PR is actually introducing, which matches the
 *     product promise (PR-aware trust feedback).
 *
 * Trade-off: line numbers reported by checks refer to positions within the
 * extracted hunks, not the full file. That's acceptable for this pipeline —
 * issues still carry a `filePath` and the UI surfaces the diff separately.
 */
export async function fetchPrFilesForAnalysis(
  prUrl: string,
  token: string,
): Promise<{ files: CodeFile[]; repoUrl: string; title: string }> {
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

    // `patch` is omitted by GitHub for binary files, very large diffs, or
    // pure renames without content changes. Skip — nothing to analyze.
    const patch = (f as { patch?: string }).patch;
    if (!patch) continue;

    const content = extractAddedAndContext(patch);
    if (!content) continue;
    if (Buffer.byteLength(content, "utf8") > MAX_FILE_BYTES) continue;
    if (/\0/.test(content)) continue;

    files.push({ path: f.filename, content });
  }

  if (files.length === 0) {
    throw new Error("No readable text files found for this pull request.");
  }

  return {
    files,
    repoUrl: repoUrlFromParsed(parsed),
    title: pr.title ?? `${owner}/${repo}#${pull_number}`,
  };
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
  if (/\.(png|jpg|jpeg|gif|webp|ico|pdf|zip|gz|woff2?|ttf|eot)$/i.test(path))
    return true;
  return false;
}
