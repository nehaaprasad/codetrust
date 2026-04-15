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
import { extractChangedLines } from "./diff-parser";
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
  if (options?.prDiff) {
    const changedRegions = extractChangedLines(options.prDiff);
    const prIssues = runPrChecks(files, changedRegions.files);

    if (prIssues.length > 0) {
      const prScore = computePrScore(prIssues);
      prFeedback = formatPrFeedback(
        prIssues,
        prScore.decision,
        prScore.score,
        prScore.isPRSpecific,
      );
    }
  }

  const dimensionScores = dimensionScoresFromIssues(merged);
  const score = weightedTrustScore(dimensionScores);
  const decision = decisionFromScore(score, merged);
  let summary = buildSummary(decision, merged);
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
    issues: merged,
    sources,
    dimensionScores,
    ...(prFeedback ? { prFeedback } : {}),
  };
}
