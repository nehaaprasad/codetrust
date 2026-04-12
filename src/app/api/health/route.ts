import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { isAsyncAnalysisEnabled } from "@/lib/queue/redisConnection";

/**
 * Deployment and local setup checks. Does not expose secret values.
 */
export async function GET() {
  const database = isDatabaseConfigured() ? "configured" : "missing";
  const redis = Boolean(process.env.REDIS_URL?.trim());
  const asyncAnalysis = isAsyncAnalysisEnabled();
  const githubToken = Boolean(process.env.GITHUB_TOKEN?.trim());
  const githubWebhookSecret = Boolean(process.env.GITHUB_WEBHOOK_SECRET?.trim());
  const authConfigured = Boolean(
    process.env.AUTH_SECRET?.trim() &&
      process.env.AUTH_GITHUB_ID?.trim() &&
      process.env.AUTH_GITHUB_SECRET?.trim(),
  );

  return NextResponse.json({
    ok: true,
    database,
    redis: redis ? "configured" : "missing",
    asyncAnalysis,
    githubToken,
    githubWebhookSecret,
    authConfigured,
  });
}
