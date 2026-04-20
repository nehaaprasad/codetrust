import { Octokit } from "@octokit/rest";
import type { ChangedFileRegion } from "@/lib/analysis/diff-parser";
import type { AnalysisIssue } from "@/lib/analysis/types";
import type { ParsedPrUrl } from "./parsePrUrl";

/**
 * Hidden marker embedded in every inline review comment we post. Used to
 * identify (and delete) stale comments from previous runs so a rerun
 * doesn't pile duplicate findings on the same line.
 */
export const INLINE_MARKER = "<!-- ai-code-trust-inline -->";

/**
 * Upper bound on the number of inline comments we'll post in a single
 * review. A PR with 40 findings posted inline reads like spam; the
 * summary comment still captures everything via the grouped list. The
 * highest-severity findings win the budget (see
 * `selectInlineCandidates`).
 */
const MAX_INLINE_COMMENTS = 12;

const SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

type ReviewCommentSeed = {
  path: string;
  line: number;
  body: string;
};

/**
 * Build an inline review for the PR.
 *
 * Flow:
 *   1. Filter findings to ones whose `(filePath, lineNumber)` is
 *      actually in the PR's added lines. GitHub rejects inline
 *      comments on lines that aren't part of the diff, and a single
 *      bad entry fails the whole review.
 *   2. Rank by severity, cap at `MAX_INLINE_COMMENTS`.
 *   3. Delete any prior inline comments we left on this PR (matched
 *      by our hidden marker) so reruns stay clean.
 *   4. Post a single review with `event: "COMMENT"` (no approval,
 *      no change-request — we just want threaded comments).
 *
 * Returns the review ID on success, or `null` if nothing was posted
 * (no eligible findings, or the API call failed — callers should
 * treat the summary comment as the source of truth either way).
 */
export async function postInlineReviewComments(args: {
  token: string;
  parsed: ParsedPrUrl;
  headSha: string;
  issues: AnalysisIssue[];
  changedRegions: Record<string, ChangedFileRegion>;
}): Promise<{ reviewId: number; postedCount: number } | null> {
  const { token, parsed, headSha, issues, changedRegions } = args;

  const candidates = selectInlineCandidates(issues, changedRegions);
  if (candidates.length === 0) return null;

  const octokit = new Octokit({ auth: token });
  const { owner, repo, pull_number } = parsed;

  try {
    await deletePriorInlineComments(octokit, { owner, repo, pull_number });
  } catch (e) {
    console.warn(
      "[inline-review] failed to delete prior inline comments (continuing):",
      (e as Error)?.message ?? e,
    );
  }

  try {
    const { data } = await octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number,
      commit_id: headSha,
      event: "COMMENT",
      comments: candidates.map((c) => ({
        path: c.path,
        line: c.line,
        side: "RIGHT",
        body: c.body,
      })),
    });
    return { reviewId: data.id, postedCount: candidates.length };
  } catch (e) {
    console.error(
      "[inline-review] createReview failed:",
      (e as Error)?.message ?? e,
    );
    return null;
  }
}

/**
 * Keep only findings that the GitHub inline-review API will accept:
 *
 *   - A `filePath` that matches a file in this PR.
 *   - A `lineNumber` that the PR actually added or modified on the
 *     right-hand side (pure-context lines on the left are rejected).
 *
 * Findings surviving that gate are ranked critical → high → medium →
 * low, truncated to `MAX_INLINE_COMMENTS`. Within a severity tier we
 * keep original order so two high-sevs at lines 12 and 40 render in
 * diff order.
 *
 * Exported for scenario tests.
 */
export function selectInlineCandidates(
  issues: AnalysisIssue[],
  changedRegions: Record<string, ChangedFileRegion>,
): ReviewCommentSeed[] {
  const eligible: Array<{ seed: ReviewCommentSeed; severity: string; idx: number }> = [];

  issues.forEach((issue, idx) => {
    const path = issue.filePath?.trim();
    const line = issue.lineNumber;
    if (!path || line == null || !Number.isFinite(line) || line <= 0) return;

    const region = changedRegions[path];
    if (!region) return;

    const inDiff = region.addedLines.some((l) => l.lineNumber === line);
    if (!inDiff) return;

    eligible.push({
      seed: { path, line, body: formatInlineBody(issue) },
      severity: issue.severity,
      idx,
    });
  });

  eligible.sort((a, b) => {
    const sev = (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0);
    if (sev !== 0) return sev;
    return a.idx - b.idx;
  });

  return eligible.slice(0, MAX_INLINE_COMMENTS).map((e) => e.seed);
}

/**
 * Markdown body for a single inline comment. Kept short — one line of
 * context, one of finding, one of severity tag, and the hidden marker
 * for rerun cleanup. Long explanations belong in the summary comment;
 * inline is a pointer at the problem.
 */
function formatInlineBody(issue: AnalysisIssue): string {
  const tag = `**${issue.category}** · ${issue.severity}`;
  const msg = issue.message.trim();
  return `${tag}\n\n${msg}\n\n${INLINE_MARKER}`;
}

/**
 * Delete every review comment on this PR whose body contains our
 * marker. We intentionally do NOT paginate beyond the first 100
 * comments: if a PR has accumulated more than 100 review comments
 * from us, something else is wrong and the failure mode of a few
 * stale comments is better than a rate-limit storm.
 */
async function deletePriorInlineComments(
  octokit: Octokit,
  args: { owner: string; repo: string; pull_number: number },
): Promise<void> {
  const { data } = await octokit.rest.pulls.listReviewComments({
    owner: args.owner,
    repo: args.repo,
    pull_number: args.pull_number,
    per_page: 100,
  });
  const mine = data.filter((c) => typeof c.body === "string" && c.body.includes(INLINE_MARKER));
  for (const c of mine) {
    try {
      await octokit.rest.pulls.deleteReviewComment({
        owner: args.owner,
        repo: args.repo,
        comment_id: c.id,
      });
    } catch (e) {
      console.warn(
        `[inline-review] delete of comment ${c.id} failed (continuing):`,
        (e as Error)?.message ?? e,
      );
    }
  }
}
