import { Octokit } from "@octokit/rest";
import type { ChangedFileRegion } from "@/lib/analysis/diff-parser";
import { normaliseIssueMessage } from "@/lib/analysis/normaliseIssue";
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
 *   2. **Deduplicate** findings that differ only by line number — the
 *      LLM often returns "line 76 exposes X", "line 88 exposes X",
 *      "line 100 exposes X" as three separate issues. We collapse
 *      those into one inline comment on the earliest line and list
 *      the rest in the body.
 *   3. Rank by severity, cap at `MAX_INLINE_COMMENTS`.
 *   4. Delete any prior inline comments we left on this PR (matched
 *      by our hidden marker) so reruns stay clean.
 *   5. Post a single review with `event: "COMMENT"` (no approval,
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

type EligibleIssue = {
  issue: AnalysisIssue;
  path: string;
  line: number;
  /** Preserves the original array index so same-severity ties render in diff order. */
  idx: number;
};

type InlineGroup = {
  path: string;
  category: string;
  severity: string;
  normalisedMessage: string;
  /** Primary line (earliest occurrence) — where the inline comment is anchored. */
  primaryLine: number;
  /** Primary issue — owns the message body text. */
  primaryIssue: AnalysisIssue;
  /** Additional line numbers on the same file where this same finding applies. */
  additionalLines: number[];
  /** Smallest original index across the group — controls tiebreak ordering. */
  minIdx: number;
};

/**
 * Keep only findings that the GitHub inline-review API will accept:
 *
 *   - A `filePath` that matches a file in this PR.
 *   - A `lineNumber` that the PR actually added or modified on the
 *     right-hand side (pure-context lines on the left are rejected).
 *
 * Then group findings that are the same rule / same severity / same
 * file, differing only by numeric details (line number, length).
 * Each group becomes one inline comment anchored at the earliest
 * matching line, with any additional lines listed in the body.
 *
 * Finally rank critical → high → medium → low, truncate to
 * `MAX_INLINE_COMMENTS`, and preserve original order within each
 * severity tier so comments render in diff order.
 *
 * Exported for scenario tests.
 */
export function selectInlineCandidates(
  issues: AnalysisIssue[],
  changedRegions: Record<string, ChangedFileRegion>,
): ReviewCommentSeed[] {
  const eligible: EligibleIssue[] = [];
  issues.forEach((issue, idx) => {
    const path = issue.filePath?.trim();
    const line = issue.lineNumber;
    if (!path || line == null || !Number.isFinite(line) || line <= 0) return;

    const region = changedRegions[path];
    if (!region) return;

    const inDiff = region.addedLines.some((l) => l.lineNumber === line);
    if (!inDiff) return;

    eligible.push({ issue, path, line, idx });
  });

  const groups = groupEligibleByRule(eligible);

  groups.sort((a, b) => {
    const sev = (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0);
    if (sev !== 0) return sev;
    return a.minIdx - b.minIdx;
  });

  return groups.slice(0, MAX_INLINE_COMMENTS).map((g) => ({
    path: g.path,
    line: g.primaryLine,
    body: formatInlineBody(g.primaryIssue, g.additionalLines),
  }));
}

/**
 * Collapse eligible issues by (path, category, severity,
 * normalisedMessage). Within each group we keep the earliest line as
 * the anchor and record all other matching lines for the body.
 */
function groupEligibleByRule(eligible: EligibleIssue[]): InlineGroup[] {
  const map = new Map<string, InlineGroup>();

  for (const e of eligible) {
    const normalised = normaliseIssueMessage(e.issue.message);
    const key = `${e.path}|${e.issue.category}|${e.issue.severity}|${normalised}`;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        path: e.path,
        category: e.issue.category,
        severity: e.issue.severity,
        normalisedMessage: normalised,
        primaryLine: e.line,
        primaryIssue: e.issue,
        additionalLines: [],
        minIdx: e.idx,
      });
      continue;
    }

    if (e.line < existing.primaryLine) {
      existing.additionalLines.push(existing.primaryLine);
      existing.primaryLine = e.line;
      existing.primaryIssue = e.issue;
    } else if (e.line !== existing.primaryLine) {
      existing.additionalLines.push(e.line);
    }
    if (e.idx < existing.minIdx) existing.minIdx = e.idx;
  }

  for (const g of map.values()) {
    g.additionalLines.sort((a, b) => a - b);
  }

  return [...map.values()];
}

/**
 * Markdown body for a single inline comment. Kept short — one line of
 * context, one of finding, one of severity tag, and the hidden marker
 * for rerun cleanup. Long explanations belong in the summary comment;
 * inline is a pointer at the problem. When the same finding applies
 * to multiple lines, we note the others inline so the reviewer sees
 * the full picture from one thread.
 */
function formatInlineBody(
  issue: AnalysisIssue,
  additionalLines: readonly number[],
): string {
  const tag = `**${issue.category}** · ${issue.severity}`;
  const msg = issue.message.trim();
  const alsoLine =
    additionalLines.length > 0
      ? `\n\n_Also on ${additionalLines.length === 1 ? "line" : "lines"} ${additionalLines.join(", ")}._`
      : "";
  return `${tag}\n\n${msg}${alsoLine}\n\n${INLINE_MARKER}`;
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
