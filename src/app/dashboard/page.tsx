"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
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

export default function DashboardPage() {
  const verdictFilter = useDashboardUiStore((s) => s.verdictFilter);
  const setVerdictFilter = useDashboardUiStore((s) => s.setVerdictFilter);

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

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <AppNav />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
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
      </main>
    </div>
  );
}
