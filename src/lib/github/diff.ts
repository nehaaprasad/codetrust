/**
 * Diff parsing and types
 */

import { Octokit } from "@octokit/rest";
import { parseGithubPrUrl } from "./parsePrUrl";

export interface DiffLine {
  type: "context" | "added" | "deleted";
  content: string;
  oldLineNum: number | null;
  newLineNum: number | null;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffFile {
  path: string;
  status: "added" | "modified" | "deleted";
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

export interface ParsedDiff {
  files: DiffFile[];
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
}

/**
 * Parse a unified diff string into structured data
 */
export function parseDiff(diffOutput: string): ParsedDiff {
  const files: DiffFile[] = [];
  const lines = diffOutput.split("\n");

  let currentFile: DiffFile | null = null;
  let currentHunk: DiffHunk | null = null;
  let oldLineNum = 0;
  let newLineNum = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // File header: diff --git a/path b/path
    const fileMatch = line.match(/^diff --git a\/(.+?) b\/(.+?)$/);
    if (fileMatch) {
      if (currentFile) files.push(currentFile);
      currentFile = {
        path: fileMatch[2],
        status: "modified",
        additions: 0,
        deletions: 0,
        hunks: [],
      };
      continue;
    }

    // New file: new file mode
    if (line === "new file mode") {
      if (currentFile) currentFile.status = "added";
      continue;
    }

    // Deleted file: deleted file mode
    if (line === "deleted file mode") {
      if (currentFile) currentFile.status = "deleted";
      continue;
    }

    // Hunk header: @@ -old,count +new,count @@
    const hunkMatch = line.match(/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
    if (hunkMatch && currentFile) {
      oldLineNum = parseInt(hunkMatch[1], 10);
      newLineNum = parseInt(hunkMatch[3], 10);
      currentHunk = {
        oldStart: oldLineNum,
        oldLines: parseInt(hunkMatch[2] || "1", 10),
        newStart: newLineNum,
        newLines: parseInt(hunkMatch[4] || "1", 10),
        lines: [],
      };
      currentFile.hunks.push(currentHunk);
      continue;
    }

    // Diff content lines
    if (currentHunk && currentFile) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        currentFile.additions++;
        currentHunk.lines.push({
          type: "added",
          content: line.slice(1),
          oldLineNum: null,
          newLineNum: newLineNum++,
        });
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        currentFile.deletions++;
        currentHunk.lines.push({
          type: "deleted",
          content: line.slice(1),
          oldLineNum: oldLineNum++,
          newLineNum: null,
        });
      } else if (!line.startsWith("\\")) {
        currentHunk.lines.push({
          type: "context",
          content: line.startsWith(" ") ? line.slice(1) : line,
          oldLineNum: oldLineNum++,
          newLineNum: newLineNum++,
        });
      }
    }
  }

  if (currentFile) {
    files.push(currentFile);
  }

  return {
    files,
    totalFiles: files.length,
    totalAdditions: files.reduce((sum, f) => sum + f.additions, 0),
    totalDeletions: files.reduce((sum, f) => sum + f.deletions, 0),
  };
}

/**
 * Fetch the raw unified diff for a PR.
 */
export async function fetchRawPrDiff(prUrl: string, token: string): Promise<string> {
  const parsed = parseGithubPrUrl(prUrl);
  if (!parsed) throw new Error("Invalid PR URL");

  const octokit = new Octokit({ auth: token });
  const { owner, repo, pull_number } = parsed;

  const { data } = await octokit.pulls.get({
    owner,
    repo,
    pull_number,
    mediaType: { format: "diff" },
  });

  return typeof data === "string" ? data : "";
}