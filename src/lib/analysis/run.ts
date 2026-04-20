import { applyCustomRules } from "./customRulesApply";
import { loadEnabledCustomRules } from "./customRulesDb";
import { runDeterministicChecks, type CodeFile } from "./checks";
import { decisionFromScore } from "./decision";
import { fetchLlmReview, mergeIssues } from "./llmEnrich";
import { buildSummary } from "./summary";
import {
  dimensionScoresFromIssues,
  weightedTrustScore,
} from "./scoring";
import { extractChangedLines, type ChangedFileRegion } from "./diff-parser";
import { isSourceFile, isTestFile } from "./fileClassification";
import { runPrChecks } from "./pr-checks";
import { computePrScore } from "./pr-scorer";
import { formatPrFeedback, type PrFeedback } from "./pr-formatter";
import type { AnalysisIssue, Decision, SourceRef } from "./types";

export type AnalysisResult = {
  modelVersion: string;
  score: number;
  decision: Decision;
  summary: string;
  issues: AnalysisIssue[];
  sources: SourceRef[];
  dimensionScores: ReturnType<typeof dimensionScoresFromIssues>;
  prFeedback?: PrFeedback;
};

/**
 * Filter issues down to what is actually attributable to this PR.
 *
 * This function has been through two previous contracts, each of which
 * produced a specific failure mode in production:
 *
 *   v1 — strict ±5 line window. Dropped every project-level finding and
 *        most file-level findings, producing "Score 100 / SAFE" verdicts
 *        on real PRs. Rejected.
 *   v2 — any-issue-in-any-touched-file. Fixed v1 but swung too far the
 *        other way: a rename refactor that touched a 626-line file
 *        triggered "File is very long" and "Infinite while(true) loop"
 *        findings on code the PR never authored. Human-approved rename
 *        PRs were being auto-BLOCKed because of tutorial example API
 *        keys in unrelated `.mdx` files the PR happened to edit. Also
 *        rejected — this is what senior reviewers lose trust over.
 *
 * v3 (this) — diff-scoped line attribution:
 *
 *   - Issues with **no filePath** are project-level. Always kept. These
 *     describe the PR as a whole (e.g. "PR adds source but no tests").
 *
 *   - Issues with a filePath whose file is **not in this PR** are dropped.
 *     A reviewer is not responsible for sibling files.
 *
 *   - Issues with a filePath but **no lineNumber** (or lineNumber === null)
 *     are file-level findings about a file that IS in the PR. Kept as-is.
 *     Example: "No test file exists alongside foo.ts".
 *
 *   - Issues with a filePath AND a lineNumber are per-line findings.
 *     These are kept **only if the reported line was added or modified
 *     by this PR** (i.e. appears in `addedLines`). A pre-existing
 *     while(true) at line 42 of a file the PR only renamed on line 300
 *     is not this PR's problem, and attributing it to the author
 *     destroys trust in every subsequent finding.
 *
 * The net effect: a pure rename refactor produces a near-empty comment
 * (correct), a new-file PR surfaces every issue in the new file
 * (correct, since every line is in addedLines), and a targeted bugfix
 * surfaces issues around the fix's lines (correct).
 */
function filterToPrRelated(
  issues: AnalysisIssue[],
  changedRegions: Record<string, ChangedFileRegion>,
): AnalysisIssue[] {
  if (Object.keys(changedRegions).length === 0) {
    return issues;
  }

  // Per-file lookup of which line numbers were added/modified. Built once
  // up front so we're not rebuilding a Set per issue.
  const addedLinesByFile = new Map<string, Set<number>>();
  for (const [path, region] of Object.entries(changedRegions)) {
    addedLinesByFile.set(
      path,
      new Set(region.addedLines.map((l) => l.lineNumber)),
    );
  }

  return issues.filter((issue) => {
    if (!issue.filePath) return true;

    const addedLines = addedLinesByFile.get(issue.filePath);
    if (!addedLines) return false;

    if (issue.lineNumber == null) return true;

    return addedLines.has(issue.lineNumber);
  });
}

/**
 * If the PR changed real source files but did not change any test file,
 * append a single `testing`-category medium issue so the testing dimension
 * can no longer score 100. This is surfaced as a real issue (not a hidden
 * cap) so reviewers understand why the score is lower.
 *
 * Deduped against any `testing` issue we already emitted from the file-level
 * "No test files detected" rule so we don't double-penalise.
 */
