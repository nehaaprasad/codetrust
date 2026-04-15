# PR-Aware Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement PR-scoped code analysis that gives context-specific feedback tied to actual changes, not broad file-level advice.

**Architecture:** Extend the existing analysis pipeline with diff-aware processing. The flow will be: fetch PR diff → extract changed lines → load surrounding context → run targeted checks → filter/generate PR-specific issues → compute score → format feedback.

**Tech Stack:** TypeScript, GitHub API (Octokit), existing analysis pipeline (checks.ts, llmEnrich.ts)

---

## File Structure

```
src/lib/analysis/
├── diff-parser.ts        (new) - Parse PR diff, extract changed line ranges
├── context-loader.ts    (new) - Fetch surrounding code context around changes
├── pr-checks.ts         (new) - Run checks only on changed code regions
├── pr-scorer.ts         (new) - Compute trust score from PR-specific issues
├── pr-formatter.ts      (new) - Format issues as PR-specific feedback
└── run.ts               (modify) - Integrate PR-aware analysis into pipeline

src/lib/github/
└── diff.ts              (enhance) - Add method to fetch raw diff from PR
```

---

## Task 1: Parse PR Diff into Changed Line Ranges

**Files:**
- Create: `src/lib/analysis/diff-parser.ts`
- Test: `src/lib/analysis/__tests__/diff-parser.test.ts`

- [ ] **Step 1: Create the failing test**

```typescript
// src/lib/analysis/__tests__/diff-parser.test.ts
import { extractChangedLines, type ChangedFileRegion } from "../diff-parser";

describe("extractChangedLines", () => {
  it("extracts added lines from diff", () => {
    const diff = `--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +1,4 @@
 const x = 1;
+const y = 2;
 const z = 3;`;

    const result = extractChangedLines(diff);
    expect(result.files["src/index.ts"]).toEqual([
      { type: "added", lineNumber: 2, content: "const y = 2;" },
    ]);
  });

  it("extracts deleted lines from diff", () => {
    const diff = `--- a/src/index.ts
+++ b/src/index.ts
@@ -1,3 +2,2 @@
 const x = 1;
-const removed = 0;
 const z = 3;`;

    const result = extractChangedLines(diff);
    expect(result.files["src/index.ts"]).toContainEqual({
      type: "deleted",
      lineNumber: 2,
      content: "const removed = 0;",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/analysis/__tests__/diff-parser.test.ts`
Expected: FAIL - module not found

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/analysis/diff-parser.ts
import { parseDiff, type DiffFile, type DiffLine } from "@/lib/github/diff";

export interface ChangedLine {
  type: "added" | "deleted";
  lineNumber: number;
  content: string;
}

export interface ChangedFileRegion {
  filePath: string;
  addedLines: ChangedLine[];
  deletedLines: ChangedLine[];
  addedRanges: Array<{ start: number; end: number }>;
  deletedRanges: Array<{ start: number; end: number }>;
}

/**
 * Extract changed line information from a unified diff string.
 */
