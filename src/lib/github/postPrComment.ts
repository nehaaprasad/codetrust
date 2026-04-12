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

  lines.push(
    "<!-- ai-code-trust -->",
  );

  let body = lines.join("\n");
  if (body.length > MAX_BODY) {
    body = `${body.slice(0, MAX_BODY - 20)}\n\n… *(truncated)*`;
  }
  return body;
}

export async function postPrComment(
  token: string,
  parsed: ParsedPrUrl,
  body: string,
): Promise<{ htmlUrl: string }> {
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.rest.issues.createComment({
    owner: parsed.owner,
    repo: parsed.repo,
    issue_number: parsed.pull_number,
    body,
  });
  if (!data.html_url) {
    throw new Error("GitHub did not return a comment URL.");
  }
  return { htmlUrl: data.html_url };
}
