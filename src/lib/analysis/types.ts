export const ISSUE_CATEGORIES = [
  "security",
  "logic",
  "performance",
  "testing",
  "accessibility",
  "maintainability",
] as const;

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export const SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

/**
 * The verdict returned to the user.
 *
 *   - SAFE         — passed all deterministic checks; AI pass (if run) added no
 *                    blocking issues; score ≥ 85.
 *   - RISKY        — notable issues found; reviewer attention required.
 *   - BLOCK        — critical-severity finding or score < 60.
 *   - INCONCLUSIVE — no issues found **and** the AI reasoning pass did not run
 *                    (e.g. `OPENAI_API_KEY` missing). We deliberately do NOT
 *                    return SAFE in this case: a silent pattern scan is not
 *                    the same as a reviewed PR. The UI surfaces this as a
 *                    neutral verdict that tells the user to enable AI review.
 */
export type Decision = "SAFE" | "RISKY" | "BLOCK" | "INCONCLUSIVE";

export type AnalysisIssue = {
  category: IssueCategory;
  severity: Severity;
  message: string;
  filePath?: string;
  lineNumber?: number | null;
};

export type SourceRef = {
  url?: string | null;
  title?: string | null;
  excerpt?: string | null;
  trustLevel?: string | null;
};

export type DimensionScores = Record<IssueCategory, number>;
