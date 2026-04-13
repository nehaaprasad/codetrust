import { firstLineMatching } from "./lineFind";
import type { CodeFile } from "./checks";
import type { AnalysisIssue, IssueCategory, Severity } from "./types";

export type CustomRuleRow = {
  id: string;
  name: string;
  pattern: string;
  category: string;
  severity: string;
};

const CATEGORIES: IssueCategory[] = [
  "security",
  "logic",
  "performance",
  "testing",
  "accessibility",
  "maintainability",
];

const SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];

function isCategory(s: string): s is IssueCategory {
  return CATEGORIES.includes(s as IssueCategory);
}

function isSeverity(s: string): s is Severity {
  return SEVERITIES.includes(s as Severity);
}

/** Match whole-file or per-line: regex if pattern is `/body/flags`, else substring. */
export function contentMatchesPattern(content: string, pattern: string): boolean {
  const p = pattern.trim();
  if (p.length >= 2 && p.startsWith("/")) {
    const end = p.lastIndexOf("/");
    if (end > 0) {
      const body = p.slice(1, end);
      const flags = p.slice(end + 1) || "i";
      try {
        return new RegExp(body, flags).test(content);
      } catch {
        return content.includes(p);
      }
    }
  }
  return content.includes(p);
}

/** Apply enabled custom rules; invalid category/severity are skipped. */
export function applyCustomRules(
  files: CodeFile[],
  rules: CustomRuleRow[],
): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];
  for (const rule of rules) {
    if (!isCategory(rule.category) || !isSeverity(rule.severity)) continue;
    for (const file of files) {
      if (!contentMatchesPattern(file.content, rule.pattern)) continue;
      const line = firstLineMatching(file.content, (line) =>
        contentMatchesPattern(line, rule.pattern),
      );
      issues.push({
        category: rule.category,
        severity: rule.severity,
        message: `[${rule.name}] Custom rule matched.`,
        filePath: file.path,
        lineNumber: line ?? undefined,
      });
    }
  }
  return issues;
}
