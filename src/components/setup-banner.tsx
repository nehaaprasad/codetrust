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
        className="border-b border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100"
        role="status"
      >
        <p className="mx-auto max-w-5xl">
          <strong className="font-semibold">Optional — Redis not configured.</strong>{" "}
          Set{" "}
          <code className="rounded bg-sky-100/80 px-1 py-0.5 font-mono text-xs dark:bg-sky-900/80">
            REDIS_URL
          </code>{" "}
          and run{" "}
          <code className="rounded bg-sky-100/80 px-1 py-0.5 font-mono text-xs dark:bg-sky-900/80">
            npm run worker
          </code>{" "}
          for async analysis queues and GitHub webhook-triggered runs.
        </p>
      </div>
    );
  }

  return null;
}
