import type { AnalysisIssue, Decision } from "./types";

/** Critical security overrides per blueprint. */
export function hasCriticalSecurityOverride(issues: AnalysisIssue[]): boolean {
  return issues.some(
    (i) => i.category === "security" && i.severity === "critical",
  );
}

export function decisionFromScore(
  score: number,
  issues: AnalysisIssue[],
): Decision {
  if (hasCriticalSecurityOverride(issues)) return "BLOCK";
  if (score < 60) return "BLOCK";
  if (score < 85) return "RISKY";
  return "SAFE";
}
