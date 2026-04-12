const PR_URL =
  /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)\/pull\/(\d+)(?:\/|$|\?)/i;

export type ParsedPrUrl = {
  owner: string;
  repo: string;
  pull_number: number;
};

export function parseGithubPrUrl(url: string): ParsedPrUrl | null {
  const trimmed = url.trim();
  const m = trimmed.match(PR_URL);
  if (!m) return null;
  const owner = m[1];
  const repo = m[2].replace(/\.git$/i, "");
  const pull_number = Number(m[3]);
  if (!owner || !repo || !Number.isFinite(pull_number)) return null;
  return { owner, repo, pull_number };
}

export function repoUrlFromParsed(p: ParsedPrUrl): string {
  return `https://github.com/${p.owner}/${p.repo}`;
}
