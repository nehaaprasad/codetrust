import type { CodeFile } from "./checks";
import type { AnalysisIssue, IssueCategory, Severity } from "./types";
import type { ChangedFileRegion } from "./diff-parser";

/**
 * Run checks only on changed code regions.
 * Focus: High-signal, PR-specific issues only.
 * Excludes: Generic suggestions, low-value noise, file-level advice.
 */
export function runPrChecks(
  files: CodeFile[],
  changedRegions: Record<string, ChangedFileRegion>,
): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];

  for (const file of files) {
    const region = changedRegions[file.path];
    if (!region) continue;

    const content = file.content;
    const lines = content.split("\n");

    // Security: Critical and high-severity only
    for (const added of region.addedLines) {
      checkAddedLineSecurity(issues, added, file.path, lines);
    }

    // Logic: Error handling gaps only (high value)
    for (const added of region.addedLines) {
      checkAddedLineLogic(issues, added, file.path, region, lines);
    }
  }

  return issues;
}

function checkAddedLineSecurity(
  issues: AnalysisIssue[],
  line: { lineNumber: number; content: string },
  filePath: string,
  _lines: string[],
) {
  const content = line.content;

  // Critical: eval() - code execution risk
  if (/eval\s*\(/.test(content)) {
    issues.push({
      category: "security",
      severity: "critical",
      message: "eval() can execute arbitrary code",
      filePath,
      lineNumber: line.lineNumber,
    });
  }

  // Critical: hardcoded secrets
  if (
    /password\s*[:=]\s*['"][^'"]{4,}['"]/i.test(content) ||
    /api[_-]?key\s*[:=]\s*['"][^'"]{8,}['"]/i.test(content) ||
    /secret\s*[:=]\s*['"][^'"]{4,}['"]/i.test(content)
  ) {
    issues.push({
      category: "security",
      severity: "critical",
      message: "Hardcoded secret detected",
      filePath,
      lineNumber: line.lineNumber,
    });
  }

  // High: innerHTML - XSS risk
  if (/\.innerHTML\s*=/.test(content)) {
    issues.push({
      category: "security",
      severity: "high",
      message: "innerHTML assignment risks XSS",
      filePath,
      lineNumber: line.lineNumber,
    });
  }

  // High: SQL injection via string concatenation
  if (/(\$\{|\+)\s*['"]?\s*(SELECT|INSERT|DELETE|UPDATE)\b/i.test(content)) {
    issues.push({
      category: "security",
      severity: "high",
      message: "SQL built via string concat risks injection",
      filePath,
      lineNumber: line.lineNumber,
    });
  }

  // High: new Function() - similar to eval
  if (/new Function\s*\(/.test(content)) {
    issues.push({
      category: "security",
      severity: "high",
      message: "new Function() can be abused like eval",
      filePath,
      lineNumber: line.lineNumber,
    });
  }

  // High: document.write - deprecated and dangerous
  if (/document\.write\s*\(/.test(content)) {
    issues.push({
      category: "security",
      severity: "high",
      message: "document.write is unsafe and blocks parsing",
      filePath,
      lineNumber: line.lineNumber,
    });
  }
}

function checkAddedLineLogic(
  issues: AnalysisIssue[],
  line: { lineNumber: number; content: string },
  filePath: string,
  _region: ChangedFileRegion,
  lines: string[],
) {
  const content = line.content;

  // Medium: Missing error handling around async calls (high value)
  if (/^\s*(await|return)\s+\w+\([^)]*\)\s*;?$/.test(content)) {
    const start = Math.max(0, line.lineNumber - 3);
    const end = Math.min(lines.length, line.lineNumber + 2);
    const nearbyCode = lines.slice(start, end).join("\n");

    if (!/catch\s*\(/.test(nearbyCode) && !/try\s*\{/.test(nearbyCode)) {
      issues.push({
        category: "logic",
        severity: "medium",
        message: "Async call without try-catch nearby",
        filePath,
        lineNumber: line.lineNumber,
      });
    }
  }

  // Medium: Empty catch swallows errors (high value)
  if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(content)) {
    issues.push({
      category: "logic",
      severity: "medium",
      message: "Empty catch block swallows errors",
      filePath,
      lineNumber: line.lineNumber,
    });
  }
}