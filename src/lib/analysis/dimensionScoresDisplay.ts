import { CATEGORY_WEIGHTS } from "./weights";
import type { IssueCategory } from "./types";

const ORDER: IssueCategory[] = [
  "security",
  "logic",
  "performance",
  "testing",
  "accessibility",
  "maintainability",
];

const LABELS: Record<IssueCategory, string> = {
  security: "Security",
  logic: "Logic",
  performance: "Performance",
  testing: "Testing",
  accessibility: "Accessibility",
  maintainability: "Maintainability",
};

export function parseStoredDimensionScores(
  raw: unknown,
): Record<string, number> | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "number" && Number.isFinite(v)) {
      out[k] = Math.round(v * 10) / 10;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function dimensionRowsForDisplay(
  scores: Record<string, number> | null | undefined,
): { key: string; label: string; score: number; weightPct: number }[] {
  if (!scores) return [];
  return ORDER.filter((k) => k in scores && typeof scores[k] === "number").map(
    (k) => ({
      key: k,
      label: LABELS[k],
      score: scores[k]!,
      weightPct: Math.round(CATEGORY_WEIGHTS[k] * 100),
    }),
  );
}
