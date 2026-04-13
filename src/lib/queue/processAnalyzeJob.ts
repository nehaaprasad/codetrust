import { resolveAnalyzeInput } from "@/lib/analysis/resolveAnalyzeInput";
import { runPreparedAnalyze } from "@/lib/analysis/runPreparedAnalyze";
import { jobDataToAnalyzeBody } from "./jobTypes";
import type { AnalyzeJobData } from "./jobTypes";
import type { Job } from "bullmq";

const MAX_TOTAL_BYTES = 1_500_000;

export async function processAnalyzeJob(job: Job<AnalyzeJobData>) {
  await job.updateProgress({ stage: "queued" });
  const body = jobDataToAnalyzeBody(job.data);
  await job.updateProgress({ stage: "fetching" });
  const prepared = await resolveAnalyzeInput(body);
  const total = prepared.files.reduce((a, f) => a + f.content.length, 0);
  if (total > MAX_TOTAL_BYTES) {
    throw new Error("Combined source exceeds size limit.");
  }
  return runPreparedAnalyze(prepared, job);
}
