import { CATEGORY_WEIGHTS, SEVERITY_PENALTY } from "./weights";
import type { AnalysisIssue, IssueCategory } from "./types";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Dimension scores 0–100, higher is better. */
export function dimensionScoresFromIssues(
  issues: AnalysisIssue[],
): Record<IssueCategory, number> {
  const dims: IssueCategory[] = [
    "security",
    "logic",
    "performance",
    "testing",
    "accessibility",
    "maintainability",
  ];
  const scores: Record<IssueCategory, number> = {
    security: 100,
    logic: 100,
    performance: 100,
    testing: 100,
    accessibility: 100,
    maintainability: 100,
  };

  for (const d of dims) {
    const relevant = issues.filter((i) => i.category === d);
    let s = 100;
    for (const issue of relevant) {
      const p = SEVERITY_PENALTY[issue.severity] ?? SEVERITY_PENALTY.medium;
      s -= p;
    }
    scores[d] = clamp(s, 0, 100);
  }

  return scores;
}

export function weightedTrustScore(
  scores: Record<IssueCategory, number>,
): number {
  let total = 0;
  for (const key of Object.keys(CATEGORY_WEIGHTS) as IssueCategory[]) {
    total += CATEGORY_WEIGHTS[key] * scores[key];
  }
  return Math.round(clamp(total, 0, 100));
}
