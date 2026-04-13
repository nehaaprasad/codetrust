"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AppNav } from "@/components/app-nav";
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
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Previous run: {data.previousScore} ({data.previousDecision})
            </p>
          ) : null}
        </header>

        <p className="text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
          {data.summary}
        </p>

        {dimRows.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dimension scores</CardTitle>
              <CardDescription>
                0–100 per category (higher is better). Weights: security 30%, logic
                25%, performance 15%, testing 15%, accessibility 10%, maintainability
                5%.
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

        {data.sources.some((s) => s.url?.includes("/pull/")) ? (
          <Link href={`/results/${id}/diff`}>
            <Button type="button" variant="outline">
              View changes
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
