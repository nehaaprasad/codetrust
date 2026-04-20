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
  if (decision === "INCONCLUSIVE") {
    return (
      "Pattern rules found no issues, but the AI reasoning pass did not run — " +
      "this result is not a confident pass. Enable OpenAI (set OPENAI_API_KEY) " +
      "for a trustworthy verdict, or have a human review the changes."
    );
  }
  return "No blocking issues detected by automated checks.";
}
