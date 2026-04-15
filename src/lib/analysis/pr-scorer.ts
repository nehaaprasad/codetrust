import type { AnalysisIssue, Decision, DimensionScores } from "./types";
import { dimensionScoresFromIssues, weightedTrustScore } from "./scoring";

export interface PrScoreResult {
  score: number;
  decision: Decision;
  dimensionScores: DimensionScores;
  isPRSpecific: boolean;
}

/**
 * Compute trust score and decision based on PR-specific issues only.
 */
export function computePrScore(issues: AnalysisIssue[]): PrScoreResult {
  // If no PR-specific issues, fall back to neutral score
  if (issues.length === 0) {
    return {
      score: 100,
      decision: "SAFE",
      dimensionScores: {
        security: 100,
        logic: 100,
        performance: 100,
        testing: 100,
        accessibility: 100,
        maintainability: 100,
      },
      isPRSpecific: false,
    };
  }

  const dimensionScores = dimensionScoresFromIssues(issues);
  const score = weightedTrustScore(dimensionScores);

  // Decision logic - more lenient for PR-specific issues
  const hasCritical = issues.some(
    (i) => i.category === "security" && i.severity === "critical"
  );
  const hasHigh = issues.some(
    (i) => i.severity === "high" || i.severity === "critical"
  );
  const hasMedium = issues.some((i) => i.severity === "medium");

  let decision: Decision;

  // Critical security always blocks
  if (hasCritical) {
    decision = "BLOCK";
  }
  // High severity issues with low score blocks
  else if (hasHigh && score < 75) {
    decision = "BLOCK";
  }
  // Medium issues or score below threshold = risky
  else if (hasMedium || score < 80) {
    decision = "RISKY";
  }
  // Otherwise safe
  else {
    decision = "SAFE";
  }

  return {
    score,
    decision,
    dimensionScores,
    isPRSpecific: true,
  };
}