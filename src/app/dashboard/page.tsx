"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
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

type UsagePayload = {
  totalAnalyses: number;
  last7Days: number;
  byDecision: { SAFE: number; RISKY: number; BLOCK: number };
  apiKeys: Array<{
    id: string;
    name: string;
    prefix: string;
    lastUsedAt: string | null;
    revokedAt: string | null;
    createdAt: string;
    analysisCount: number;
  }>;
};

export default function DashboardPage() {
  const verdictFilter = useDashboardUiStore((s) => s.verdictFilter);
  const setVerdictFilter = useDashboardUiStore((s) => s.setVerdictFilter);
  const { status: sessionStatus } = useSession();
  const queryClient = useQueryClient();
  const [listScope, setListScope] = useState<"all" | "mine">("mine");
  const [newKeyLabel, setNewKeyLabel] = useState("CI / scripts");
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  /** Guests always query all runs; signed-in users respect the My / All toggle. */
  const effectiveListScope =
    sessionStatus === "unauthenticated" ? "all" : listScope;

  const health = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await fetch("/api/health");
      return (await res.json()) as Health;
    },
  });

  const dbReady = health.data?.database === "configured";

  const usageQ = useQuery({
    queryKey: ["dashboard-usage"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/usage");
      const data = (await res.json()) as UsagePayload & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load usage.");
      return data;
    },
    enabled: dbReady && sessionStatus === "authenticated",
  });

  const createKey = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyLabel.trim() || "API key" }),
      });
      const data = (await res.json()) as {
        key?: string;
        error?: string;
        warning?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Could not create key.");
      return data.key ?? "";
    },
    onSuccess: (key) => {
      setRevealedKey(key);
      void queryClient.invalidateQueries({ queryKey: ["dashboard-usage"] });
    },
  });

  const revokeKey = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not revoke.");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dashboard-usage"] });
    },
  });

  const q = useQuery({
    queryKey: ["analyses", verdictFilter, effectiveListScope, sessionStatus],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50" });
      if (verdictFilter !== "all") {
        params.set("decision", verdictFilter);
      }
      if (sessionStatus === "authenticated" && effectiveListScope === "mine") {
        params.set("scope", "mine");
      }
      const res = await fetch(`/api/analyses?${params.toString()}`);
      const data = (await res.json()) as { items?: Row[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load analyses.");
      return data.items ?? [];
    },
    enabled: dbReady && sessionStatus !== "loading",
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
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 text-zinc-900 dark:bg-transparent dark:text-zinc-100">
      <AppNav />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
        <header className="space-y-6 text-left">
          <p className="text-sm font-normal tracking-[-0.01em] text-zinc-500 dark:text-zinc-500">
            ai code trust
          </p>
          <h1 className="max-w-[20ch] font-sans text-[2.375rem] font-light leading-[1.12] tracking-[-0.035em] sm:text-5xl sm:leading-[1.1] sm:tracking-[-0.04em]">
            <span className="block text-zinc-900 dark:text-[#fcfcf0]">developer</span>
            <span className="mt-1 block font-extralight text-zinc-500 dark:text-[#a1a1a1]">
              dashboard
            </span>
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-lg">
            Usage for your account, API keys for programmatic{" "}
            <code className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-sm dark:bg-zinc-800">
              POST /api/analyze
            </code>
            , and saved runs.
          </p>
        </header>

        {dbReady && sessionStatus === "authenticated" ? (
          <div className="space-y-6">
            {usageQ.isPending ? (
              <p className="text-sm text-zinc-500">Loading usage…</p>
            ) : usageQ.isError ? (
              <p className="text-sm text-red-600" role="alert">
                {usageQ.error instanceof Error ? usageQ.error.message : "Error"}
              </p>
            ) : usageQ.data ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Card className="overflow-hidden rounded-xl border-zinc-200/90 bg-white/90 shadow-lg shadow-zinc-900/5 backdrop-blur-sm dark:border-zinc-700/60 dark:bg-zinc-950/50 dark:shadow-[0_0_0_1px_rgba(63,63,70,0.4),0_16px_48px_-20px_rgba(0,0,0,0.4)]">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Your analyses (all time)
                      </CardDescription>
                      <CardTitle className="text-4xl font-bold tabular-nums tracking-tight">
                        {usageQ.data.totalAnalyses}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="overflow-hidden rounded-xl border-zinc-200/90 bg-white/90 shadow-lg shadow-zinc-900/5 backdrop-blur-sm dark:border-zinc-700/60 dark:bg-zinc-950/50 dark:shadow-[0_0_0_1px_rgba(63,63,70,0.4),0_16px_48px_-20px_rgba(0,0,0,0.4)]">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Last 7 days
                      </CardDescription>
                      <CardTitle className="text-4xl font-bold tabular-nums tracking-tight">
                        {usageQ.data.last7Days}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="overflow-hidden rounded-xl border-zinc-200/90 bg-white/90 shadow-lg shadow-zinc-900/5 backdrop-blur-sm dark:border-zinc-700/60 dark:bg-zinc-950/50 dark:shadow-[0_0_0_1px_rgba(63,63,70,0.4),0_16px_48px_-20px_rgba(0,0,0,0.4)]">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        SAFE
                      </CardDescription>
                      <CardTitle className="text-4xl font-bold tabular-nums tracking-tight">
                        {usageQ.data.byDecision.SAFE}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="overflow-hidden rounded-xl border-zinc-200/90 bg-white/90 shadow-lg shadow-zinc-900/5 backdrop-blur-sm dark:border-zinc-700/60 dark:bg-zinc-950/50 dark:shadow-[0_0_0_1px_rgba(63,63,70,0.4),0_16px_48px_-20px_rgba(0,0,0,0.4)]">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        RISKY / BLOCK
                      </CardDescription>
                      <CardTitle className="text-4xl font-bold tabular-nums tracking-tight">
                        {usageQ.data.byDecision.RISKY + usageQ.data.byDecision.BLOCK}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                <Card className="overflow-hidden rounded-2xl border-zinc-200/90 dark:border-zinc-700/55">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold tracking-[-0.02em]">
                      API keys
                    </CardTitle>
                    <CardDescription>
                      Use{" "}
                      <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">
                        Authorization: Bearer &lt;key&gt;
                      </code>{" "}
                      or header{" "}
                      <code className="rounded bg-zinc-100 px-1 font-mono text-xs dark:bg-zinc-800">
                        X-API-Key
                      </code>
                      . Keys are shown once when created.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {revealedKey ? (
                      <div
                        className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40"
                        role="status"
                      >
                        <p className="font-medium text-amber-900 dark:text-amber-200">
                          Copy your new key (won&apos;t be shown again)
                        </p>
                        <code className="mt-2 block break-all font-mono text-xs text-zinc-800 dark:text-zinc-200">
                          {revealedKey}
                        </code>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => {
                            void navigator.clipboard.writeText(revealedKey);
                          }}
                        >
                          Copy
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-2 ml-2"
                          onClick={() => setRevealedKey(null)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    ) : null}

                    <div className="flex max-w-md flex-col gap-2 sm:flex-row sm:items-end">
                      <div className="flex-1 space-y-1">
                        <label htmlFor="keyName" className="text-sm font-medium">
                          Label
                        </label>
                        <Input
                          id="keyName"
                          value={newKeyLabel}
                          onChange={(e) => setNewKeyLabel(e.target.value)}
                          placeholder="e.g. CI pipeline"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={() => createKey.mutate()}
                        disabled={createKey.isPending}
                      >
                        {createKey.isPending ? "Creating…" : "Create key"}
                      </Button>
                    </div>
                    {createKey.isError ? (
                      <p className="text-sm text-red-600" role="alert">
                        {createKey.error instanceof Error
                          ? createKey.error.message
                          : "Error"}
                      </p>
                    ) : null}

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Key</TableHead>
                          <TableHead>Analyses</TableHead>
                          <TableHead>Last used</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usageQ.data.apiKeys.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-zinc-500">
                              No keys yet. Create one for scripts or CI calling the API.
                            </TableCell>
                          </TableRow>
                        ) : (
                          usageQ.data.apiKeys.map((k) => (
                            <TableRow key={k.id}>
                              <TableCell className="font-mono text-xs">
                                {k.name}{" "}
                                <span className="text-zinc-500">({k.prefix})</span>
                                {k.revokedAt ? (
                                  <Badge variant="secondary" className="ml-2">
                                    Revoked
                                  </Badge>
                                ) : null}
                              </TableCell>
                              <TableCell className="tabular-nums">{k.analysisCount}</TableCell>
                              <TableCell className="text-xs text-zinc-600 dark:text-zinc-400">
                                {k.lastUsedAt
                                  ? new Date(k.lastUsedAt).toLocaleString()
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                {!k.revokedAt ? (
                                  <Button
                                    type="button"
                                    variant="link"
                                    size="sm"
                                    className="text-red-600"
                                    disabled={revokeKey.isPending}
                                    onClick={() => {
                                      if (
                                        confirm(
                                          "Revoke this key? API clients using it will get 401.",
                                        )
                                      ) {
                                        revokeKey.mutate(k.id);
                                      }
                                    }}
                                  >
                                    Revoke
                                  </Button>
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>
        ) : null}

        {sessionStatus === "unauthenticated" && dbReady ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            <Link href="/api/auth/signin" className="font-medium text-zinc-700 underline dark:text-zinc-300">
              Sign in
            </Link>{" "}
            to see usage and API keys. The runs table below lists all stored analyses on this instance.
          </p>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
          <aside className="space-y-6">
            {dbReady && sessionStatus === "authenticated" ? (
              <Card className="overflow-hidden rounded-2xl border-zinc-200/90 dark:border-zinc-700/55">
                <CardHeader>
                  <CardTitle className="text-base font-semibold tracking-[-0.02em]">
                    Your repositories
                  </CardTitle>
                  <CardDescription>
                    From GitHub OAuth.{" "}
                    <Link
                      href="/connect"
                      className="font-medium text-zinc-700 underline dark:text-zinc-300"
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
                    <div className="overflow-hidden rounded-lg border border-zinc-200/90 dark:border-zinc-800/90">
                      <div className="border-b border-zinc-200/90 bg-zinc-50/95 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-400">
                        Repository
                      </div>
                      <ul className="max-h-64 divide-y divide-zinc-200 overflow-y-auto text-sm dark:divide-zinc-800/80">
                        {reposQ.data.slice(0, 20).map((r) => (
                          <li key={r.fullName}>
                            <a
                              href={r.htmlUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block px-3 py-2.5 font-medium text-zinc-800 transition-colors hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800/50 dark:hover:text-white"
                            >
                              {r.fullName}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {dbReady && scoreTrends.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Score trail</CardTitle>
                  <CardDescription>
                    From the current table filter (oldest → newest in each line).
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
                    {sessionStatus === "authenticated"
                      ? effectiveListScope === "mine"
                        ? "Analyses started while you were signed in or with your API keys."
                        : "All analyses stored in this database."
                      : "All analyses stored in this database."}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {sessionStatus === "authenticated" ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant={listScope === "mine" ? "default" : "outline"}
                        onClick={() => setListScope("mine")}
                      >
                        My runs
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={listScope === "all" ? "default" : "outline"}
                        onClick={() => setListScope("all")}
                      >
                        All runs
                      </Button>
                    </>
                  ) : null}
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
                      {v === "all" ? "Verdict: all" : v}
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
                    to list saved analyses here.
                  </p>
                ) : q.isPending ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>
                ) : q.isError ? (
                  <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                    {q.error instanceof Error ? q.error.message : "Error"}
                  </p>
                ) : !q.data?.length ? (
                  <div className="rounded-xl border border-dashed border-zinc-300/90 bg-zinc-50/50 px-4 py-10 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400">
                    No analyses in this view. Run one from the home page while signed in to populate
                    &quot;My runs&quot;, or switch to &quot;All runs&quot;.
                  </div>
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