function augmentWithTestingFloor(
  issues: AnalysisIssue[],
  changedRegions: Record<string, ChangedFileRegion>,
): AnalysisIssue[] {
  const changedPaths = Object.keys(changedRegions);
  if (changedPaths.length === 0) return issues;

  const changedSource = changedPaths.filter(isSourceFile);
  const changedTests = changedPaths.filter(isTestFile);
  if (changedSource.length === 0 || changedTests.length > 0) return issues;

  const alreadyHasTestingSignal = issues.some(
    (i) => i.category === "testing" && i.severity !== "low",
  );
  if (alreadyHasTestingSignal) return issues;

  return [
    ...issues,
    {
      category: "testing",
      severity: "medium",
      message:
        changedSource.length === 1
          ? "PR modifies source but adds or updates no tests — add a test that exercises the new behaviour."
          : `PR modifies ${changedSource.length} source files but adds or updates no tests — add tests for the new behaviour.`,
      filePath: changedSource[0],
      lineNumber: null,
    },
  ];
}

export async function analyzeFiles(
  files: CodeFile[],
  options?: { workspaceId?: string | null; prDiff?: string },
): Promise<AnalysisResult> {
  const customRules = await loadEnabledCustomRules(options?.workspaceId);
  const customIssues = applyCustomRules(files, customRules);
  const deterministic = runDeterministicChecks(files);
  let merged = mergeIssues(deterministic, customIssues);
  let summaryNote: string | undefined;
  let usedLlm = false;

  const llm = await fetchLlmReview(files);
  let llmProvider = "openai";
  if (llm) {
    merged = mergeIssues(merged, llm.issues);
    if (llm.summaryNote?.trim()) summaryNote = llm.summaryNote;
    usedLlm = true;
    llmProvider = llm.provider;
  }

  // PR-aware analysis: run targeted checks on changed lines
  let prFeedback: PrFeedback | undefined;
  let prFilteredIssues = merged;
  let changedRegions: Record<string, ChangedFileRegion> = {};

  if (options?.prDiff) {
    changedRegions = extractChangedLines(options.prDiff).files;
    const prIssues = runPrChecks(files, changedRegions);

    if (prIssues.length > 0) {
      const prScore = computePrScore(prIssues);
      prFeedback = formatPrFeedback(
        prIssues,
        prScore.decision,
        prScore.score,
        prScore.isPRSpecific,
      );
    }

    // Filter main issues to PR-related only
    prFilteredIssues = filterToPrRelated(merged, changedRegions);

    // Testing floor: a PR that modifies real source code without touching
    // any tests can no longer trivially reach 100. We inject a single
    // `testing` issue (medium severity) so the testing dimension drops by
    // one bucket, visibly — the user sees *why* their score is capped
    // rather than a silent penalty. If tests were updated, the signal is
    // suppressed. If the PR is docs/config/infra-only, we also skip it so
    // README tweaks aren't penalised.
    prFilteredIssues = augmentWithTestingFloor(prFilteredIssues, changedRegions);
  }

  const dimensionScores = dimensionScoresFromIssues(prFilteredIssues);
  const score = weightedTrustScore(dimensionScores);
  const decision = decisionFromScore(score, prFilteredIssues, { usedLlm });
  let summary = buildSummary(decision, prFilteredIssues);
  if (summaryNote?.trim()) {
    summary = `${summary} ${summaryNote.trim()}`;
  }

  const sources: SourceRef[] = [
    {
      title: "Deterministic rules engine",
      excerpt: "Pattern-based checks for common security, logic, and quality risks.",
      trustLevel: "high",
    },
  ];
  if (usedLlm) {
    sources.push({
      title: "OpenAI review pass",
      excerpt: "Structured JSON review for gaps pattern rules can miss.",
      trustLevel: "medium",
    });
  }

  const modelVersion = usedLlm
    ? `deterministic+${llmProvider}-v1`
    : "deterministic-v1";

  if (customRules.length > 0) {
    sources.push({
      title: "Custom rules",
      excerpt: `${customRules.length} enabled rule(s).`,
      trustLevel: "medium",
    });
  }

  // Add PR-specific analysis source if applicable
  if (prFeedback) {
    sources.push({
      title: "PR-aware analysis",
      excerpt: "Targeted checks on changed code regions for context-specific feedback.",
      trustLevel: "high",
    });
  }

  return {
    modelVersion,
    score,
    decision,
    summary,
    issues: prFilteredIssues,
    sources,
    dimensionScores,
    ...(prFeedback ? { prFeedback } : {}),
  };
}
