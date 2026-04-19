"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AppNav } from "@/components/app-nav";
import { ScoringExplainer } from "@/components/scoring-explainer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IssueDetailList } from "@/components/issue-detail-list";
import { dimensionRowsForDisplay } from "@/lib/analysis/dimensionScoresDisplay";
import { cn } from "@/lib/utils";

function verdictBadgeVariant(
  d: string,
): "default" | "secondary" | "risky" | "block" {
  if (d === "SAFE") return "default";
  if (d === "RISKY") return "risky";
  if (d === "BLOCK") return "block";
  return "secondary";
}

function verdictAccentBorder(d: string): string {
  if (d === "SAFE") return "border-l-zinc-400 dark:border-l-zinc-500";
  if (d === "RISKY") return "border-l-amber-500 dark:border-l-amber-400";
  if (d === "BLOCK") return "border-l-red-500 dark:border-l-red-400";
  return "border-l-zinc-300 dark:border-l-zinc-600";
}

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
  outcome: string | null;
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
      <Card className="overflow-hidden rounded-xl border-zinc-200/90 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 dark:shadow-none">
        <CardHeader className="border-b border-zinc-100 dark:border-zinc-800">
          <CardTitle className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            History for this repository
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8">
          <div className="flex items-center gap-3">
            <div
              className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300"
              aria-hidden
            />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
          </div>
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
      <Card className="overflow-hidden rounded-xl border-zinc-200/90 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 dark:shadow-none">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            History for this repository
          </CardTitle>
          <CardDescription className="text-xs">
            This is the first saved analysis for this repo.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-xl border-zinc-200/90 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 dark:shadow-none">
      <CardHeader className="border-b border-zinc-100 pb-4 dark:border-zinc-800">
        <CardTitle className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Previous analyses for this repository
        </CardTitle>
        <CardDescription className="text-xs">
          Other runs targeting the same GitHub repo (newest first).
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {others.map((row) => (
            <li key={row.id}>
              <Link
                href={`/results/${row.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
              >
                <span className="min-w-0 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                  {new Date(row.createdAt).toLocaleString()}
                  {row.prNumber != null ? (
                    <span className="text-zinc-400"> · PR #{row.prNumber}</span>
                  ) : null}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="tabular-nums text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {row.score}
                  </span>
                  <Badge variant={verdictBadgeVariant(row.decision)} className="rounded-md text-[11px]">
                    {row.decision}
                  </Badge>
                </span>
              </Link>
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
        <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
          <p className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400">
            Missing analysis id.
          </p>
        </div>
      </Shell>
    );
  }

  if (q.isPending) {
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-24">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300"
            aria-hidden
          />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading analysis…</p>
        </div>
      </Shell>
    );
  }

  if (q.isError) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
          <div className="rounded-xl border border-red-200 bg-red-50/80 px-5 py-4 dark:border-red-900/60 dark:bg-red-950/30">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              {q.error instanceof Error ? q.error.message : "Error"}
            </p>
            <Link
              href="/analyze"
              className="mt-4 inline-flex text-sm font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
            >
              ← Back to analyze
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  const data = q.data;
  if (!data) return null;

  const dimRows = dimensionRowsForDisplay(data.dimensionScores ?? null);

  return (
    <Shell>
      <main className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href="/analyze"
          className="w-fit text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          ← New analysis
        </Link>

        <header className="space-y-6">
          <div
            className={cn(
              "overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm dark:border-zinc-700/60 dark:bg-zinc-950/55 dark:shadow-[0_0_0_1px_rgba(63,63,70,0.45),0_24px_64px_-24px_rgba(0,0,0,0.65),0_0_48px_-12px_rgba(56,189,248,0.12)]",
              "border-l-4",
              verdictAccentBorder(data.decision),
            )}
          >
            <div className="px-5 py-6 sm:px-8 sm:py-8">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-6">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                    <time dateTime={data.createdAt}>
                      {new Date(data.createdAt).toLocaleString()}
                    </time>
                    <span className="hidden text-zinc-300 sm:inline dark:text-zinc-600">·</span>
                    <span>
                      <span className="text-zinc-400">model</span>{" "}
                      <span className="text-zinc-700 dark:text-zinc-300">{data.modelVersion}</span>
                    </span>
                    {data.prCommentUrl ? (
                      <>
                        <span className="hidden text-zinc-300 sm:inline dark:text-zinc-600">·</span>
                        <a
                          href={data.prCommentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-700 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:decoration-zinc-600 dark:hover:text-white"
                        >
                          Comment on GitHub
                        </a>
                      </>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-end gap-10">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                        Trust score
                      </p>
                      <p className="mt-1 bg-gradient-to-br from-zinc-950 to-zinc-600 bg-clip-text text-6xl font-semibold tabular-nums tracking-tight text-transparent dark:from-white dark:to-zinc-400">
                        {data.score}
                      </p>
                    </div>
                    <div className="pb-1">
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                        Verdict
                      </p>
                      <div className="mt-2">
                        <Badge
                          variant={verdictBadgeVariant(data.decision)}
                          className="rounded-full px-4 py-1.5 text-sm font-semibold tracking-wide"
                        >
                          {data.decision}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {data.previousScore != null && data.previousDecision != null ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/90 dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="border-b border-zinc-200/80 px-5 py-4 dark:border-zinc-800">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Before / after
                </h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Compared to the prior saved analysis for this repository.
                </p>
              </div>
              <div className="grid gap-6 px-5 py-5 sm:grid-cols-3 sm:gap-8">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                    Previous
                  </p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {data.previousScore}
                  </p>
                  <Badge variant={verdictBadgeVariant(data.previousDecision)} className="mt-2 rounded-md text-xs">
                    {data.previousDecision}
                  </Badge>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                    Current
                  </p>
                  <p className="mt-1 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {data.score}
                  </p>
                  <Badge variant={verdictBadgeVariant(data.decision)} className="mt-2 rounded-md text-xs">
                    {data.decision}
                  </Badge>
                </div>
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                    Delta
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-3xl font-semibold tabular-nums",
                      data.score - data.previousScore >= 0
                        ? "text-zinc-600 dark:text-zinc-300"
                        : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {data.score - data.previousScore >= 0 ? "+" : ""}
                    {data.score - data.previousScore}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {data.repoUrl ? (
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              <span className="text-zinc-500 dark:text-zinc-500">Repository</span>{" "}
              <a
                href={data.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 transition-colors hover:decoration-zinc-500 dark:text-zinc-100 dark:decoration-zinc-600"
              >
                {data.repoUrl.replace(/^https:\/\/github\.com\//, "")}
              </a>
              {data.prUrl != null && data.prNumber != null ? (
                <>
                  {" "}
                  <span className="text-zinc-400">·</span>{" "}
                  <a
                    href={data.prUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 transition-colors hover:decoration-zinc-500 dark:text-zinc-100 dark:decoration-zinc-600"
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

        <section className="rounded-xl border border-zinc-200/90 bg-white px-5 py-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 dark:shadow-none sm:px-6 sm:py-7">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
            Summary
          </h2>
          <p className="mt-3 text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
            {data.summary}
          </p>
        </section>

        {dimRows.length > 0 ? (
          <Card className="overflow-hidden rounded-xl border-zinc-200/90 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 dark:shadow-none">
            <CardHeader className="border-b border-zinc-100 dark:border-zinc-800">
              <CardTitle className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Dimension scores
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                0–100 per category (higher is better). Weights match the explainer
                below.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <ul className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                {dimRows.map((row) => (
                  <li
                    key={row.key}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200/90 bg-zinc-50/80 px-3 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-950/40"
                  >
                    <span className="min-w-0 text-zinc-700 dark:text-zinc-300">
                      {row.label}{" "}
                      <span className="text-zinc-400 dark:text-zinc-500">({row.weightPct}%)</span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 tabular-nums text-sm font-semibold",
                        row.score >= 85
                          ? "text-zinc-600 dark:text-zinc-300"
                          : row.score >= 60
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-red-600 dark:text-red-400",
                      )}
                    >
                      {row.score}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        <ScoringExplainer />

        <section className="space-y-4">
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
              Issues
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Expand each row for why it matters and where it was detected.
            </p>
          </div>
          <IssueDetailList issues={data.issues} />
        </section>

        {data.sources.length > 0 ? (
          <section className="rounded-xl border border-zinc-200/90 bg-white px-5 py-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 dark:shadow-none sm:px-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
              Sources
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {data.sources.map((s, i) => (
                <li
                  key={i}
                  className="border-b border-zinc-100 pb-3 last:border-0 last:pb-0 dark:border-zinc-800"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{s.title}</span>
                  {s.excerpt ? (
                    <span className="text-zinc-600 dark:text-zinc-400"> — {s.excerpt}</span>
                  ) : null}
                  {s.trustLevel ? (
                    <span className="mt-1 block text-xs text-zinc-500">
                      Trust: {s.trustLevel}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-zinc-200 pt-10 dark:border-zinc-800 sm:flex-row sm:flex-wrap sm:items-center">
          <RerunButton analysisId={id} />
          {data.prUrl ? (
            <Link href={`/results/${id}/diff`} className="sm:ml-0">
              <Button type="button" variant="outline" className="w-full sm:w-auto">
                View PR diff
              </Button>
            </Link>
          ) : null}
        </div>

        {(data.decision === "SAFE" || data.decision === "RISKY") ? (
          <OutcomeFeedback analysisId={id} currentOutcome={data.outcome} />
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
      <Button
        type="button"
        variant="outline"
        onClick={rerun}
        disabled={loading}
        className="w-full border-zinc-300 bg-white font-medium shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:w-auto"
      >
        {loading ? "Re-running…" : "Re-run analysis"}
      </Button>
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function OutcomeFeedback({
  analysisId,
  currentOutcome,
}: {
  analysisId: string;
  currentOutcome: string | null;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(!!currentOutcome);
  const [error, setError] = useState<string | null>(null);

  async function submitOutcome(outcome: "incident" | "clean") {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/analysis/${analysisId}/outcome`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Failed to submit feedback.");
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Feedback recorded. Thank you.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <p className="mb-3 text-sm text-zinc-700 dark:text-zinc-300">
        Did this code cause any issues in production?
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => submitOutcome("incident")}
          disabled={submitting}
          className="border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          Yes, it caused a problem
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => submitOutcome("clean")}
          disabled={submitting}
          className="border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 dark:border-green-900/60 dark:text-green-400 dark:hover:bg-green-950/40"
        >
          No, it was fine
        </Button>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
