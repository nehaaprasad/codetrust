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
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const isGo = ext === "go";
  const isPy = ext === "py";

  // Critical: eval() - JS eval or Python eval (same risk class).
  if (/\beval\s*\(/.test(content)) {
    issues.push({
      category: "security",
      severity: "critical",
      message: "eval() can execute arbitrary code",
      filePath,
      lineNumber: line.lineNumber,
    });
  }

  // Go: command injection and TLS bypass on changed lines.
  if (isGo) {
    if (
      /exec\.Command\s*\(\s*"(?:sh|bash|\/bin\/sh|\/bin\/bash)"\s*,\s*"-c"/.test(content) ||
      /exec\.Command\s*\([^)]*fmt\.Sprintf\s*\(/.test(content)
    ) {
      issues.push({
        category: "security",
        severity: "critical",
        message: "exec.Command via shell or fmt.Sprintf risks command injection",
        filePath,
        lineNumber: line.lineNumber,
      });
    }
    if (/InsecureSkipVerify\s*:\s*true\b/.test(content)) {
      issues.push({
        category: "security",
        severity: "high",
        message: "InsecureSkipVerify: true disables TLS certificate verification",
        filePath,
        lineNumber: line.lineNumber,
      });
    }
  }

  // Python: common RCE / injection patterns on changed lines.
  if (isPy) {
    if (/\bshell\s*=\s*True\b/.test(content)) {
      issues.push({
        category: "security",
        severity: "critical",
        message: "subprocess shell=True enables shell injection",
        filePath,
        lineNumber: line.lineNumber,
      });
    }
    if (/\bpickle\.loads?\s*\(/.test(content)) {
      issues.push({
        category: "security",
        severity: "high",
        message: "pickle.load(s) on untrusted input allows RCE",
        filePath,
        lineNumber: line.lineNumber,
      });
    }
    if (/\byaml\.load\s*\(/.test(content) && !/SafeLoader/.test(content)) {
      issues.push({
        category: "security",
        severity: "high",
        message: "yaml.load without SafeLoader can execute arbitrary code",
        filePath,
        lineNumber: line.lineNumber,
      });
    }
    if (/\bos\.(?:system|popen)\s*\(/.test(content)) {
      issues.push({
        category: "security",
        severity: "high",
        message: "os.system/os.popen go through a shell; prefer subprocess with argv",
        filePath,
        lineNumber: line.lineNumber,
      });
    }
    if (/\bverify\s*=\s*False\b/.test(content)) {
      issues.push({
        category: "security",
        severity: "high",
        message: "verify=False disables TLS certificate verification",
        filePath,
        lineNumber: line.lineNumber,
      });
    }
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
  // Matches: 'SELECT...' + var, "SELECT..." + var, var + 'SELECT...'
  if (
    /['"][^'"]*(SELECT|INSERT|DELETE|UPDATE)[^'"]*['"]\s*\+\s*\w+/.test(content) ||
    /\w+\s*\+\s*['"][^'"]*(SELECT|INSERT|DELETE|UPDATE)[^'"]*['"]/.test(content)
  ) {
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

  // Medium: Python bare `except:` catches everything (incl. KeyboardInterrupt).
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "py" && /^\s*except\s*:\s*(?:#.*)?$/.test(content)) {
    issues.push({
      category: "logic",
      severity: "medium",
      message: "Bare `except:` catches everything; use `except Exception` or a specific type",
      filePath,
      lineNumber: line.lineNumber,
    });
  }
}