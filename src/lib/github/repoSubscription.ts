import { Octokit } from "@octokit/rest";
import { createGitHubClientForUser } from "./client";

/**
 * Auto-analyze webhook management.
 *
 * Installs (and removes) a GitHub "pull_request" webhook on a single
 * repository on behalf of a signed-in user, pointing at our
 * `/api/github/webhook` endpoint. The webhook handler already verifies
 * the shared HMAC secret (`GITHUB_WEBHOOK_SECRET`) and enqueues a
 * `pull_request.opened / synchronize / reopened / ready_for_review`
 * event as an analysis job, so once a repo is subscribed, every new PR
 * gets reviewed without any further user action.
 *
 * Design notes:
 *   - We use the shared `GITHUB_WEBHOOK_SECRET` for every hook we
 *     install. One secret, one validator in the webhook handler —
 *     simpler than per-repo secrets and equally secure as long as the
 *     env var is not leaked.
 *   - Idempotent by design: if a hook pointing at our URL already
 *     exists on the repo, we adopt its id instead of creating a second
 *     one. This handles the case where a previous install succeeded
 *     but our DB row was never written (crash between the two calls).
 */

export type WebhookInstallResult = {
  hookId: number;
  /** True when we re-used an existing matching hook instead of creating one. */
  adopted: boolean;
};

export type InstallError =
  | "missing_admin_permission"
  | "missing_webhook_secret"
  | "missing_app_url"
  | "github_error";

export class RepoSubscriptionError extends Error {
  readonly code: InstallError;
  readonly status: number;
  constructor(code: InstallError, message: string, status = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/**
 * Public HTTPS URL of this deployment, used as the GitHub webhook
 * target. Resolution order:
 *   1. `APP_URL` — set this in prod to pin the URL explicitly.
 *   2. `VERCEL_PROJECT_PRODUCTION_URL` — stable across preview/prod.
 *   3. `VERCEL_URL` — fallback, per-deployment.
 */
export function resolveAppBaseUrl(): string {
  const app = process.env.APP_URL?.trim();
  if (app) return app.replace(/\/+$/, "");
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (prod) return `https://${prod.replace(/\/+$/, "")}`;
  const any = process.env.VERCEL_URL?.trim();
  if (any) return `https://${any.replace(/\/+$/, "")}`;
  throw new RepoSubscriptionError(
    "missing_app_url",
    "APP_URL is not set and no Vercel-provided URL was found. Set APP_URL to the public HTTPS URL of this deployment so GitHub can deliver webhooks.",
    500,
  );
}

export function webhookTargetUrl(): string {
  return `${resolveAppBaseUrl()}/api/github/webhook`;
}

function requireWebhookSecret(): string {
  const secret = process.env.GITHUB_WEBHOOK_SECRET?.trim();
  if (!secret) {
    throw new RepoSubscriptionError(
      "missing_webhook_secret",
      "GITHUB_WEBHOOK_SECRET is not set. Generate a random string and add it to the environment before enabling auto-analyze.",
      500,
    );
  }
  return secret;
}

/**
 * Find an existing `pull_request` webhook on the repo that points at
 * our exact target URL. Returns the GitHub hook id or `null`.
 *
 * We compare only the URL, not the full config, because the user may
 * have rotated `GITHUB_WEBHOOK_SECRET` and we want to adopt the same
 * hook (we'll overwrite its config on adoption).
 */
async function findExistingHook(
  octokit: Octokit,
  owner: string,
  repo: string,
  targetUrl: string,
): Promise<number | null> {
  const { data: hooks } = await octokit.repos.listWebhooks({
    owner,
    repo,
    per_page: 100,
  });
  const match = hooks.find((h) => h.config?.url === targetUrl);
  return match?.id ?? null;
}

/**
 * Install (or adopt) the auto-analyze webhook on `owner/repo`.
 *
 * Edge cases handled:
 *   - User has no admin permission on the repo  → 403/404 from GitHub
 *     is surfaced as `missing_admin_permission` so the UI can show a
 *     helpful message ("you need admin access on this repo").
 *   - Hook already exists on our URL             → adopted (no dup).
 *   - Any other GitHub error                     → `github_error` with
 *     original message and status preserved.
 */
export async function installRepoWebhook(args: {
  accessToken: string;
  owner: string;
  repo: string;
}): Promise<WebhookInstallResult> {
  const secret = requireWebhookSecret();
  const targetUrl = webhookTargetUrl();
  const octokit = createGitHubClientForUser(args.accessToken);

  try {
    const existing = await findExistingHook(
      octokit,
      args.owner,
      args.repo,
      targetUrl,
    );

    if (existing != null) {
      // Adopt: rewrite config so the shared secret on this hook is
      // definitely the current env var value, and events list is right.
      await octokit.repos.updateWebhook({
        owner: args.owner,
        repo: args.repo,
        hook_id: existing,
        active: true,
        events: ["pull_request"],
        config: {
          url: targetUrl,
          content_type: "json",
          secret,
          insecure_ssl: "0",
        },
      });
      return { hookId: existing, adopted: true };
    }

    const { data: created } = await octokit.repos.createWebhook({
      owner: args.owner,
      repo: args.repo,
      name: "web",
      active: true,
      events: ["pull_request"],
      config: {
        url: targetUrl,
        content_type: "json",
        secret,
        insecure_ssl: "0",
      },
    });
    return { hookId: created.id, adopted: false };
  } catch (err) {
    throw translateGitHubError(err);
  }
}

/**
 * Remove the webhook we installed. Idempotent — a 404 from GitHub
 * (hook already deleted) is treated as success so the UI's
 * toggle-off flow is never blocked by stale state.
 */
export async function uninstallRepoWebhook(args: {
  accessToken: string;
  owner: string;
  repo: string;
  hookId: number;
}): Promise<void> {
  const octokit = createGitHubClientForUser(args.accessToken);
  try {
    await octokit.repos.deleteWebhook({
      owner: args.owner,
      repo: args.repo,
      hook_id: args.hookId,
    });
  } catch (err) {
    // 404 = already gone → that's the intended state.
    const status = (err as { status?: number }).status;
    if (status === 404) return;
    throw translateGitHubError(err);
  }
}

function translateGitHubError(err: unknown): RepoSubscriptionError {
  const status = (err as { status?: number }).status ?? 500;
  const message =
    err instanceof Error ? err.message : "GitHub request failed.";
  if (status === 403 || status === 404) {
    return new RepoSubscriptionError(
      "missing_admin_permission",
      "You need admin access on this repository to install a webhook. Ask the repo owner or pick a repository where you have admin rights.",
      status,
    );
  }
  return new RepoSubscriptionError(
    "github_error",
    `GitHub webhook request failed (${status}): ${message}`,
    status,
  );
}
