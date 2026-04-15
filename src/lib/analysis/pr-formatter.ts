import type { AnalysisIssue, Decision } from "./types";

export interface PrFeedback {
  decision: Decision;
  score: number;
  summary: string;
  issues: PrIssue[];
  isPrSpecific: boolean;
}

export interface PrIssue {
  filePath: string;
  lineNumber: number | null;
  severity: string;
  message: string;
  whyItMatters: string;
  category: string;
}

/**
 * Format issues as PR-specific feedback.
 * Output is concise, actionable, and tied to the specific change.
 */
export function formatPrFeedback(
  issues: AnalysisIssue[],
  decision: Decision,
  score: number,
  isPrSpecific: boolean,
): PrFeedback {
  // Only include critical, high, and medium severity issues
  const significantIssues = issues.filter((i) =>
    ["critical", "high", "medium"].includes(i.severity)
  );

  const prIssues: PrIssue[] = significantIssues
    .filter((i) => i.filePath && i.lineNumber)
    .map((issue) => ({
      filePath: issue.filePath!,
      lineNumber: issue.lineNumber!,
      severity: issue.severity,
      message: formatMessage(issue.message, issue.category, issue.severity),
      whyItMatters: whyItMatters(issue.category, issue.severity),
      category: issue.category,
    }));

  const summary = buildPrSummary(decision, prIssues.length, isPrSpecific);

  return {
    decision,
    score,
    summary,
    issues: prIssues,
    isPrSpecific,
  };
}

function formatMessage(message: string, category: string, severity: string): string {
  // Keep messages short and direct
  if (category === "security") {
    if (severity === "critical") {
      return `Security risk: ${message}`;
    }
    return message;
  }
  if (category === "logic") {
    return message;
  }
  return message;
}

function whyItMatters(category: string, severity: string): string {
  if (category === "security") {
    if (severity === "critical") {
      return "Can be exploited in production.";
    }
    return "May lead to vulnerabilities.";
  }
  if (category === "logic") {
    if (severity === "medium") {
      return "May cause runtime errors or silent failures.";
    }
  }
  return "Could affect reliability.";
}

function buildPrSummary(
  decision: Decision,
  issueCount: number,
  isPrSpecific: boolean,
): string {
  if (!isPrSpecific || issueCount === 0) {
    return "No high-signal issues found in this PR.";
  }

  const criticalCount = 0; // Could track this

  switch (decision) {
    case "BLOCK":
      return `Block: ${issueCount} issue(s) must be fixed.`;
    case "RISKY":
      return `Risky: ${issueCount} issue(s) need review.`;
    case "SAFE":
      return `Found ${issueCount} minor issue(s).`;
    default:
      return `${issueCount} issue(s) found.`;
  }
}