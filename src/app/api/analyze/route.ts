import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runPreparedAnalyze } from "@/lib/analysis/runPreparedAnalyze";
import { resolveAnalyzeInput } from "@/lib/analysis/resolveAnalyzeInput";
import { validateApiKeyBearer } from "@/lib/apiKeys";
import { addAnalyzeJob } from "@/lib/queue/analyzeQueue";
import { analyzeBodyToJobData } from "@/lib/queue/jobTypes";
import { isAsyncAnalysisEnabled } from "@/lib/queue/redisConnection";
import { checkRateLimit, clientIpFromRequest } from "@/lib/rateLimit";
import { analyzeBodySchema } from "@/lib/validation/analyze";
import { assertWorkspaceMember } from "@/lib/workspaceAuth";

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
  const authHeader = req.headers.get("authorization");
  const xApiKey = req.headers.get("x-api-key");
  const apiKeyPlain =
    authHeader?.startsWith("Bearer ") && authHeader.slice(7).trim().length > 0
      ? authHeader.slice(7).trim()
      : xApiKey?.trim() || null;

  let userId: string | null = null;
  let apiKeyId: string | null = null;

  if (apiKeyPlain) {
    const v = await validateApiKeyBearer(apiKeyPlain);
    if (!v) {
      return NextResponse.json(
        { error: "Invalid or revoked API key." },
        { status: 401 },
      );
    }
    userId = v.userId;
    apiKeyId = v.id;
  } else {
    const session = await auth();
    if (session?.user?.id) {
      userId = session.user.id;
    }
  }

  const rateKey = apiKeyId
    ? `analyze:apikey:${apiKeyId}`
    : `analyze:${clientIpFromRequest(req)}`;
  const rl = checkRateLimit(rateKey);
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: "Rate limit exceeded. Try again later.",
        limit: rl.limit,
        windowMs: rl.windowMs,
      },
      { status: 429 },
    );
  }

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

  if (data.workspaceId) {
    const ws = await assertWorkspaceMember(data.workspaceId, userId);
    if (!ws.ok) {
      return NextResponse.json(
        { error: ws.message },
        { status: ws.status },
      );
    }
  }

  const authCtx = { userId, apiKeyId };

  if (isAsyncAnalysisEnabled()) {
    const jobData = analyzeBodyToJobData(data, authCtx);
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
    const out = await runPreparedAnalyze(prepared, undefined, authCtx);
    return NextResponse.json({ ...out, async: false });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Analysis failed.";
    return NextResponse.json(
      { error: msg },
      { status: httpStatusForError(msg) },
    );
  }
}
