import type { AnalysisIssue } from "./types";

/**
 * Canonical key + message normaliser for analysis issues.
 *
 * The deterministic rule engine and the LLM both produce issues that
 * often differ only in numeric details ("line 76 exposes …", "line
 * 88 exposes …", "(626 lines)" vs "(482 lines)"). Those are really
 * one finding repeated, and the UI — both the summary PR comment and
 * the inline review comments — should collapse them into a single
 * group rather than spamming near-identical messages.
 *
 * `normaliseIssueMessage` strips:
 *   - any `(N …)` parenthetical whose first token is a number
 *   - line-number phrasing: `line 76`, `at line 76`, `on line 76`
 *   - collapse multiple adjacent spaces
 *
 * `issueGroupKey` is the canonical key — messages are grouped when
 * `(category, severity, normalisedMessage)` matches.
 */

export function normaliseIssueMessage(msg: string): string {
  return msg
    .trim()
    .replace(/\s*\(\s*\d+[^)]*\)/g, "")
    .replace(/\b(?:at |on )?line\s+\d+\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}

export function issueGroupKey(issue: AnalysisIssue): string {
  return `${issue.category}|${issue.severity}|${normaliseIssueMessage(issue.message)}`;
}
