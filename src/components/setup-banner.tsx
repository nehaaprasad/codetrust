"use client";

import { useQuery } from "@tanstack/react-query";

type Health = {
  ok?: boolean;
  database?: "configured" | "missing";
  redis?: "configured" | "missing";
  asyncAnalysis?: boolean;
  githubToken?: boolean;
  githubWebhookSecret?: boolean;
  authConfigured?: boolean;
};

export function SetupBanner() {
  const q = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await fetch("/api/health");
      return (await res.json()) as Health;
    },
    staleTime: 60_000,
  });

  if (!q.data) return null;

  if (q.data.database !== "missing" && q.data.authConfigured === false) {
    return (
      <div
        className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
        role="status"
      >
        <p className="mx-auto max-w-5xl">
          <strong className="font-semibold">GitHub sign-in is not configured.</strong>{" "}
          Without{" "}
          <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/80">
            AUTH_GITHUB_ID
          </code>
          ,{" "}
          <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/80">
            AUTH_GITHUB_SECRET
          </code>
          , and{" "}
          <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/80">
            AUTH_SECRET
          </code>{" "}
          in{" "}
          <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/80">
            .env
          </code>
          , GitHub shows <strong>404</strong> on sign-in. Create an{" "}
          <a
            href="https://github.com/settings/developers"
            className="font-medium underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            OAuth App
          </a>
          , set callback URL to{" "}
          <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/80">
            http://localhost:3000/api/auth/callback/github
          </code>{" "}
          (or port 3001 + matching{" "}
          <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/80">
            AUTH_URL
          </code>
          ), paste Client ID and Client secret, restart the dev server.
        </p>
      </div>
    );
  }

  if (q.data.database === "missing") {
    return (
      <div
        className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
        role="status"
      >
        <p className="mx-auto max-w-5xl">
          <strong className="font-semibold">Database not configured.</strong> Saved
          analyses, the dashboard, and shareable result links need{" "}
          <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/80">
            DATABASE_URL
          </code>
          . Start Postgres (for example{" "}
          <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/80">
            docker compose up -d db
          </code>
          ), then run{" "}
          <code className="rounded bg-amber-100/80 px-1 py-0.5 font-mono text-xs dark:bg-amber-900/80">
            npm run db:push
          </code>
          . See the project README for the full environment list.
        </p>
      </div>
    );
  }

  if (q.data.redis === "missing" && !q.data.asyncAnalysis) {
    return (
      <div
        className="border-b border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 dark:border-zinc-700/80 dark:bg-zinc-900/50 dark:text-zinc-200"
        role="status"
      >
        <p className="mx-auto max-w-5xl">
          <strong className="font-semibold">Optional — Redis not configured.</strong>{" "}
          Set{" "}
          <code className="rounded bg-zinc-200/80 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800/90">
            REDIS_URL
          </code>{" "}
          and run{" "}
          <code className="rounded bg-zinc-200/80 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800/90">
            npm run worker
          </code>{" "}
          for async analysis queues and GitHub webhook-triggered runs.
        </p>
      </div>
    );
  }

  return null;
}
