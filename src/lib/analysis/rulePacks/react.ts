import { firstLineForRegex } from "../lineFind";
import type { AnalysisIssue } from "../types";

type File = { path: string; content: string };

/**
 * React rule pack.
 *
 * Narrow, high-signal rules only. Each rule targets a pattern that
 * senior reviewers flag by hand, and that a generic JS linter will
 * miss.
 */

function isReactFile(path: string): boolean {
  return /\.(tsx|jsx)$/.test(path);
}

/**
 * Rule: `key={index}` inside `.map(...)`.
 *
 * Using the array index as React's key is the single most common cause
 * of "why is my list re-rendering wrong after a delete/reorder?" bugs —
 * React reuses components across indices, so local state and
 * uncontrolled inputs stick to the wrong row. We match the most common
 * index-variable names (`i`, `idx`, `index`, leading underscore
 * variants) so we don't fire on `key={item.id}`.
 */
function ruleKeyEqualsIndex(file: File): AnalysisIssue | null {
  const { path, content } = file;
  if (!isReactFile(path)) return null;
  if (!/\.map\s*\(/.test(content)) return null;
  const re = /key\s*=\s*\{\s*(?:_?i|_?idx|_?index)\s*\}/;
  if (!re.test(content)) return null;
  const line = firstLineForRegex(content, re);
  return {
    category: "logic",
    severity: "medium",
    message:
      "Using the array index as a React `key` causes subtle bugs on reorder/insert/delete — prefer a stable id from the data (`item.id`).",
    filePath: path,
    lineNumber: line ?? undefined,
  };
}

/**
 * Rule: `useState(new SomeClass())` / `useState(expensiveFn())`.
 *
 * The argument to `useState` is evaluated on *every* render, not just
 * the first. `useState(new Date())` allocates a Date each render; only
 * the first one is kept, the rest are garbage. The fix is the lazy form
 * `useState(() => new Date())`.
 *
 * We only flag `new <Identifier>(...)` — using a plain function call
 * like `useState(compute())` is too broad (many are trivial literals).
 */
function ruleUseStateNewInstance(file: File): AnalysisIssue | null {
  const { path, content } = file;
  if (!isReactFile(path) && !/\.(ts|js|mjs)$/.test(path)) return null;
  const re = /useState\s*\(\s*new\s+[A-Z]\w*\s*\(/;
  if (!re.test(content)) return null;
  const line = firstLineForRegex(content, re);
  return {
    category: "performance",
    severity: "low",
    message:
      "`useState(new Foo(...))` re-allocates on every render — use the lazy form `useState(() => new Foo(...))`.",
    filePath: path,
    lineNumber: line ?? undefined,
  };
}

/**
 * Rule: direct state mutation pattern.
 *
 * `state.foo = bar` where `state` came from `useState` does nothing —
 * React compares references, so mutation is invisible. Too hard to
 * track `useState` identifiers with regex reliably, so we don't ship
 * this rule; mentioned here so a future AST-based pass can include it.
 */

export function runReactRules(file: File): AnalysisIssue[] {
  const out: AnalysisIssue[] = [];
  const rules = [ruleKeyEqualsIndex, ruleUseStateNewInstance] as const;
  for (const rule of rules) {
    const i = rule(file);
    if (i) out.push(i);
  }
  return out;
}

export const __testing = {
  ruleKeyEqualsIndex,
  ruleUseStateNewInstance,
};
