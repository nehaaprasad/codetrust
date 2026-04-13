import { NextResponse } from "next/server";
import type { AnalyzePipelineJson } from "@/lib/analysis/runPreparedAnalyze";
import { formatJobProgress } from "@/lib/queue/jobProgress";
import { getAnalyzeQueue } from "@/lib/queue/analyzeQueue";

export async function GET(
  _req: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  if (!jobId) {
    return NextResponse.json({ error: "Missing job id." }, { status: 400 });
  }

  try {
    const queue = getAnalyzeQueue();
    const job = await queue.getJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found." }, { status: 404 });
    }

    const state = await job.getState();
    const failedReason = job.failedReason ?? null;
    const returnvalue = job.returnvalue as AnalyzePipelineJson | undefined;
    const progress = formatJobProgress(job.progress, state);

    return NextResponse.json({
      jobId: job.id,
      state,
      failedReason,
      progress: job.progress ?? null,
      progressLabel: progress.label,
      progressStage: progress.stage,
      result: state === "completed" ? (returnvalue ?? null) : null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Could not read job status. Is Redis configured?" },
      { status: 503 },
    );
  }
}
