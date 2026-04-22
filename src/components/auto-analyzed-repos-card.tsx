"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  AutoAnalyzeToggle,
  useAutoAnalyzeSubscriptions,
} from "@/components/auto-analyze-toggle";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Shape of a recent analysis row shared with the dashboard page's
 * Runs table. We intentionally only depend on the fields we actually
 * read — callers pass whatever they already have from `/api/analyses`
 * and we pick off `repoUrl`, `decision`, `score`, `createdAt`.
 */
export type RecentRunForCard = {
  id: string;
  repoUrl: string | null;
  score: number;
  decision: string;
  createdAt: string;
};

type VerdictVariant = "default" | "secondary" | "risky" | "block" | "inconclusive";

function verdictBadgeVariant(d: string): VerdictVariant {
  if (d === "SAFE") return "default";
  if (d === "RISKY") return "risky";
  if (d === "BLOCK") return "block";
  if (d === "INCONCLUSIVE") return "inconclusive";
  return "secondary";
}

/**
 * Parse a GitHub PR/repo URL into `owner/repo`. Returns `null` if
 * the URL isn't a recognisable GitHub URL so the caller can skip
 * matching it against a subscription. We accept any URL shape
 * because `Analysis.repoUrl` can be either the repo root or the PR
 * URL depending on how the run was created.
 */
function extractFullName(repoUrl: string | null | undefined): string | null {
  if (!repoUrl) return null;
  const m = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (!m) return null;
  const owner = m[1];
  const repo = m[2].replace(/\.git$/i, "").replace(/\/.*$/, "");
  if (!owner || !repo) return null;
  return `${owner}/${repo}`;
}

type RowSummary = {
  fullName: string;
  owner: string;
  repo: string;
  subscribedSince: string;
  lastRun: RecentRunForCard | null;
  runsShown: number;
};

/**
 * Dashboard card listing every repo the signed-in user has
 * auto-analyze turned on for, plus the most recent automated run on
 * each. Off-toggle per row; empty state points to `/connect`.
 *
 * Last-run info is derived from the runs the dashboard already
 * fetches, so we don't fire an extra request per repo. If the user
 * is viewing filtered runs (e.g. only BLOCK), the "last run" column
 * reflects the filter — that matches the rest of the page and keeps
 * this card in sync with what the user is looking at.
 */
export function AutoAnalyzedReposCard({
  enabled,
  recentRuns,
}: {
  enabled: boolean;
  recentRuns: readonly RecentRunForCard[];
}) {
  const subsQ = useAutoAnalyzeSubscriptions(enabled);

  const lastRunByRepo = useMemo(() => {
    const map = new Map<string, RecentRunForCard>();
    const counts = new Map<string, number>();
    for (const run of recentRuns) {
      const key = extractFullName(run.repoUrl);
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      const existing = map.get(key);
      if (
        !existing ||
        new Date(run.createdAt).getTime() > new Date(existing.createdAt).getTime()
      ) {
        map.set(key, run);
      }
    }
    return { map, counts };
  }, [recentRuns]);

  const rows = useMemo<RowSummary[]>(() => {
    const items = subsQ.data?.items ?? [];
    return items
      .filter((s) => s.enabled)
      .map((s) => ({
        fullName: s.fullName,
        owner: s.owner,
        repo: s.repo,
        subscribedSince: s.createdAt,
        lastRun: lastRunByRepo.map.get(s.fullName) ?? null,
        runsShown: lastRunByRepo.counts.get(s.fullName) ?? 0,
      }))
      .sort((a, b) => {
        const at = a.lastRun ? new Date(a.lastRun.createdAt).getTime() : 0;
        const bt = b.lastRun ? new Date(b.lastRun.createdAt).getTime() : 0;
        if (at !== bt) return bt - at;
        return a.fullName.localeCompare(b.fullName);
      });
  }, [subsQ.data, lastRunByRepo]);

  if (!enabled) return null;

  return (
    <Card className="overflow-hidden rounded-2xl border-zinc-200/90 dark:border-zinc-700/55">
      <CardHeader>
        <CardTitle className="text-lg font-semibold tracking-[-0.02em]">
          Auto-analyzed repositories
        </CardTitle>
        <CardDescription>
          Every new PR opened on these repos gets reviewed automatically and
          commented on. Toggle off any repo to stop analysing it. Add more from{" "}
          <Link
            href="/connect"
            className="font-medium text-zinc-700 underline dark:text-zinc-300"
          >
            Connect
          </Link>
          .
        </CardDescription>
      </CardHeader>
      <CardContent>
        {subsQ.isPending ? (
          <p className="text-sm text-zinc-500">Loading subscriptions…</p>
        ) : subsQ.isError ? (
          <p className="text-sm text-red-600" role="alert">
            {subsQ.error instanceof Error
              ? subsQ.error.message
              : "Could not load subscriptions."}
          </p>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300/90 bg-zinc-50/50 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400">
            You haven&apos;t turned on auto-analyze for any repo yet.{" "}
            <Link
              href="/connect"
              className="font-medium text-zinc-700 underline dark:text-zinc-300"
            >
              Pick a repo on Connect
            </Link>{" "}
            and flip the toggle.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
            {rows.map((row) => (
              <li
                key={row.fullName}
                className="flex flex-col gap-3 py-3 first:pt-1 last:pb-1 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://github.com/${row.fullName}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                    >
                      {row.fullName}
                    </a>
                    {row.lastRun ? (
                      <Badge variant={verdictBadgeVariant(row.lastRun.decision)}>
                        {row.lastRun.decision}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {row.lastRun ? (
                      <>
                        Last run{" "}
                        <Link
                          href={`/results/${row.lastRun.id}`}
                          className="tabular-nums font-medium text-zinc-700 underline dark:text-zinc-300"
                        >
                          score {row.lastRun.score}
                        </Link>{" "}
                        · {new Date(row.lastRun.createdAt).toLocaleString()}
                        {row.runsShown > 1
                          ? ` · ${row.runsShown} runs shown`
                          : ""}
                      </>
                    ) : (
                      <>
                        No analyses yet — next PR on this repo will trigger one
                        automatically.
                      </>
                    )}
                  </p>
                </div>
                <AutoAnalyzeToggle
                  owner={row.owner}
                  repo={row.repo}
                  subscribed={true}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
