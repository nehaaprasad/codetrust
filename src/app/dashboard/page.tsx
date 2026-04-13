"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";
import { useSession } from "next-auth/react";
import { AppNav } from "@/components/app-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type VerdictFilter,
  useDashboardUiStore,
} from "@/stores/dashboard-ui";

type Row = {
  id: string;
  repoUrl: string | null;
  prUrl: string | null;
  prNumber: number | null;
  score: number;
  decision: string;
  summary: string;
  prCommentUrl: string | null;
  createdAt: string;
};

function verdictBadgeVariant(
  d: string,
): "default" | "secondary" | "risky" | "block" {
  if (d === "SAFE") return "default";
  if (d === "RISKY") return "risky";
  if (d === "BLOCK") return "block";
  return "secondary";
}

type Health = {
  database?: "configured" | "missing";
};

type GitHubRepoLite = { fullName: string; htmlUrl: string };

export default function DashboardPage() {
  const verdictFilter = useDashboardUiStore((s) => s.verdictFilter);
  const setVerdictFilter = useDashboardUiStore((s) => s.setVerdictFilter);
  const { status: sessionStatus } = useSession();

  const health = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await fetch("/api/health");
      return (await res.json()) as Health;
    },
  });

  const dbReady = health.data?.database === "configured";

  const q = useQuery({
    queryKey: ["analyses", verdictFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50" });
      if (verdictFilter !== "all") {
        params.set("decision", verdictFilter);
      }
      const res = await fetch(`/api/analyses?${params.toString()}`);
      const data = (await res.json()) as { items?: Row[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load analyses.");
      return data.items ?? [];
    },
    enabled: dbReady,
  });

  const reposQ = useQuery({
    queryKey: ["github-repos-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/github/repos");
      const data = (await res.json()) as { repos?: GitHubRepoLite[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load repositories.");
      return data.repos ?? [];
    },
    enabled: dbReady && sessionStatus === "authenticated",
    retry: false,
  });

  const scoreTrends = useMemo(() => {
    const items = q.data ?? [];
    const map = new Map<string, { score: number; at: string }[]>();
    for (const row of items) {
      if (!row.repoUrl) continue;
      const arr = map.get(row.repoUrl) ?? [];
      arr.push({ score: row.score, at: row.createdAt });
      map.set(row.repoUrl, arr);
    }
    const out: { repo: string; trail: string }[] = [];
    for (const [repoUrl, runs] of map) {
      const sorted = [...runs].sort(
        (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
      );
      const trail = sorted
        .slice(0, 5)
        .reverse()
        .map((r) => String(r.score))
        .join(" → ");
      const short = repoUrl.replace(/^https:\/\/github\.com\//, "");
      out.push({ repo: short, trail });
    }
    out.sort((a, b) => a.repo.localeCompare(b.repo));
    return out.slice(0, 12);
  }, [q.data]);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <AppNav />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-10">
        <header className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            AI Code Trust
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Recent analyses
          </h1>
          <p className="max-w-2xl text-zinc-600 dark:text-zinc-400">
            Saved runs from Postgres. Filter by verdict; open a row for full detail.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
          <aside className="space-y-6">
            {dbReady && sessionStatus === "authenticated" ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Your repositories</CardTitle>
                  <CardDescription>
                    From GitHub OAuth.{" "}
                    <Link
                      href="/connect"
                      className="font-medium text-emerald-700 underline dark:text-emerald-400"
                    >
                      Connect
                    </Link>{" "}
                    to pick a PR.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {reposQ.isPending ? (
                    <p className="text-sm text-zinc-500">Loading…</p>
                  ) : reposQ.isError ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {reposQ.error instanceof Error
                        ? reposQ.error.message
                        : "Could not load repos. Sign out and sign in again if you added OAuth recently."}
                    </p>
                  ) : !reposQ.data?.length ? (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      No repositories returned.
                    </p>
                  ) : (
                    <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
                      {reposQ.data.slice(0, 20).map((r) => (
                        <li key={r.fullName}>
                          <a
                            href={r.htmlUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-700 hover:underline dark:text-emerald-400"
                          >
                            {r.fullName}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {dbReady && scoreTrends.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Score trail</CardTitle>
                  <CardDescription>
                    Recent trust scores per repo (oldest → newest in each line).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm">
                    {scoreTrends.map((t) => (
                      <li key={t.repo}>
                        <p className="font-medium text-zinc-800 dark:text-zinc-200">{t.repo}</p>
                        <p className="tabular-nums text-zinc-600 dark:text-zinc-400">{t.trail}</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
          </aside>

          <div className="min-w-0">
            <Card>
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg">Runs</CardTitle>
                  <CardDescription>
                    Zustand holds the filter; React Query refetches when it changes.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      "all",
                      "SAFE",
                      "RISKY",
                      "BLOCK",
                    ] as const satisfies readonly VerdictFilter[]
                  ).map((v) => (
                    <Button
                      key={v}
                      type="button"
                      size="sm"
                      variant={verdictFilter === v ? "default" : "outline"}
                      onClick={() => setVerdictFilter(v)}
                    >
                      {v === "all" ? "All" : v}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                {health.isPending ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>
                ) : !dbReady ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Configure{" "}
                    <code className="rounded bg-zinc-200 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">
                      DATABASE_URL
                    </code>{" "}
                    and run{" "}
                    <code className="rounded bg-zinc-200 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">
                      npm run db:push
                    </code>{" "}
                    to list saved analyses here. The banner at the top explains the steps.
                  </p>
                ) : q.isPending ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>
                ) : q.isError ? (
                  <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                    {q.error instanceof Error ? q.error.message : "Error"}
                  </p>
                ) : !q.data?.length ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    No analyses yet. Run one from the home page (requires{" "}
                    <code className="rounded bg-zinc-200 px-1 py-0.5 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      DATABASE_URL
                    </code>
                    ).
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>Repo / PR</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Verdict</TableHead>
                        <TableHead className="max-w-md">Summary</TableHead>
                        <TableHead className="text-right">Open</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {q.data.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                            {new Date(row.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate text-xs text-zinc-600 dark:text-zinc-400">
                            {row.repoUrl
                              ? row.repoUrl.replace(/^https:\/\/github\.com\//, "")
                              : "—"}
                            {row.prNumber != null ? ` · #${row.prNumber}` : ""}
                          </TableCell>
                          <TableCell className="tabular-nums font-medium">
                            {row.score}
                          </TableCell>
                          <TableCell>
                            <Badge variant={verdictBadgeVariant(row.decision)}>
                              {row.decision}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-md truncate text-zinc-700 dark:text-zinc-300">
                            {row.summary}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="link" size="sm" asChild>
                              <Link href={`/results/${row.id}`}>Details</Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
