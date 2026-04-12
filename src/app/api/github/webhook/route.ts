import { NextResponse } from "next/server";
import { addAnalyzeJob } from "@/lib/queue/analyzeQueue";
import { isAsyncAnalysisEnabled } from "@/lib/queue/redisConnection";
import { verifyGitHubWebhookSignature } from "@/lib/github/verifyWebhookSignature";

/** PR events that should trigger a fresh analysis. */
const TRIGGER_ACTIONS = new Set([
  "opened",
  "synchronize",
  "reopened",
  "ready_for_review",
]);

export async function POST(req: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      {
        error:
          "GITHUB_WEBHOOK_SECRET is not set. Add it in .env and use the same secret in the GitHub webhook configuration.",
      },
      { status: 503 },
    );
  }

  const rawBody = await req.text();
  const sig = req.headers.get("x-hub-signature-256");
  if (!verifyGitHubWebhookSignature(secret, rawBody, sig)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const event = req.headers.get("x-github-event") ?? "";

  if (event === "ping") {
    return NextResponse.json({ ok: true, message: "pong" });
  }

  if (event !== "pull_request") {
    return NextResponse.json({ ok: true, ignored: true, event });
  }

  const p = payload as {
    action?: string;
    pull_request?: { html_url?: string; draft?: boolean };
  };
  const action = typeof p.action === "string" ? p.action : "";
  const prUrl =
    typeof p.pull_request?.html_url === "string"
      ? p.pull_request.html_url.trim()
      : "";

  if (!prUrl) {
    return NextResponse.json({ ok: true, ignored: true, reason: "missing_pr_url" });
  }

  if (p.pull_request?.draft === true) {
    return NextResponse.json({ ok: true, ignored: true, reason: "draft_pr" });
  }

  if (!TRIGGER_ACTIONS.has(action)) {
    return NextResponse.json({ ok: true, ignored: true, action });
  }

  if (!isAsyncAnalysisEnabled()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason:
        "Async analysis is off or REDIS_URL is not set. Set REDIS_URL, keep USE_ASYNC_ANALYSIS unset or true, and run npm run worker.",
      prUrl,
      action,
    });
  }

  try {
    const job = await addAnalyzeJob({ mode: "pr", prUrl });
    return NextResponse.json({
      ok: true,
      queued: true,
      jobId: job.id,
      prUrl,
      action,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      {
        error: "Could not queue analysis. Check Redis and REDIS_URL.",
      },
      { status: 503 },
    );
  }
}
