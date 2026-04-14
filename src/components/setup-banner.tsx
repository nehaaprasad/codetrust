"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type BannerResult = {
  node: ReactNode;
  /** Optional notices (e.g. Redis) fade out as the user scrolls down. */
  fadeOnScroll?: boolean;
};

type Health = {
  ok?: boolean;
  database?: "configured" | "missing";
  redis?: "configured" | "missing";
  asyncAnalysis?: boolean;
  githubToken?: boolean;
  githubWebhookSecret?: boolean;
  authConfigured?: boolean;
};

function buildBanner(data: Health | undefined): BannerResult | null {
  if (!data) return null;

  if (data.database !== "missing" && data.authConfigured === false) {
    return {
      node: (
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
      ),
    };
  }

  if (data.database === "missing") {
    return {
      node: (
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
      ),
    };
  }

  if (data.redis === "missing" && !data.asyncAnalysis) {
    return {
      fadeOnScroll: true,
      node: (
      <div
        className="relative border-b border-stone-400/30 bg-[#ebe3d9] px-4 py-2.5 text-[13px] leading-snug text-stone-800 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.45)]"
        role="status"
      >
        <p className="mx-auto max-w-5xl">
          <strong className="font-semibold text-stone-900">Optional — Redis not configured.</strong>{" "}
          Set{" "}
          <code className="rounded-md bg-white/70 px-1.5 py-0.5 font-mono text-[12px] text-stone-900 ring-1 ring-stone-300/60">
            REDIS_URL
          </code>{" "}
          and run{" "}
          <code className="rounded-md bg-white/70 px-1.5 py-0.5 font-mono text-[12px] text-stone-900 ring-1 ring-stone-300/60">
            npm run worker
          </code>{" "}
          for async analysis queues and GitHub webhook-triggered runs.
        </p>
      </div>
      ),
    };
  }

  return null;
}

function ScrollFadeOptionalBanner({ children }: { children: ReactNode }) {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const next = Math.max(0, Math.min(1, 1 - y / 72));
      setOpacity(next);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "transition-[opacity] duration-200 ease-out",
        opacity < 0.04 && "pointer-events-none",
      )}
      style={{ opacity }}
    >
      {children}
    </div>
  );
}

type SetupBannerProps = {
  /** Adds top spacing only when a notice renders — use below the main nav bar. */
  belowNav?: boolean;
};

export function SetupBanner({ belowNav }: SetupBannerProps = {}) {
  const q = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await fetch("/api/health");
      return (await res.json()) as Health;
    },
    staleTime: 60_000,
  });

  const built = buildBanner(q.data);
  if (!built) return null;

  if (belowNav) {
    const padded = (
      <div className="w-full shrink-0 pt-3 sm:pt-4">{built.node}</div>
    );
    if (built.fadeOnScroll) {
      return <ScrollFadeOptionalBanner>{padded}</ScrollFadeOptionalBanner>;
    }
    return padded;
  }

  if (built.fadeOnScroll) {
    return <ScrollFadeOptionalBanner>{built.node}</ScrollFadeOptionalBanner>;
  }

  return built.node;
}
