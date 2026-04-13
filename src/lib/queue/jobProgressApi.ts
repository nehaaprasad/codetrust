import type { Job } from "bullmq";
import type { AnalyzeJobData } from "./jobTypes";

/** Narrow type so `runPreparedAnalyze` does not depend on BullMQ in the analysis package graph. */
export type ProgressJob = Pick<Job<AnalyzeJobData>, "updateProgress">;
