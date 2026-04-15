import type { DiffLine } from "../github/diff";

export interface ChangedLine {
  type: "added" | "deleted";
  lineNumber: number;
  content: string;
}

export interface ChangedFileRegion {
  filePath: string;
  addedLines: ChangedLine[];
  deletedLines: ChangedLine[];
  addedRanges: Array<{ start: number; end: number }>;
  deletedRanges: Array<{ start: number; end: number }>;
}

interface ParsedFile {
  path: string;
  status: "added" | "modified" | "deleted";
  additions: number;
  deletions: number;
  hunks: Array<{
    oldStart: number;
    newStart: number;
    lines: DiffLine[];
  }>;
}

/**
 * Parse a unified diff string (handles both git diff --git and traditional ---/+++ formats).
 */
function parseRawDiff(diffOutput: string): ParsedFile[] {
  const files: ParsedFile[] = [];
  const lines = diffOutput.split("\n");

  let currentFile: ParsedFile | null = null;
  let currentHunk: { oldStart: number; newStart: number; lines: DiffLine[] } | null = null;
  let oldLineNum = 0;
  let newLineNum = 0;

  for (const line of lines) {
    // Handle diff --git a/path b/path format
    const gitFileMatch = line.match(/^diff --git a\/(.+?) b\/(.+?)$/);
    if (gitFileMatch) {
      if (currentFile) files.push(currentFile);
      currentFile = {
        path: gitFileMatch[2],
        status: "modified",
        additions: 0,
        deletions: 0,
        hunks: [],
      };
      continue;
    }

    // Handle traditional --- a/path format
    const tradFileMatch = line.match(/^--- a\/(.+)$/);
    if (tradFileMatch) {
      if (currentFile) files.push(currentFile);
      currentFile = {
        path: tradFileMatch[1],
        status: "modified",
        additions: 0,
        deletions: 0,
        hunks: [],
      };
      continue;
    }

    // Skip +++ b/path line
    if (line.match(/^\+\+\+ b\//)) {
      continue;
    }

    // Handle hunk header: @@ -old,count +new,count @@
    const hunkMatch = line.match(/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
    if (hunkMatch && currentFile) {
      oldLineNum = parseInt(hunkMatch[1], 10);
      newLineNum = parseInt(hunkMatch[3], 10);
      currentHunk = {
        oldStart: oldLineNum,
        newStart: newLineNum,
        lines: [],
      };
      currentFile.hunks.push(currentHunk);
      continue;
    }

    // Process diff content lines
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
      } else if (!line.startsWith("\\") && (line.startsWith(" ") || line === "")) {
        // Context line (starts with space) or empty line
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

  return files;
}

/**
 * Extract changed line information from a unified diff string.
 */
export function extractChangedLines(diffOutput: string): {
  files: Record<string, ChangedFileRegion>;
  totalChangedFiles: number;
} {
  const parsedFiles = parseRawDiff(diffOutput);
  const files: Record<string, ChangedFileRegion> = {};

  for (const file of parsedFiles) {
    const addedLines: ChangedLine[] = [];
    const deletedLines: ChangedLine[] = [];
    const addedRanges: Array<{ start: number; end: number }> = [];
    const deletedRanges: Array<{ start: number; end: number }> = [];

    let currentAddedStart: number | null = null;
    let currentDeletedStart: number | null = null;

    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type === "added" && line.newLineNum !== null) {
          if (currentAddedStart === null) {
            currentAddedStart = line.newLineNum;
          }
          addedLines.push({
            type: "added",
            lineNumber: line.newLineNum,
            content: line.content,
          });
        } else if (line.type === "deleted" && line.oldLineNum !== null) {
          if (currentDeletedStart === null) {
            currentDeletedStart = line.oldLineNum;
          }
          deletedLines.push({
            type: "deleted",
            lineNumber: line.oldLineNum,
            content: line.content,
          });
        } else {
          // Context line - close any open ranges
          if (currentAddedStart !== null) {
            const lastAdded = addedLines[addedLines.length - 1];
            addedRanges.push({ start: currentAddedStart, end: lastAdded.lineNumber });
            currentAddedStart = null;
          }
          if (currentDeletedStart !== null) {
            const lastDeleted = deletedLines[deletedLines.length - 1];
            deletedRanges.push({ start: currentDeletedStart, end: lastDeleted.lineNumber });
            currentDeletedStart = null;
          }
        }
      }
    }

    // Close any remaining open ranges at end of hunk
    if (currentAddedStart !== null && addedLines.length > 0) {
      addedRanges.push({ start: currentAddedStart, end: addedLines[addedLines.length - 1].lineNumber });
    }
    if (currentDeletedStart !== null && deletedLines.length > 0) {
      deletedRanges.push({ start: currentDeletedStart, end: deletedLines[deletedLines.length - 1].lineNumber });
    }

    files[file.path] = {
      filePath: file.path,
      addedLines,
      deletedLines,
      addedRanges,
      deletedRanges,
    };
  }

  return {
    files,
    totalChangedFiles: Object.keys(files).length,
  };
}