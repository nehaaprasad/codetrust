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

export type Decision = "SAFE" | "RISKY" | "BLOCK";

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
