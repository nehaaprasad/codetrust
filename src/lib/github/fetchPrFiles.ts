import { Octokit } from "@octokit/rest";
import type { CodeFile } from "@/lib/analysis/checks";
import { parseGithubPrUrl, repoUrlFromParsed } from "./parsePrUrl";

const MAX_FILE_BYTES = 256 * 1024;
const MAX_FILES = 80;

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

    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: f.filename,
        ref: headSha,
      });
      if (Array.isArray(data) || data.type !== "file") continue;
      if (!("content" in data) || !data.content) continue;
      const buf = Buffer.from(data.content, "base64");
      if (buf.length > MAX_FILE_BYTES) continue;
      const text = buf.toString("utf8");
      if (/\0/.test(text)) continue;
      files.push({ path: f.filename, content: text });
    } catch {
      // Binary or inaccessible path — skip.
    }
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

function shouldSkipPath(path: string): boolean {
  const lower = path.toLowerCase();
  if (lower.includes("/node_modules/")) return true;
  if (lower.includes("/dist/") || lower.includes("/build/")) return true;
  if (/\.(png|jpg|jpeg|gif|webp|ico|pdf|zip|gz|woff2?|ttf|eot)$/i.test(path))
    return true;
  return false;
}
