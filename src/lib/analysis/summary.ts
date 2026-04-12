import type { AnalysisIssue, Decision } from "./types";

export function buildSummary(
  decision: Decision,
  issues: AnalysisIssue[],
): string {
  const critical = issues.filter((i) => i.severity === "critical");
  const high = issues.filter((i) => i.severity === "high");

  if (critical.length > 0) {
    return `Critical issues found (${critical.length}). Address before shipping.`;
  }
  if (decision === "BLOCK") {
    return high.length > 0
      ? `High-severity issues remain (${high.length}). Score and risk exceed safe thresholds.`
      : "Trust score is below the safe threshold for release.";
  }
  if (decision === "RISKY") {
    return "Notable issues found; review before shipping.";
  }
  return "No blocking issues detected by automated checks.";
}
