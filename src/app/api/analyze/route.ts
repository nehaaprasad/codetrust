import { NextResponse } from "next/server";
import { runPreparedAnalyze } from "@/lib/analysis/runPreparedAnalyze";
import { resolveAnalyzeInput } from "@/lib/analysis/resolveAnalyzeInput";
import { addAnalyzeJob } from "@/lib/queue/analyzeQueue";
import { analyzeBodyToJobData } from "@/lib/queue/jobTypes";
import { isAsyncAnalysisEnabled } from "@/lib/queue/redisConnection";
import { analyzeBodySchema } from "@/lib/validation/analyze";

const MAX_TOTAL_BYTES = 1_500_000;

function httpStatusForError(message: string): number {
  if (
    message.includes("GITHUB_TOKEN") ||
    message.includes("Invalid") ||
    message.includes("Nothing to analyze")
  ) {
    return 400;
  }
  if (message.includes("size limit")) {
    return 413;
  }
  if (message.includes("Failed to fetch") || message.includes("pull request")) {
    return 502;
  }
  return 500;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = analyzeBodySchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(" ");
    return NextResponse.json({ error: msg || "Invalid request." }, { status: 400 });
  }

  const data = parsed.data;

  if (isAsyncAnalysisEnabled()) {
    const jobData = analyzeBodyToJobData(data);
    if (!jobData) {
      return NextResponse.json({ error: "Nothing to analyze." }, { status: 400 });
    }
    try {
      const job = await addAnalyzeJob(jobData);
      return NextResponse.json(
        { jobId: job.id, async: true },
        { status: 202 },
      );
    } catch (e) {
      console.error(e);
      return NextResponse.json(
        { error: "Could not queue analysis. Is Redis running?" },
        { status: 503 },
      );
    }
  }

  try {
    const prepared = await resolveAnalyzeInput(data);
    const total = prepared.files.reduce((a, f) => a + f.content.length, 0);
    if (total > MAX_TOTAL_BYTES) {
      return NextResponse.json(
        { error: "Combined source exceeds size limit." },
        { status: 413 },
      );
    }
    const out = await runPreparedAnalyze(prepared);
    return NextResponse.json({ ...out, async: false });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Analysis failed.";
    return NextResponse.json(
      { error: msg },
      { status: httpStatusForError(msg) },
    );
  }
}
