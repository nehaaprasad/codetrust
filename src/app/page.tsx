"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { ScoringExplainer } from "@/components/scoring-explainer";
import { dimensionRowsForDisplay } from "@/lib/analysis/dimensionScoresDisplay";

type AnalyzeResponse = {
  id: string | null;
  prCommentUrl?: string | null;
  prCommentId?: string | null;
  async?: boolean;
  score: number;
  decision: string;
  summary: string;
  issues: {
    category: string;
    severity: string;
    message: string;
    filePath?: string;
    lineNumber?: number | null;
  }[];
  sources?: Array<{
    url?: string | null;
    title?: string | null;
    excerpt?: string | null;
    trustLevel?: string | null;
  }>;
  dimensionScores?: Record<string, number>;
};

async function waitForJobResult(
  jobId: string,
  onProgress?: (label: string) => void,
): Promise<AnalyzeResponse> {
  const maxAttempts = 180;
  const delayMs = 1000;
  for (let i = 0; i < maxAttempts; i += 1) {
    const res = await fetch(`/api/jobs/${jobId}`);
    const data = (await res.json()) as {
      error?: string;
      state?: string;
      failedReason?: string | null;
      result?: AnalyzeResponse | null;
      progressLabel?: string;
    };
    if (!res.ok) {
      throw new Error(data.error ?? "Could not read job status.");
    }
    if (data.progressLabel) {
      onProgress?.(data.progressLabel);
    }
    if (data.state === "completed" && data.result) {
      return data.result;
    }
    if (data.state === "failed") {
      throw new Error(data.failedReason ?? "Analysis job failed.");
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error("Timed out waiting for analysis.");
}

function verdictBadgeVariant(
  d: string,
): "default" | "secondary" | "risky" | "block" {
  if (d === "SAFE") return "default";
  if (d === "RISKY") return "risky";
  if (d === "BLOCK") return "block";
  return "secondary";
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [code, setCode] = useState("");
  const [prUrl, setPrUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inline, setInline] = useState<AnalyzeResponse | null>(null);
  const [queueHint, setQueueHint] = useState<string | null>(null);

  useEffect(() => {
    const p = searchParams.get("prUrl");
    if (p) setPrUrl(p);
  }, [searchParams]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInline(null);
    setQueueHint(null);
    setLoading(true);
    try {
      const body: Record<string, unknown> = {};
      if (prUrl.trim()) body.prUrl = prUrl.trim();
      else if (code.trim()) body.code = code.trim();
      else {
        setError("Paste code or enter a GitHub pull request URL.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as AnalyzeResponse & {
        error?: string;
        jobId?: string;
        async?: boolean;
      };

      if (!res.ok) {
        setError(data.error ?? "Analysis failed.");
        setLoading(false);
        return;
      }

      if (res.status === 202 && data.jobId) {
        setQueueHint("Queued…");
        const result = await waitForJobResult(data.jobId, (label) => {
          setQueueHint(`${label}…`);
        });
        setQueueHint(null);
        if (result.id) {
          router.push(`/results/${result.id}`);
          return;
        }
        setInline(result);
        return;
      }

      if (data.id) {
        router.push(`/results/${data.id}`);
        return;
      }
      setInline(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
    } finally {
      setLoading(false);
      setQueueHint(null);
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 text-zinc-900 dark:bg-transparent dark:text-zinc-100">
      <AppNav />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-16">
        <header className="space-y-6 text-left">
          <p className="text-sm font-normal tracking-[-0.01em] text-zinc-500 dark:text-zinc-500">
            ai code trust
          </p>
          <h1 className="max-w-[22ch] font-sans text-[2.375rem] font-light leading-[1.12] tracking-[-0.035em] sm:text-5xl sm:leading-[1.1] sm:tracking-[-0.04em]">
            <span className="block text-zinc-900 dark:text-[#fcfcf0]">
              decide if code
            </span>
            <span className="mt-1 block font-extralight text-zinc-500 dark:text-[#a1a1a1]">
              is safe to ship
            </span>
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-lg">
            Paste a snippet or analyze a GitHub pull request. You get a trust score,
            a clear verdict, and the highest-impact issues first — not a wall of
            noise.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            {session ? (
              <Button type="button" size="lg" asChild>
                <Link href="/connect">Connect repositories & pick a PR</Link>
              </Button>
            ) : (
              <Button type="button" size="lg" asChild>
                <Link href="/connect">Sign in to browse repos & PRs</Link>
              </Button>
            )}
          </div>
        </header>

        <Card className="overflow-hidden rounded-2xl border-zinc-200/90 bg-white/90 shadow-xl shadow-zinc-900/5 backdrop-blur-sm dark:border-zinc-700/60 dark:bg-zinc-950/50 dark:shadow-[0_0_0_1px_rgba(63,63,70,0.4),0_24px_64px_-28px_rgba(0,0,0,0.55)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold">Run analysis</CardTitle>
            <CardDescription className="text-base">
              PR analysis needs a server{" "}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                GITHUB_TOKEN
              </code>{" "}
              to fetch files. Use{" "}
              <Link href="/connect" className="font-medium text-zinc-700 underline decoration-zinc-400/60 underline-offset-2 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:decoration-zinc-500/50 dark:hover:text-white">
                Connect
              </Link>{" "}
              to choose a PR, or paste a PR URL below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="flex flex-col gap-6">
              <div className="space-y-2">
                <label htmlFor="prUrl" className="text-sm font-medium">
                  GitHub pull request URL (optional)
                </label>
                <Input
                  id="prUrl"
                  type="url"
                  name="prUrl"
                  placeholder="https://github.com/owner/repo/pull/123"
                  value={prUrl}
                  onChange={(e) => setPrUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="code" className="text-sm font-medium">
                  Or paste code
                </label>
                <Textarea
                  id="code"
                  name="code"
                  rows={14}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="// Your code…"
                  className="font-mono text-sm leading-relaxed"
                />
              </div>

              {queueHint ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{queueHint}</p>
              ) : null}

              {error ? (
                <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                  {error}
                </p>
              ) : null}

              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? "Analyzing…" : "Run analysis"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <ScoringExplainer />

        {inline ? (
          <Card className="overflow-hidden rounded-2xl border-zinc-200/90 bg-white/90 shadow-lg dark:border-zinc-700/60 dark:bg-zinc-950/50 dark:shadow-[0_0_0_1px_rgba(63,63,70,0.4),0_24px_64px_-28px_rgba(0,0,0,0.55)]">
            <CardHeader>
              <CardTitle className="text-base">Result</CardTitle>
              <CardDescription>
                No database id — this run was not persisted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResultSummary data={inline} />
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full flex-1 items-center justify-center bg-zinc-50 text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
          Loading…
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}

function ResultSummary({ data }: { data: AnalyzeResponse }) {
  const dimRows = dimensionRowsForDisplay(data.dimensionScores ?? null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500">Trust score</p>
          <p className="bg-gradient-to-br from-zinc-900 to-zinc-600 bg-clip-text text-4xl font-semibold tabular-nums text-transparent dark:from-white dark:to-zinc-400">
            {data.score}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-zinc-500">Verdict</p>
          <p className="pt-1">
            <Badge variant={verdictBadgeVariant(data.decision)}>
              {data.decision}
            </Badge>
          </p>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {data.summary}
      </p>
      {dimRows.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {dimRows.map((row) => (
            <li
              key={row.key}
              className="flex justify-between rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs dark:border-zinc-800 dark:bg-zinc-950"
            >
              <span>
                {row.label} ({row.weightPct}%)
              </span>
              <span className="tabular-nums font-medium">{row.score}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {data.prCommentUrl ? (
        <p className="text-sm">
          <a
            href={data.prCommentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-zinc-700 underline decoration-zinc-400/60 underline-offset-2 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:decoration-zinc-500/50 dark:hover:text-white"
          >
            View comment on GitHub
          </a>
        </p>
      ) : null}
      <ul className="space-y-2">
        {data.issues.slice(0, 12).map((issue, i) => (
          <li
            key={`${issue.message}-${i}`}
            className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              [{issue.category}] {issue.severity}
            </span>
            <span className="text-zinc-600 dark:text-zinc-400">
              {" "}
              — {issue.message}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
