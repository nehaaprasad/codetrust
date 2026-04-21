import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";
import { getGitHubAccessTokenFromRequest } from "@/lib/github/getUserAccessToken";
import {
  installRepoWebhook,
  RepoSubscriptionError,
  uninstallRepoWebhook,
} from "@/lib/github/repoSubscription";

export const runtime = "nodejs";

/**
 * Auto-analyze subscriptions for the signed-in user.
 *
 *   GET    /api/github/subscriptions
 *          → { items: [{ fullName, owner, repo, enabled, createdAt }] }
 *
 *   POST   /api/github/subscriptions
 *          body: { owner, repo }
 *          → { fullName, enabled: true, adopted: boolean }
 *
 *   DELETE /api/github/subscriptions?fullName=owner/repo
 *          → { fullName, enabled: false }
 *
 * All three endpoints require a signed-in session and do the minimum
 * GitHub API work needed — listing existing hooks once, then a single
 * create/update/delete call. DB state and GitHub state are kept in
 * sync by running the GitHub call first, then writing the row; if the
 * DB write fails after a successful install, the next POST for the
 * same repo will adopt the orphan hook rather than create a duplicate.
 */

const postBodySchema = z.object({
  owner: z.string().min(1).max(200),
  repo: z.string().min(1).max(200),
});

type Ok<T> = { ok: true } & T;
type Err = { error: string; code?: string };

function errorResponse(
  e: unknown,
  fallback: string,
): NextResponse<Err> {
  if (e instanceof RepoSubscriptionError) {
    return NextResponse.json<Err>(
      { error: e.message, code: e.code },
      { status: e.status },
    );
  }
  const message = e instanceof Error ? e.message : fallback;
  return NextResponse.json<Err>({ error: message }, { status: 500 });
}

async function requireSignedInUserId(): Promise<string | NextResponse<Err>> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json<Err>({ error: "Sign in with GitHub first." }, { status: 401 });
  }
  return session.user.id;
}

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json<Err>(
      { error: "DATABASE_URL is not configured." },
      { status: 503 },
    );
  }
  const userIdOrResp = await requireSignedInUserId();
  if (typeof userIdOrResp !== "string") return userIdOrResp;

  const prisma = getPrisma();
  const rows = await prisma.repoSubscription.findMany({
    where: { userId: userIdOrResp },
    orderBy: { createdAt: "desc" },
    select: {
      fullName: true,
      owner: true,
      repo: true,
      enabled: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ items: rows });
}

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json<Err>(
      { error: "DATABASE_URL is not configured." },
      { status: 503 },
    );
  }
  const userIdOrResp = await requireSignedInUserId();
  if (typeof userIdOrResp !== "string") return userIdOrResp;
  const userId = userIdOrResp;

  const accessToken = await getGitHubAccessTokenFromRequest(req);
  if (!accessToken) {
    return NextResponse.json<Err>(
      {
        error:
          "GitHub access token missing. Sign out and sign back in so we can read your OAuth token.",
      },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<Err>({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = postBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<Err>(
      { error: "Request body must include `owner` and `repo`." },
      { status: 400 },
    );
  }
  const { owner, repo } = parsed.data;
  const fullName = `${owner}/${repo}`;

  const prisma = getPrisma();

  // Already subscribed and enabled? Return the existing row — no
  // GitHub round-trip needed, keeps the UI snappy on re-click.
  const existing = await prisma.repoSubscription.findUnique({
    where: { fullName },
    select: { userId: true, enabled: true, hookId: true },
  });
  if (existing && existing.userId === userId && existing.enabled) {
    return NextResponse.json<Ok<{ fullName: string; enabled: true; adopted: boolean }>>(
      { ok: true, fullName, enabled: true, adopted: true },
    );
  }

  let installed;
  try {
    installed = await installRepoWebhook({ accessToken, owner, repo });
  } catch (e) {
    return errorResponse(e, "Failed to install webhook on repository.");
  }

  try {
    await prisma.repoSubscription.upsert({
      where: { fullName },
      update: {
        userId,
        owner,
        repo,
        hookId: installed.hookId,
        enabled: true,
      },
      create: {
        userId,
        owner,
        repo,
        fullName,
        hookId: installed.hookId,
        enabled: true,
      },
    });
  } catch (e) {
    // The webhook is live on GitHub but we couldn't record it. The
    // next POST for the same repo will adopt the orphan hook; surface
    // the DB error so the user can retry.
    return errorResponse(
      e,
      "Webhook was installed on GitHub but we could not save it locally. Try again to reconcile.",
    );
  }

  return NextResponse.json<Ok<{ fullName: string; enabled: true; adopted: boolean }>>(
    { ok: true, fullName, enabled: true, adopted: installed.adopted },
  );
}

export async function DELETE(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json<Err>(
      { error: "DATABASE_URL is not configured." },
      { status: 503 },
    );
  }
  const userIdOrResp = await requireSignedInUserId();
  if (typeof userIdOrResp !== "string") return userIdOrResp;
  const userId = userIdOrResp;

  const accessToken = await getGitHubAccessTokenFromRequest(req);
  if (!accessToken) {
    return NextResponse.json<Err>(
      {
        error:
          "GitHub access token missing. Sign out and sign back in so we can read your OAuth token.",
      },
      { status: 401 },
    );
  }

  const fullName = new URL(req.url).searchParams.get("fullName")?.trim();
  if (!fullName || !/^[^/]+\/[^/]+$/.test(fullName)) {
    return NextResponse.json<Err>(
      { error: "fullName must be provided as `owner/repo`." },
      { status: 400 },
    );
  }

  const prisma = getPrisma();
  const row = await prisma.repoSubscription.findUnique({
    where: { fullName },
  });
  if (!row || row.userId !== userId) {
    // Don't leak existence of another user's row — same 404 shape.
    return NextResponse.json<Err>(
      { error: "No subscription found for this repository." },
      { status: 404 },
    );
  }

  try {
    await uninstallRepoWebhook({
      accessToken,
      owner: row.owner,
      repo: row.repo,
      hookId: row.hookId,
    });
  } catch (e) {
    return errorResponse(e, "Failed to remove the webhook from GitHub.");
  }

  await prisma.repoSubscription.delete({ where: { fullName } });
  return NextResponse.json<Ok<{ fullName: string; enabled: false }>>(
    { ok: true, fullName, enabled: false },
  );
}
