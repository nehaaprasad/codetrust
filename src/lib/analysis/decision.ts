import type { AnalysisIssue, Decision } from "./types";

/** Critical security overrides per blueprint. */
export function hasCriticalSecurityOverride(issues: AnalysisIssue[]): boolean {
  return issues.some(
    (i) => i.category === "security" && i.severity === "critical",
  );
}

function hasAnyCritical(issues: AnalysisIssue[]): boolean {
  return issues.some((i) => i.severity === "critical");
}

function hasAnyHigh(issues: AnalysisIssue[]): boolean {
  return issues.some((i) => i.severity === "high");
}

/**
 * Decide the verdict for an analysis.
 *
 * Order of precedence (each step can only downgrade, never upgrade):
 *
 *   1. **Any `critical` issue → BLOCK.** A critical-severity finding in any
 *      category (security, logic, etc.) is a hard stop, regardless of score.
 *      A weighted average can wash out one critical finding arithmetically,
 *      but it cannot wash it out of reality.
 *   2. **Score < 60 → BLOCK.** Extreme low score.
 *   3. **Any `high` issue → RISKY minimum.** This is the fix for the
 *      "Score 93 · SAFE · but top finding is security (high)" contradiction
 *      we were shipping. If the pipeline found a high-severity problem, the
 *      verdict must reflect that, not the score average. Senior reviewers
 *      lose trust the moment they see SAFE next to a high-sev bullet.
 *   4. **Score < 85 → RISKY.** Mid-tier score floor.
 *   5. **No issues + AI did not run → INCONCLUSIVE.** A product literally
 *      called "Code Trust" must not declare SAFE when all it did was run a
 *      small regex engine that happened not to match.
 *   6. **Otherwise → SAFE.**
 */
export function decisionFromScore(
  score: number,
  issues: AnalysisIssue[],
  opts?: { usedLlm?: boolean },
): Decision {
  if (hasAnyCritical(issues)) return "BLOCK";
  if (score < 60) return "BLOCK";
  if (hasAnyHigh(issues)) return "RISKY";
  if (score < 85) return "RISKY";
  if (issues.length === 0 && !opts?.usedLlm) return "INCONCLUSIVE";
  return "SAFE";
}
