import { resolveAnalyzeInput } from "@/lib/analysis/resolveAnalyzeInput";
import { runPreparedAnalyze } from "@/lib/analysis/runPreparedAnalyze";
import { getAnalyzeMaxTotalBytes } from "@/lib/analysis/limits";
import { jobDataToAnalyzeBody } from "./jobTypes";
import type { AnalyzeJobData } from "./jobTypes";
import type { Job } from "bullmq";

export async function processAnalyzeJob(job: Job<AnalyzeJobData>) {
  await job.updateProgress({ stage: "queued" });
  const body = jobDataToAnalyzeBody(job.data);
  await job.updateProgress({ stage: "fetching" });
  const prepared = await resolveAnalyzeInput(body);
  const maxTotalBytes = getAnalyzeMaxTotalBytes();
  const total = prepared.files.reduce((a, f) => a + f.content.length, 0);
  if (total > maxTotalBytes) {
    throw new Error("Combined source exceeds size limit.");
  }
  return runPreparedAnalyze(prepared, job, {
    userId: job.data.userId ?? null,
    apiKeyId: job.data.apiKeyId ?? null,
    projectId: job.data.projectId,
  });
}