export function extractChangedLines(diffOutput: string): {
  files: Record<string, ChangedFileRegion>;
  totalChangedFiles: number;
} {
  const parsed = parseDiff(diffOutput);
  const files: Record<string, ChangedFileRegion> = {};

  for (const file of parsed.files) {
    const addedLines: ChangedLine[] = [];
    const deletedLines: ChangedLine[] = [];
    const addedRanges: Array<{ start: number; end: number }> = [];
    const deletedRanges: Array<{ start: number; end: number }> = [];

    let currentAddedStart: number | null = null;
    let currentDeletedStart: number | null = null;

    for (const hunk of file.hunks) {
      for (const line of hunk.lines) {
        if (line.type === "added" && line.newLineNum !== null) {
          if (currentAddedStart === null) {
            currentAddedStart = line.newLineNum;
          }
          addedLines.push({
            type: "added",
            lineNumber: line.newLineNum,
            content: line.content,
          });
        } else if (line.type === "deleted" && line.oldLineNum !== null) {
          if (currentDeletedStart === null) {
            currentDeletedStart = line.oldLineNum;
          }
          deletedLines.push({
            type: "deleted",
            lineNumber: line.oldLineNum,
            content: line.content,
          });
        } else {
          // Context line - close any open ranges
          if (currentAddedStart !== null) {
            const lastAdded = addedLines[addedLines.length - 1];
            addedRanges.push({ start: currentAddedStart, end: lastAdded.lineNumber });
            currentAddedStart = null;
          }
          if (currentDeletedStart !== null) {
            const lastDeleted = deletedLines[deletedLines.length - 1];
            deletedRanges.push({ start: currentDeletedStart, end: lastDeleted.lineNumber });
            currentDeletedStart = null;
          }
        }
      }
    }

    // Close any remaining open ranges
    if (currentAddedStart !== null && addedLines.length > 0) {
      addedRanges.push({ start: currentAddedStart, end: addedLines[addedLines.length - 1].lineNumber });
    }
    if (currentDeletedStart !== null && deletedLines.length > 0) {
      deletedRanges.push({ start: currentDeletedStart, end: deletedLines[deletedLines.length - 1].lineNumber });
    }

    files[file.path] = {
      filePath: file.path,
      addedLines,
      deletedLines,
      addedRanges,
      deletedRanges,
    };
  }

  return {
    files,
    totalChangedFiles: Object.keys(files).length,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/analysis/__tests__/diff-parser.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/analysis/diff-parser.ts src/lib/analysis/__tests__/diff-parser.test.ts
git commit -m "feat: add diff-parser to extract changed lines from PR diff"
```

---

## Task 2: Context Loader - Fetch Surrounding Code

**Files:**
- Create: `src/lib/analysis/context-loader.ts`
- Modify: `src/lib/github/diff.ts` (add fetchRawDiff method)

- [ ] **Step 1: Write the implementation**

```typescript
// src/lib/analysis/context-loader.ts
import { Octokit } from "@octokit/rest";
import { parseGithubPrUrl } from "@/lib/github/parsePrUrl";

const CONTEXT_LINES = 5; // Lines before/after changed region

export interface CodeContext {
  filePath: string;
  before: string;      // Lines before changed region
  changed: string;     // The changed lines themselves
  after: string;       // Lines after changed region
  lineRange: { start: number; end: number };
}

/**
 * Load surrounding code context around changed lines for a PR.
 */
export async function loadPrContext(
  prUrl: string,
  token: string,
  changedFiles: Record<string, { addedRanges: Array<{ start: number; end: number }>; deletedRanges: Array<{ start: number; end: number }> }>,
): Promise<CodeContext[]> {
  const parsed = parseGithubPrUrl(prUrl);
  if (!parsed) throw new Error("Invalid PR URL");

  const octokit = new Octokit({ auth: token });
  const { owner, repo, pull_number } = parsed;

  // Get the PR head commit
  const { data: pr } = await octokit.pulls.get({ owner, repo, pull_number });
  const headSha = pr.head.sha;

  const contexts: CodeContext[] = [];

  for (const [filePath, ranges] of Object.entries(changedFiles)) {
    try {
      const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
        ref: headSha,
      });

      if (Array.isArray(data) || data.type !== "file" || !("content" in data)) continue;

      const content = Buffer.from(data.content, "base64").toString("utf8");
      const lines = content.split("\n");

      // Combine added and deleted ranges
      const allRanges = [...ranges.addedRanges, ...ranges.deletedRanges].sort(
        (a, b) => a.start - b.start,
      );

      for (const range of allRanges) {
        const start = Math.max(1, range.start - CONTEXT_LINES);
        const end = Math.min(lines.length, range.end + CONTEXT_LINES);

        const before = lines.slice(start - 1, range.start - 1).join("\n");
        const changed = lines.slice(range.start - 1, range.end).join("\n");
        const after = lines.slice(range.end, end).join("\n");

        contexts.push({
          filePath,
          before,
          changed,
          after,
          lineRange: { start: range.start, end: range.end },
        });
      }
    } catch {
      // File might be new or binary - skip
    }
  }

  return contexts;
}
```

- [ ] **Step 2: Add helper to fetch raw diff**

Add to `src/lib/github/diff.ts`:

```typescript
import { Octokit } from "@octokit/rest";
import { parseGithubPrUrl } from "./parsePrUrl";

