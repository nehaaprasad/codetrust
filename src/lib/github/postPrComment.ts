import { Octokit } from "@octokit/rest";
import type { AnalysisResult } from "@/lib/analysis/run";
import type { AnalysisIssue } from "@/lib/analysis/types";
import type { ParsedPrUrl } from "./parsePrUrl";

const MAX_BODY = 62_000;
const MAX_GROUPS_IN_COMMENT = 10;
const MAX_OCCURRENCES_SHOWN_PER_GROUP = 4;

const SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Markdown body for a PR/issue comment.
 *
 * Key design goal: the comment must read like a review, not a linter dump.
 * Earlier versions listed each issue as its own bullet, so a single rule
 * firing across five files produced five nearly-identical bullets and
 * looked like noise. We now **group** issues by rule
 * (category + severity + normalised message) and render each group once
 * with its file locations attached, which compresses "onClick ×5 files"
 * from half a screen into a single readable line while preserving every
 * file reference a reviewer might need.
 */
export function buildPrCommentBody(
  result: Pick<
    AnalysisResult,
    "score" | "decision" | "summary" | "issues" | "modelVersion"
  >,
): string {
  const lines: string[] = [
    "### AI Code Trust — ship readiness",
    "",
    `**Score:** ${result.score} · **Verdict:** ${result.decision} · **Model:** ${result.modelVersion}`,
    "",
    result.summary.trim(),
    "",
  ];

  const groups = sortAndTrimGroups(groupIssues(result.issues));
  if (groups.length > 0) {
    lines.push("**Top issues:**");
    for (const g of groups) {
      lines.push(`- **${g.category}** (${g.severity}) — ${g.message}`);
      const shown = g.occurrences.slice(0, MAX_OCCURRENCES_SHOWN_PER_GROUP);
      const extra = g.occurrences.length - shown.length;
      if (shown.length > 0) {
        const locs = shown.map((o) => `\`${formatLocation(o)}\``).join(", ");
        const suffix = extra > 0 ? ` _(+${extra} more)_` : "";
        const label = g.occurrences.length === 1 ? "  _at_" : "  _across_";
        lines.push(`${label} ${locs}${suffix}`);
      }
    }
    lines.push("");
  }

  lines.push("<!-- ai-code-trust -->");

  let body = lines.join("\n");
  if (body.length > MAX_BODY) {
    body = `${body.slice(0, MAX_BODY - 20)}\n\n… *(truncated)*`;
  }
  return body;
}

type GroupedOccurrence = {
  filePath: string;
  lineNumber: number | null | undefined;
  originalMessage: string;
};

type IssueGroup = {
  category: string;
  severity: string;
  /** Message with volatile parenthetical details (e.g. "(626 lines)") stripped. */
  message: string;
  occurrences: GroupedOccurrence[];
};

/**
 * Normalise a rule message so two issues from the same rule but different
 * numeric details (e.g. "(626 lines)" vs "(482 lines)") collapse into a
 * single group. Stripped: any `(N …)` parenthetical whose first token is a
 * number, plus multiple adjacent spaces left behind.
 */
function normaliseMessage(msg: string): string {
  return msg
    .trim()
    .replace(/\s*\(\s*\d+[^)]*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function groupIssues(issues: AnalysisIssue[]): IssueGroup[] {
  const map = new Map<string, IssueGroup>();
  for (const i of issues) {
    const normalised = normaliseMessage(i.message);
    const key = `${i.category}|${i.severity}|${normalised}`;
    let g = map.get(key);
    if (!g) {
      g = {
        category: i.category,
        severity: i.severity,
        message: normalised,
        occurrences: [],
      };
      map.set(key, g);
    }
    g.occurrences.push({
      filePath: i.filePath ?? "",
      lineNumber: i.lineNumber,
      originalMessage: i.message,
    });
  }
  return [...map.values()];
}

function sortAndTrimGroups(groups: IssueGroup[]): IssueGroup[] {
  return groups
    .sort((a, b) => {
      const sev =
        (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0);
      if (sev !== 0) return sev;
      // More widespread first so reviewers see systemic problems before one-offs.
      return b.occurrences.length - a.occurrences.length;
    })
    .slice(0, MAX_GROUPS_IN_COMMENT);
}

function formatLocation(o: GroupedOccurrence): string {
  if (!o.filePath) return "project";
  return o.lineNumber != null ? `${o.filePath}:${o.lineNumber}` : o.filePath;
}

export type PrCommentRef = {
  htmlUrl: string;
  commentId: string;
};

async function createComment(
  octokit: Octokit,
  parsed: ParsedPrUrl,
  body: string,
): Promise<PrCommentRef> {
  const { data } = await octokit.rest.issues.createComment({
    owner: parsed.owner,
    repo: parsed.repo,
    issue_number: parsed.pull_number,
    body,
  });
  if (data.html_url == null || data.id == null) {
    throw new Error("GitHub did not return comment url or id.");
  }
  return { htmlUrl: data.html_url, commentId: String(data.id) };
}

async function updateComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  commentId: string,
  body: string,
): Promise<PrCommentRef> {
  const num = Number(commentId);
  if (!Number.isFinite(num)) {
    throw new Error("Invalid stored prCommentId.");
  }
  const { data } = await octokit.rest.issues.updateComment({
    owner,
    repo,
    comment_id: num,
    body,
  });
  if (data.html_url == null || data.id == null) {
    throw new Error("GitHub did not return comment url or id after update.");
  }
  return { htmlUrl: data.html_url, commentId: String(data.id) };
}

/**
 * Creates a new PR comment, or updates the existing one when `existingCommentId` is set.
 * If update fails (e.g. comment deleted), falls back to creating a new comment.
 */
export async function createOrUpdatePrComment(
  token: string,
  parsed: ParsedPrUrl,
  body: string,
  existingCommentId: string | null | undefined,
): Promise<PrCommentRef> {
  const octokit = new Octokit({ auth: token });
  const { owner, repo } = parsed;

  if (existingCommentId?.trim()) {
    try {
      return await updateComment(octokit, owner, repo, existingCommentId.trim(), body);
    } catch (e) {
      console.error("GitHub updateComment failed, creating new comment:", e);
    }
  }

  return createComment(octokit, parsed, body);
}
