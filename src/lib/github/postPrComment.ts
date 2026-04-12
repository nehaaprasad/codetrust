import { Octokit } from "@octokit/rest";
import type { AnalysisResult } from "@/lib/analysis/run";
import type { ParsedPrUrl } from "./parsePrUrl";

const MAX_BODY = 62_000;
const MAX_ISSUES_IN_COMMENT = 12;

/** Markdown body for an issue/PR comment (GitHub treats PRs as issues). */
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

  const top = result.issues.slice(0, MAX_ISSUES_IN_COMMENT);
  if (top.length > 0) {
    lines.push("**Top issues:**");
    for (const i of top) {
      const loc =
        i.filePath != null && String(i.filePath).length > 0
          ? ` \`${i.filePath}${i.lineNumber != null ? `:${i.lineNumber}` : ""}\``
          : "";
      lines.push(
        `- **${i.category}** (${i.severity}) — ${i.message.trim()}${loc}`,
      );
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
