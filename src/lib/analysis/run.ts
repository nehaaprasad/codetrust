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
 * Filter issues down to what is relevant for scoring a pull request.
 *
 * Historically this function required every issue to have a line number *and*
 * be within ±`contextLines` of a changed line. That was too strict in two
 * ways, both of which allowed low-signal "100 / SAFE" verdicts on real PRs:
 *
 *   1. Project-level findings (e.g. "no test files detected", long file, high
 *      TODO count) carry no line number and were silently dropped.
 *   2. File-level findings that happened to sit far from the diff (e.g. an
 *      empty `if err != nil {}` 200 lines away from the edited region) were
 *      dropped even though the reviewer is touching that same file.
 *
 * The new contract:
 *
 *   - Issues with **no file path** — treat as project-level and always keep.
 *   - Issues in a file that is **part of the PR** — always keep, even if the
 *     line is outside the diff window. The reviewer is responsible for that
 *     file; surfacing existing problems is the point.
 *   - Issues in files **not** part of the PR — drop (otherwise unrelated
 *     noise from sibling files would dominate the verdict).
 *
 * Rationale: the trust score must reflect real risk in the code under
 * review, not only the delta. If an engineer is editing a file that already
 * swallows errors, the score should notice.
 */
function filterToPrRelated(
  issues: AnalysisIssue[],
  changedRegions: Record<string, ChangedFileRegion>,
): AnalysisIssue[] {
  if (Object.keys(changedRegions).length === 0) {
    return issues;
  }

  return issues.filter((issue) => {
    if (!issue.filePath) return true;
    return Object.prototype.hasOwnProperty.call(changedRegions, issue.filePath);
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
  if (llm) {
    merged = mergeIssues(merged, llm.issues);
    if (llm.summaryNote?.trim()) summaryNote = llm.summaryNote;
    usedLlm = true;
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
  const decision = decisionFromScore(score, prFilteredIssues);
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

  const modelVersion = usedLlm ? "deterministic+openai-v1" : "deterministic-v1";

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
