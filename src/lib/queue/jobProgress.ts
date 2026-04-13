/** Stages stored on BullMQ job progress for async analysis. */
export const JOB_PROGRESS_STAGES = [
  "queued",
  "fetching",
  "analyzing",
  "scoring",
  "persisting",
  "complete",
] as const;

export type JobProgressStage = (typeof JOB_PROGRESS_STAGES)[number];

const LABELS: Record<JobProgressStage, string> = {
  queued: "Queued",
  fetching: "Fetching source",
  analyzing: "Analyzing",
  scoring: "Scoring",
  persisting: "Saving",
  complete: "Complete",
};

export function formatJobProgress(
  progress: unknown,
  bullmqState: string,
): { stage: string; label: string } {
  if (bullmqState === "failed") {
    return { stage: "failed", label: "Failed" };
  }
  if (bullmqState === "completed") {
    return { stage: "complete", label: "Complete" };
  }
  if (
    progress &&
    typeof progress === "object" &&
    "stage" in progress &&
    typeof (progress as { stage: unknown }).stage === "string"
  ) {
    const stage = (progress as { stage: string }).stage;
    const label =
      stage in LABELS
        ? LABELS[stage as JobProgressStage]
        : stage;
    return { stage, label };
  }
  if (bullmqState === "waiting" || bullmqState === "delayed") {
    return { stage: "queued", label: LABELS.queued };
  }
  if (bullmqState === "active") {
    return { stage: "analyzing", label: LABELS.analyzing };
  }
  return { stage: bullmqState, label: bullmqState };
}
