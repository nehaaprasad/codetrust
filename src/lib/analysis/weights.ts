import type { IssueCategory } from "./types";

/** Per blueprint: weights sum to 1.0 */
export const CATEGORY_WEIGHTS: Record<IssueCategory, number> = {
  security: 0.3,
  logic: 0.25,
  performance: 0.15,
  testing: 0.15,
  accessibility: 0.1,
  maintainability: 0.05,
};

/** Penalty points subtracted from dimension score (starts at 100). */
export const SEVERITY_PENALTY: Record<string, number> = {
  low: 2,
  medium: 5,
  high: 12,
  critical: 40,
};