/**
 * Fetch the raw unified diff for a PR.
 */
export async function fetchRawPrDiff(prUrl: string, token: string): Promise<string> {
  const parsed = parseGithubPrUrl(prUrl);
  if (!parsed) throw new Error("Invalid PR URL");

  const octokit = new Octokit({ auth: token });
  const { owner, repo, pull_number } = parsed;

  const { data } = await octokit.pulls.get({
    owner,
    repo,
    pull_number,
    mediaType: { format: "diff" },
  });

  return typeof data === "string" ? data : "";
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/analysis/context-loader.ts src/lib/github/diff.ts
git commit -m "feat: add context-loader for fetching surrounding code around PR changes"
```

---

## Task 3: PR-Specific Checks

**Files:**
- Create: `src/lib/analysis/pr-checks.ts`
- Modify: `src/lib/analysis/checks.ts` (add file path filter)

- [ ] **Step 1: Write the implementation**

```typescript
// src/lib/analysis/pr-checks.ts
import type { CodeFile } from "./checks";
import type { AnalysisIssue } from "./types";
import type { ChangedFileRegion } from "./diff-parser";

/**
 * Run checks only on changed code regions, with surrounding context.
 */
export function runPrChecks(
  files: CodeFile[],
  changedRegions: Record<string, ChangedFileRegion>,
): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];

  for (const file of files) {
    const region = changedRegions[file.path];
    if (!region) continue;

    const content = file.content;
    const lines = content.split("\n");

    // Security: Check added lines for dangerous patterns
    for (const added of region.addedLines) {
      checkAddedLineSecurity(issues, added, file.path, lines);
    }

    // Logic: Check added lines for error handling gaps
    for (const added of region.addedLines) {
      checkAddedLineLogic(issues, added, file.path, region, lines);
    }

    // Testing: Flag new code paths without tests
    for (const added of region.addedLines) {
      checkTestingCoverage(issues, added, file.path, region, lines);
    }
  }

  // Filter out issues that are too general (not PR-specific)
  return filterToPrSpecific(issues);
}

