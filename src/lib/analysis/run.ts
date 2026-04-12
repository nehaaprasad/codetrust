import { runDeterministicChecks, type CodeFile } from "./checks";
import { decisionFromScore } from "./decision";
import { buildSummary } from "./summary";
import {
  dimensionScoresFromIssues,
  weightedTrustScore,
} from "./scoring";
import type { AnalysisIssue, Decision, SourceRef } from "./types";

export type AnalysisResult = {
  score: number;
  decision: Decision;
  summary: string;
  issues: AnalysisIssue[];
  sources: SourceRef[];
  dimensionScores: ReturnType<typeof dimensionScoresFromIssues>;
};

export function analyzeFiles(files: CodeFile[]): AnalysisResult {
  const issues = runDeterministicChecks(files);
  const dimensionScores = dimensionScoresFromIssues(issues);
  const score = weightedTrustScore(dimensionScores);
  const decision = decisionFromScore(score, issues);
  const summary = buildSummary(decision, issues);

  const sources: SourceRef[] = [
    {
      title: "Deterministic rules engine",
      excerpt: "Pattern-based checks for common security, logic, and quality risks.",
      trustLevel: "high",
    },
  ];

  return {
    score,
    decision,
    summary,
    issues,
    sources,
    dimensionScores,
  };
}
