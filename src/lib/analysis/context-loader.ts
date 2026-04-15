import { Octokit } from "@octokit/rest";
import { parseGithubPrUrl } from "../github/parsePrUrl";

const CONTEXT_LINES = 5; // Lines before/after changed region

export interface CodeContext {
  filePath: string;
  before: string;      // Lines before changed region
  changed: string;      // The changed lines themselves
  after: string;       // Lines after changed region
  lineRange: { start: number; end: number };
}

export interface ChangedRanges {
  addedRanges: Array<{ start: number; end: number }>;
  deletedRanges: Array<{ start: number; end: number }>;
}

/**
 * Load surrounding code context around changed lines for a PR.
 */
export async function loadPrContext(
  prUrl: string,
  token: string,
  changedFiles: Record<string, ChangedRanges>,
): Promise<CodeContext[]> {
  const parsed = parseGithubPrUrl(prUrl);
  if (!parsed) throw new Error("Invalid PR URL");

  const octokit = new Octokit({ auth: token });
  const { owner, repo, pull_number } = parsed;

  // Get the PR head commit
  const { data: pr } = await octokit.pulls.get({ owner, repo, pull_number });
  const headSha = pr.head.sha;

  const contexts: CodeContext[] = [];

  for (const [filePath, ranges] of Object.entries(changedFiles)) {
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: headSha,
      });

      if (Array.isArray(data) || data.type !== "file" || !("content" in data)) continue;

      const content = Buffer.from(data.content, "base64").toString("utf8");
      const lines = content.split("\n");

      // Combine added and deleted ranges, merge overlapping ones
      const allRanges = mergeRanges([
        ...ranges.addedRanges,
        ...ranges.deletedRanges,
      ]);

      for (const range of allRanges) {
        const start = Math.max(0, range.start - 1 - CONTEXT_LINES); // 0-indexed
        const end = Math.min(lines.length, range.end + CONTEXT_LINES);

        const before = lines.slice(Math.max(0, start), range.start - 1).join("\n");
        const changed = lines.slice(range.start - 1, range.end).join("\n");
        const after = lines.slice(range.end, end).join("\n");

        contexts.push({
          filePath,
          before,
          changed,
          after,
          lineRange: { start: range.start, end: range.end },
        });
      }
    } catch {
      // File might be new or binary - skip
    }
  }

  return contexts;
}

/**
 * Merge overlapping or adjacent ranges.
 */
function mergeRanges(
  ranges: Array<{ start: number; end: number }>,
): Array<{ start: number; end: number }> {
  if (ranges.length === 0) return [];

  // Sort by start
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];

  let current = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    if (next.start <= current.end + 1) {
      // Overlapping or adjacent - merge
      current.end = Math.max(current.end, next.end);
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);

  return merged;
}