function checkAddedLineSecurity(
  issues: AnalysisIssue[],
  line: { lineNumber: number; content: string },
  filePath: string,
  lines: string[],
) {
  const content = line.content;

  // Check for eval in new code
  if (/eval\s*\(/.test(content)) {
    issues.push({
      category: "security",
      severity: "critical",
      message: `This change introduces eval() which can execute arbitrary code.`,
      filePath,
      lineNumber: line.lineNumber,
    });
  }

  // Check for innerHTML assignment in new code
  if (/\.innerHTML\s*=/.test(content)) {
    issues.push({
      category: "security",
      severity: "high",
      message: `This change assigns to innerHTML which may cause XSS if user input is included.`,
      filePath,
      lineNumber: line.lineNumber,
    });
  }

  // Check for hardcoded secrets in new lines
  if (/password\s*[:=]\s*['"][^'"]{4,}['"]/i.test(content) ||
      /api[_-]?key\s*[:=]\s*['"][^'"]{8,}['"]/i.test(content)) {
    issues.push({
      category: "security",
      severity: "critical",
      message: `This change appears to hardcode a secret value.`,
      filePath,
      lineNumber: line.lineNumber,
    });
  }

  // Check for SQL injection risk in new code
  if (/(\$\{|\+)\s*['"]?\s*(SELECT|INSERT|DELETE|UPDATE)\b/i.test(content)) {
    issues.push({
      category: "security",
      severity: "high",
      message: `This change builds SQL via string concatenation which risks injection.`,
      filePath,
      lineNumber: line.lineNumber,
    });
  }
}

function checkAddedLineLogic(
  issues: AnalysisIssue[],
  line: { lineNumber: number; content: string },
  filePath: string,
  region: ChangedFileRegion,
  lines: string[],
) {
  const content = line.content;

  // Check for missing error handling around new function calls
  if (/^\s*(await|return)\s+\w+\(/.test(content)) {
    // Check if there's try-catch nearby
    const nearbyCode = lines.slice(
      Math.max(0, line.lineNumber - 3),
      Math.min(lines.length, line.lineNumber + 2),
    ).join("\n");

    if (!/catch\s*\(/.test(nearbyCode) && !/try\s*\{/.test(nearbyCode)) {
      issues.push({
        category: "logic",
        severity: "medium",
        message: `This new async call may need error handling.`,
        filePath,
        lineNumber: line.lineNumber,
      });
    }
  }

  // Check for potential null/undefined access
  if (/\[\s*\]|\.\w+/.test(content) && !/\?\./.test(content)) {
    issues.push({
      category: "logic",
      severity: "low",
      message: `This code may benefit from null-safety checks (?. or ??).`,
      filePath,
      lineNumber: line.lineNumber,
    });
  }
}

function checkTestingCoverage(
  issues: AnalysisIssue[],
  line: { lineNumber: number; content: string },
  filePath: string,
  region: ChangedFileRegion,
  _lines: string[],
) {
  const content = line.content;

  // Flag new function definitions that might need tests
  if (/^export\s+(async\s+)?function|^export\s+(async\s+)?const\s+\w+\s*=/.test(content)) {
    issues.push({
      category: "testing",
      severity: "low",
      message: `This new function export may need a test.`,
      filePath,
      lineNumber: line.lineNumber,
    });
  }
}

function filterToPrSpecific(issues: AnalysisIssue[]): AnalysisIssue[] {
  // Filter out generic file-level issues
  const generalPatterns = [
    /split this file/i,
    /refactor this file/i,
    /file is very long/i,
    /consider splitting/i,
  ];

  return issues.filter((issue) => {
    // Keep issues with line numbers (PR-specific)
    if (issue.lineNumber) return true;

    // Filter out general messages
    return !generalPatterns.some((pattern) => pattern.test(issue.message));
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/analysis/pr-checks.ts
git commit -m "feat: add pr-checks for targeted analysis on changed code regions"
```

---

## Task 4: PR-Aware Scoring

**Files:**
- Create: `src/lib/analysis/pr-scorer.ts`
- Modify: `src/lib/analysis/scoring.ts`

- [ ] **Step 1: Write the implementation**

```typescript
// src/lib/analysis/pr-scorer.ts
import type { AnalysisIssue, Decision } from "./types";
import { dimensionScoresFromIssues, weightedTrustScore, type DimensionScores } from "./scoring";

/**
 * Compute trust score and decision based on PR-specific issues only.
 */
export function computePrScore(issues: AnalysisIssue[]): {
  score: number;
  decision: Decision;
  dimensionScores: DimensionScores;
  isPRSpecific: boolean;
} {
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
  const hasCritical = issues.some((i) => i.category === "security" && i.severity === "critical");
  const hasHigh = issues.some((i) => i.severity === "high" || i.severity === "critical");

  let decision: Decision;
  if (hasCritical) {
    decision = "BLOCK";
  } else if (score < 50 || (hasHigh && score < 75)) {
    decision = "RISKY";
  } else if (score < 80) {
    decision = "RISKY";
  } else {
    decision = "SAFE";
  }

  return {
    score,
    decision,
    dimensionScores,
    isPRSpecific: true,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/analysis/pr-scorer.ts
git commit -m "feat: add pr-scorer for computing trust score from PR-specific issues"
```

---

## Task 5: PR-Aware Formatter

**Files:**
- Create: `src/lib/analysis/pr-formatter.ts`

- [ ] **Step 1: Write the implementation**

```typescript
// src/lib/analysis/pr-formatter.ts
import type { AnalysisIssue, Decision } from "./types";

export interface PrFeedback {
  decision: Decision;
  score: number;
  summary: string;
  issues: PrIssue[];
  isPrSpecific: boolean;
}

export interface PrIssue {
  filePath: string;
  lineNumber: number | null;
  severity: string;
  message: string;
  whyItMatters: string;
  category: string;
}

/**
 * Format issues as PR-specific feedback with "why it matters" context.
 */
export function formatPrFeedback(
  issues: AnalysisIssue[],
  decision: Decision,
  score: number,
  isPrSpecific: boolean,
): PrFeedback {
  const prIssues: PrIssue[] = issues
    .filter((i) => i.filePath && i.lineNumber)
    .map((issue) => ({
      filePath: issue.filePath!,
      lineNumber: issue.lineNumber!,
      severity: issue.severity,
      message: makePrSpecificMessage(issue.message, issue.category),
      whyItMatters: generateWhyItMatters(issue),
      category: issue.category,
    }));

  const summary = buildPrSummary(decision, prIssues.length, isPrSpecific);

  return {
    decision,
    score,
    summary,
    issues: prIssues,
    isPrSpecific,
  };
}

function makePrSpecificMessage(originalMessage: string, category: string): string {
  // Transform generic messages to PR-specific ones
  const prefixes: Record<string, string> = {
    security: "This change introduces",
    logic: "This added logic may cause",
    performance: "This new code path may impact",
    testing: "This new code should be tested",
    accessibility: "This change affects",
    maintainability: "This modification may reduce",
  };

  const prefix = prefixes[category] || "This change";
  const baseMessage = originalMessage
    .replace(/^Use of /i, "")
    .replace(/^Possible /i, "")
    .replace(/\.$/, "");

  return `${prefix} ${baseMessage.toLowerCase()}.`;
}

function generateWhyItMatters(issue: AnalysisIssue): string {
  const explanations: Record<string, Record<string, string>> = {
    security: {
      critical: "This could allow attackers to compromise the application or leak sensitive data.",
      high: "This could be exploited in production and lead to security vulnerabilities.",
      medium: "This may become a security risk as the codebase evolves.",
    },
    logic: {
      high: "This could cause runtime errors or unexpected behavior for users.",
      medium: "This may lead to bugs that are difficult to diagnose.",
      low: "This could confuse future maintainers.",
    },
    testing: {
      medium: "Without tests, regressions may go unnoticed until production.",
      low: "Tests help ensure this code behaves correctly over time.",
    },
  };

  const categoryExplanations = explanations[issue.category];
  if (categoryExplanations) {
    return categoryExplanations[issue.severity] || categoryExplanations.low || "";
  }
  return "This affects code quality and maintainability.";
}

function buildPrSummary(decision: Decision, issueCount: number, isPrSpecific: boolean): string {
  if (!isPrSpecific) {
    return "No PR-specific issues found. The changes look good.";
  }

  if (issueCount === 0) {
    return "No issues detected in the changed code.";
  }

  switch (decision) {
    case "BLOCK":
      return `Found ${issueCount} issue(s) that should be addressed before merging.`;
    case "RISKY":
      return `Found ${issueCount} notable issue(s) in this PR - review recommended.`;
    case "SAFE":
      return `Found ${issueCount} minor suggestion(s) - not blocking.`;
    default:
      return `Analyzed ${issueCount} issue(s) in this PR.`;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/analysis/pr-formatter.ts
git commit -m "feat: add pr-formatter for PR-specific feedback output"
```

---

## Task 6: Integrate PR-Aware Analysis into Pipeline

**Files:**
- Modify: `src/lib/analysis/run.ts`

- [ ] **Step 1: Modify run.ts to support PR-aware mode**

```typescript
// Add new import
import { extractChangedLines } from "./diff-parser";
import { loadPrContext } from "./context-loader";
import { runPrChecks } from "./pr-checks";
import { computePrScore } from "./pr-scorer";
import { formatPrFeedback } from "./pr-formatter";

// Add new export type
export type PrAnalysisResult = {
  modelVersion: string;
  score: number;
  decision: Decision;
  summary: string;
  issues: AnalysisIssue[];
  sources: SourceRef[];
  dimensionScores: ReturnType<typeof dimensionScoresFromIssues>;
  prFeedback?: {
    decision: Decision;
    score: number;
    summary: string;
    issues: Array<{
      filePath: string;
      lineNumber: number | null;
      severity: string;
      message: string;
      whyItMatters: string;
      category: string;
    }>;
    isPrSpecific: boolean;
  };
};

// Modify analyzeFiles to accept optional diff
export async function analyzeFiles(
  files: CodeFile[],
  options?: {
    workspaceId?: string | null;
    prUrl?: string;
    prDiff?: string;
  },
): Promise<AnalysisResult | PrAnalysisResult> {
  // ... existing code ...

  // If PR diff provided, run PR-aware analysis
  if (options?.prDiff && options?.prUrl) {
    const changedRegions = extractChangedLines(options.prDiff);
    const prIssues = runPrChecks(files, changedRegions.files);

    if (prIssues.length > 0) {
      const { score, decision, dimensionScores, isPRSpecific } = computePrScore(prIssues);
      const prFeedback = formatPrFeedback(prIssues, decision, score, isPRSpecific);

      // Merge with existing issues but prioritize PR-specific
      const mergedWithPr = mergeIssues(merged, prIssues);
      const finalScore = weightedTrustScore(dimensionScoresFromIssues(mergedWithPr));
      const finalDecision = decisionFromScore(finalScore, mergedWithPr);

      return {
        modelVersion: usedLlm ? "deterministic+openai-v1" : "deterministic-v1",
        score: finalScore,
        decision: finalDecision,
        summary: buildSummary(finalDecision, mergedWithPr),
        issues: mergedWithPr,
        sources,
        dimensionScores: dimensionScoresFromIssues(mergedWithPr),
        prFeedback,
      };
    }
  }

  // ... rest of existing code ...
}
```

- [ ] **Step 2: Update resolveAnalyzeInput to pass diff**

In `src/lib/analysis/resolveAnalyzeInput.ts`, add:

```typescript
// After fetching PR files, also fetch the diff
import { fetchRawPrDiff } from "@/lib/github/diff";

// In the PR branch:
const prDiff = await fetchRawPrDiff(url, token);

// Return in prepared input
return {
  files: pr.files,
  stored: { kind: "pr", prUrl: url },
  projectId,
  parsedPr: parsed,
  workspaceId: body.workspaceId ?? null,
  prDiff, // Add this
};
```

- [ ] **Step 3: Update processAnalyzeJob to pass diff**

In `src/lib/queue/processAnalyzeJob.ts`:

```typescript
// Pass the diff to analyzeFiles
return runPreparedAnalyze(prepared, job, {
  userId: job.data.userId ?? null,
  apiKeyId: job.data.apiKeyId ?? null,
  prUrl: prepared.prUrl,
  prDiff: prepared.prDiff,
});
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/analysis/run.ts src/lib/analysis/resolveAnalyzeInput.ts src/lib/queue/processAnalyzeJob.ts
git commit -m "feat: integrate PR-aware analysis into main pipeline"
```

---

## Summary

This implementation adds PR-specific analysis that:

1. **Extracts changed lines** from the PR diff using `diff-parser.ts`
2. **Loads surrounding context** via `context-loader.ts` (5 lines before/after)
3. **Runs targeted checks** on only the changed code regions in `pr-checks.ts`
4. **Computes a separate score** for PR-specific issues in `pr-scorer.ts`
5. **Formats feedback** as "This change introduces..." in `pr-formatter.ts`
6. **Integrates seamlessly** into the existing pipeline without rewriting

The result is feedback that sounds like:
- "This change introduces a missing validation in this PR"
- "This added logic may cause an edge case"
- "This new code path should be tested"

Instead of:
- "This whole file should be refactored"