"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AppNav } from "@/components/app-nav";
import { ScoringExplainer } from "@/components/scoring-explainer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dimensionRowsForDisplay } from "@/lib/analysis/dimensionScoresDisplay";

type AnalysisPayload = {
  id: string;
  projectId: string | null;
  repoUrl: string | null;
  prUrl: string | null;
  prNumber: number | null;
  score: number;
  decision: string;
  previousScore: number | null;
  previousDecision: string | null;
  summary: string;
  modelVersion: string;
  prCommentUrl: string | null;
  prCommentId: string | null;
  dimensionScores: Record<string, number> | null;
  createdAt: string;
  issues: {
    category: string;
    severity: string;
    message: string;
    filePath: string | null;
    lineNumber: number | null;
  }[];
  sources: {
    url: string | null;
    title: string | null;
    excerpt: string | null;
    trustLevel: string | null;
  }[];
};

type HistoryRow = {
  id: string;
  score: number;
  decision: string;
  prNumber: number | null;
  createdAt: string;
};

function SameRepoHistory({
  repoUrl,
  currentId,
}: {
  repoUrl: string;
  currentId: string;
}) {
  const q = useQuery({
    queryKey: ["analyses", "repo", repoUrl],
    queryFn: async () => {
      const params = new URLSearchParams({
        repoUrl,
        limit: "30",
      });
      const res = await fetch(`/api/analyses?${params.toString()}`);
      const data = (await res.json()) as { items?: HistoryRow[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load history.");
      return data.items ?? [];
    },
  });

  if (q.isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">History for this repository</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500">Loading…</p>
        </CardContent>
      </Card>
    );
  }

  if (q.isError || !q.data?.length) {
    return null;
  }

  const others = q.data.filter((row) => row.id !== currentId);
  if (others.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">History for this repository</CardTitle>
          <CardDescription>This is the first saved analysis for this repo.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Previous analyses for this repository</CardTitle>
        <CardDescription>
          Other runs targeting the same GitHub repo (newest first).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {others.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-2 last:border-0 dark:border-zinc-800"
            >
              <Link
                href={`/results/${row.id}`}
                className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
              >
                {new Date(row.createdAt).toLocaleString()}
                {row.prNumber != null ? ` · PR #${row.prNumber}` : ""}
              </Link>
              <span className="text-zinc-600 dark:text-zinc-400">
                {row.score} · {row.decision}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <AppNav />
      {children}
    </div>
  );
}

export default function ResultPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const q = useQuery({
    queryKey: ["analysis", id],
    queryFn: async () => {
      const res = await fetch(`/api/analysis/${id}`);
      const data = (await res.json()) as AnalysisPayload & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load analysis.");
      return data;
    },
    enabled: Boolean(id),
  });

  if (!id) {
    return (
      <Shell>
        <p className="p-8 text-sm text-zinc-600">Missing analysis id.</p>
      </Shell>
    );
  }

  if (q.isPending) {
    return (
      <Shell>
        <div className="flex flex-1 items-center justify-center p-8 text-zinc-600">
          Loading analysis…
        </div>
      </Shell>
    );
  }

  if (q.isError) {
    return (
      <Shell>
        <div className="mx-auto max-w-2xl space-y-4 p-8">
          <p className="text-sm text-red-600">
            {q.error instanceof Error ? q.error.message : "Error"}
          </p>
          <Link href="/" className="text-sm font-medium text-emerald-700 underline">
            Back home
          </Link>
        </div>
      </Shell>
    );
  }

  const data = q.data;
  if (!data) return null;

  const verdictClass =
    data.decision === "SAFE"
      ? "text-emerald-600 dark:text-emerald-400"
      : data.decision === "RISKY"
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  const dimRows = dimensionRowsForDisplay(data.dimensionScores ?? null);

  return (
    <Shell>
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-12">
        <Link
          href="/"
          className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          ← New analysis
        </Link>

        <header className="space-y-2">
          <p className="text-xs uppercase text-zinc-500">
            {new Date(data.createdAt).toLocaleString()}
          </p>
          <p className="text-xs text-zinc-500">
            Model: <span className="font-mono text-zinc-700 dark:text-zinc-300">{data.modelVersion}</span>
          </p>
          {data.prCommentUrl ? (
            <p className="text-sm">
              <a
                href={data.prCommentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-emerald-700 underline dark:text-emerald-400"
              >
                View comment on GitHub
              </a>
            </p>
          ) : null}
          <div className="flex flex-wrap items-end gap-8">
            <div>
              <p className="text-xs uppercase text-zinc-500">Trust score</p>
              <p className="text-5xl font-semibold tabular-nums">{data.score}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-zinc-500">Verdict</p>
              <p className={`text-3xl font-semibold ${verdictClass}`}>
                {data.decision}
              </p>
            </div>
          </div>
          {data.previousScore != null && data.previousDecision != null ? (
            <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Before / after</CardTitle>
                <CardDescription>
                  Compared to the prior saved analysis for this repository.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-8 text-sm">
                  <div>
                    <p className="text-xs uppercase text-zinc-500">Previous</p>
                    <p className="text-2xl font-semibold tabular-nums">{data.previousScore}</p>
                    <p className="text-zinc-600 dark:text-zinc-400">{data.previousDecision}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-zinc-500">Current</p>
                    <p className="text-2xl font-semibold tabular-nums">{data.score}</p>
                    <p className="text-zinc-600 dark:text-zinc-400">{data.decision}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-zinc-500">Delta</p>
                    <p className="text-2xl font-semibold tabular-nums">
                      {data.score - data.previousScore >= 0 ? "+" : ""}
                      {data.score - data.previousScore}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
          {data.repoUrl ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Repository:{" "}
              <a
                href={data.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-emerald-700 underline dark:text-emerald-400"
              >
                {data.repoUrl.replace(/^https:\/\/github\.com\//, "")}
              </a>
              {data.prUrl != null && data.prNumber != null ? (
                <>
                  {" "}
                  ·{" "}
                  <a
                    href={data.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-emerald-700 underline dark:text-emerald-400"
                  >
                    PR #{data.prNumber}
                  </a>
                </>
              ) : null}
            </p>
          ) : null}
        </header>

        {data.repoUrl ? (
          <SameRepoHistory repoUrl={data.repoUrl} currentId={data.id} />
        ) : null}

        <p className="text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
          {data.summary}
        </p>

        {dimRows.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dimension scores</CardTitle>
              <CardDescription>
                0–100 per category (higher is better). Weights match the explainer
                below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-3 sm:grid-cols-2">
                {dimRows.map((row) => (
                  <li
                    key={row.key}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {row.label}{" "}
                      <span className="text-zinc-400">({row.weightPct}%)</span>
                    </span>
                    <span className="tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                      {row.score}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        <ScoringExplainer />

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Top issues
          </h2>
          <ul className="space-y-2">
            {data.issues.map((issue, i) => (
              <li
                key={`${issue.message}-${i}`}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                  [{issue.category}] {issue.severity}
                </div>
                <p className="mt-1 text-zinc-700 dark:text-zinc-300">{issue.message}</p>
                {issue.filePath ? (
                  <p className="mt-1 font-mono text-xs text-zinc-500">
                    {issue.filePath}
                    {issue.lineNumber != null ? `:${issue.lineNumber}` : ""}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        {data.sources.length > 0 ? (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Sources
            </h2>
            <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
              {data.sources.map((s, i) => (
                <li key={i}>
                  {s.title}
                  {s.excerpt ? ` — ${s.excerpt}` : ""}
                  {s.trustLevel ? (
                    <span className="text-zinc-500"> ({s.trustLevel} trust)</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <RerunButton analysisId={id} />

        {data.prUrl ? (
          <Link href={`/results/${id}/diff`}>
            <Button type="button" variant="outline">
              View PR diff
            </Button>
          </Link>
        ) : null}
      </main>
    </Shell>
  );
}

function RerunButton({ analysisId }: { analysisId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rerun() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/analysis/${analysisId}/rerun`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Rerun failed.");
        setLoading(false);
        return;
      }
      window.location.reload();
    } catch {
      setError("Network error.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" onClick={rerun} disabled={loading}>
        {loading ? "Re-running…" : "Re-run analysis"}
      </Button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
