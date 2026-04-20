import type { AnalysisIssue, Decision } from "./types";

/** Critical security overrides per blueprint. */
export function hasCriticalSecurityOverride(issues: AnalysisIssue[]): boolean {
  return issues.some(
    (i) => i.category === "security" && i.severity === "critical",
  );
}

/**
 * Decide the verdict for an analysis.
 *
 * The ordering below is deliberate:
 *
 *   1. **Critical-severity security findings always BLOCK**, regardless of
 *      the numeric score. A single eval() / SQLi / shell-exec is not
 *      something the weighted average can wash out.
 *   2. A raw score below 60 is **BLOCK**; below 85 is **RISKY**.
 *   3. At SAFE thresholds, we split further:
 *        - If we found zero issues **and** the AI reasoning pass did not
 *          run, we return **INCONCLUSIVE** instead of SAFE. A product
 *          called "Code Trust" must not claim a PR is safe when all it
 *          did was run a small regex engine that happened not to match.
 *        - Otherwise (issues were found and fixed, or AI reviewed and
 *          signed off) we return SAFE.
 */
export function decisionFromScore(
  score: number,
  issues: AnalysisIssue[],
  opts?: { usedLlm?: boolean },
): Decision {
  if (hasCriticalSecurityOverride(issues)) return "BLOCK";
  if (score < 60) return "BLOCK";
  if (score < 85) return "RISKY";
  if (issues.length === 0 && !opts?.usedLlm) return "INCONCLUSIVE";
  return "SAFE";
}
