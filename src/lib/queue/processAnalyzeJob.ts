import { resolveAnalyzeInput } from "@/lib/analysis/resolveAnalyzeInput";
import { runPreparedAnalyze } from "@/lib/analysis/runPreparedAnalyze";
import { jobDataToAnalyzeBody } from "./jobTypes";
import type { AnalyzeJobData } from "./jobTypes";

const MAX_TOTAL_BYTES = 1_500_000;

export async function processAnalyzeJob(data: AnalyzeJobData) {
  const body = jobDataToAnalyzeBody(data);
  const prepared = await resolveAnalyzeInput(body);
  const total = prepared.files.reduce((a, f) => a + f.content.length, 0);
  if (total > MAX_TOTAL_BYTES) {
    throw new Error("Combined source exceeds size limit.");
  }
  return runPreparedAnalyze(prepared);
}
