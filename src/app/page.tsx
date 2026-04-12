"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type AnalyzeResponse = {
  id: string | null;
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
};

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [prUrl, setPrUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inline, setInline] = useState<AnalyzeResponse | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInline(null);
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
      const data = (await res.json()) as AnalyzeResponse & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Analysis failed.");
        setLoading(false);
        return;
      }
      if (data.id) {
        router.push(`/results/${data.id}`);
        return;
      }
      setInline(data);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-16">
        <header className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            AI Code Trust
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Decide if code is safe to ship
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            Paste a snippet or analyze a GitHub pull request. You get a trust score,
            a clear verdict, and the highest-impact issues first — not a wall of
            noise.
          </p>
        </header>

        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <div className="space-y-2">
            <label htmlFor="prUrl" className="text-sm font-medium">
              GitHub pull request URL (optional)
            </label>
            <input
              id="prUrl"
              type="url"
              name="prUrl"
              placeholder="https://github.com/owner/repo/pull/123"
              value={prUrl}
              onChange={(e) => setPrUrl(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <p className="text-xs text-zinc-500">
              Requires{" "}
              <code className="rounded bg-zinc-200 px-1 py-0.5 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                GITHUB_TOKEN
              </code>{" "}
              on the server. Leave empty to paste code instead.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="code" className="text-sm font-medium">
              Or paste code
            </label>
            <textarea
              id="code"
              name="code"
              rows={14}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="// Your code…"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm leading-relaxed shadow-sm outline-none ring-emerald-500/30 focus:border-emerald-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-600 px-5 text-sm font-medium text-white shadow transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Analyzing…" : "Run analysis"}
          </button>
        </form>

        {inline ? (
          <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium uppercase text-zinc-500">
              Result (no database — not saved)
            </p>
            <ResultSummary data={inline} />
          </section>
        ) : null}
      </main>
    </div>
  );
}

function ResultSummary({ data }: { data: AnalyzeResponse }) {
  const verdictClass =
    data.decision === "SAFE"
      ? "text-emerald-600 dark:text-emerald-400"
      : data.decision === "RISKY"
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <p className="text-xs uppercase text-zinc-500">Trust score</p>
          <p className="text-4xl font-semibold tabular-nums">{data.score}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-zinc-500">Verdict</p>
          <p className={`text-2xl font-semibold ${verdictClass}`}>{data.decision}</p>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {data.summary}
      </p>
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
