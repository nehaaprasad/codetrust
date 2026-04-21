import { after, NextResponse } from "next/server";
import { resolveAnalyzeInput } from "@/lib/analysis/resolveAnalyzeInput";
import { runPreparedAnalyze } from "@/lib/analysis/runPreparedAnalyze";
import { verifyGitHubWebhookSignature } from "@/lib/github/verifyWebhookSignature";
import { addAnalyzeJob } from "@/lib/queue/analyzeQueue";
import { isAsyncAnalysisEnabled } from "@/lib/queue/redisConnection";

/** PR events that should trigger a fresh analysis. */
const TRIGGER_ACTIONS = new Set([
  "opened",
  "synchronize",
  "reopened",
  "ready_for_review",
]);

/**
 * Give the background analysis enough time to finish after we've
 * already responded to GitHub. Hobby plan caps this at 60s; Pro and
 * above allow up to 300s. Vercel clamps silently if the account's
 * plan can't honour the requested value.
 */
export const maxDuration = 300;

type PullRequestPayload = {
  action?: string;
  pull_request?: {
    html_url?: string;
    draft?: boolean;
  };
};

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

  let payload: PullRequestPayload;
  try {
    payload = JSON.parse(rawBody) as PullRequestPayload;
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

  const action = typeof payload.action === "string" ? payload.action : "";
  const prUrl =
    typeof payload.pull_request?.html_url === "string"
      ? payload.pull_request.html_url.trim()
      : "";

  if (!prUrl) {
    return NextResponse.json({ ok: true, ignored: true, reason: "missing_pr_url" });
  }
  if (payload.pull_request?.draft === true) {
    return NextResponse.json({ ok: true, ignored: true, reason: "draft_pr" });
  }
  if (!TRIGGER_ACTIONS.has(action)) {
    return NextResponse.json({ ok: true, ignored: true, action });
  }

  // Preferred path: Redis + BullMQ worker. Webhook returns instantly,
  // the worker picks the job up in a separate process. This is what
  // we want at real scale.
  if (isAsyncAnalysisEnabled()) {
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
      console.error("[webhook] addAnalyzeJob failed:", e);
      return NextResponse.json(
        { error: "Could not queue analysis. Check Redis and REDIS_URL." },
        { status: 503 },
      );
    }
  }

  // Fallback path: no Redis. Run the same analysis pipeline the
  // browser /api/analyze route uses, but schedule it with `after()`
  // so GitHub's webhook request returns in <1s and never hits the 10s
  // GitHub timeout. The work continues on the same Vercel invocation
  // until `maxDuration` (set above).
  after(() => runAnalysisInBackground(prUrl));

  return NextResponse.json({
    ok: true,
    accepted: true,
    mode: "sync-after",
    prUrl,
    action,
  });
}

/**
 * Runs a PR analysis end-to-end (fetch files, run deterministic +
 * LLM checks, persist, post PR comment). Errors are logged but never
 * thrown — this function is invoked from `after()` and by that point
 * the HTTP response has already left the server, so there's no UI to
 * surface an exception to.
 */
async function runAnalysisInBackground(prUrl: string): Promise<void> {
  try {
    const prepared = await resolveAnalyzeInput({ prUrl });
    await runPreparedAnalyze(prepared, undefined, {
      userId: null,
      apiKeyId: null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[webhook] sync analysis failed for ${prUrl}:`, message);
  }
}
