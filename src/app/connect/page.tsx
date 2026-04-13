"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
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
import type { PrListSource } from "@/lib/github/listPrs";
import type { GitHubPullRequest, GitHubRepo } from "@/lib/github/types";

type PrsPayload = { prs: GitHubPullRequest[]; prSource: PrListSource | null };

export default function ConnectPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [selected, setSelected] = useState<GitHubRepo | null>(null);
  const [prListState, setPrListState] = useState<"open" | "all">("open");

  const reposQ = useQuery({
    queryKey: ["github-repos"],
    queryFn: async () => {
      const res = await fetch("/api/github/repos", { credentials: "include" });
      const data = (await res.json()) as { repos?: GitHubRepo[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load repositories.");
      return data.repos ?? [];
    },
    enabled: status === "authenticated",
  });

  const prsQ = useQuery({
    queryKey: ["github-prs", selected?.fullName, prListState],
    queryFn: async (): Promise<PrsPayload> => {
      if (!selected) return { prs: [], prSource: null };
      const [owner, repo] = selected.fullName.split("/");
      if (!owner || !repo) return { prs: [], prSource: null };
      const params = new URLSearchParams({
        owner,
        repo,
        state: prListState,
      });
      const res = await fetch(`/api/github/prs?${params.toString()}`, {
        credentials: "include",
      });
      const data = (await res.json()) as {
        prs?: GitHubPullRequest[];
        prSource?: PrListSource | null;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to load pull requests.");
      return {
        prs: data.prs ?? [],
        prSource: data.prSource ?? null,
      };
    },
    enabled: Boolean(selected),
  });

  function analyzePr(pr: GitHubPullRequest) {
    router.push(`/?prUrl=${encodeURIComponent(pr.htmlUrl)}`);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 text-zinc-900 dark:bg-transparent dark:text-zinc-100">
      <AppNav />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12">
        <header className="space-y-6 text-left">
          <p className="text-sm font-normal tracking-[-0.01em] text-zinc-500 dark:text-zinc-500">
            {"connect & analyze"}
          </p>
          <h1 className="max-w-[26ch] font-sans text-[2.375rem] font-light leading-[1.12] tracking-[-0.035em] sm:text-5xl sm:leading-[1.1] sm:tracking-[-0.04em]">
            <span className="block text-zinc-900 dark:text-[#fcfcf0]">
              choose a repository
            </span>
            <span className="mt-1 block font-extralight text-zinc-500 dark:text-[#a1a1a1]">
              and pull request
            </span>
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-lg">
            Sign in with GitHub so we can list your repos and open PRs. Analysis still uses the
            server{" "}
            <code className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-sm dark:bg-zinc-800">
              GITHUB_TOKEN
            </code>{" "}
            to fetch files and post comments.
          </p>
        </header>

        {status === "loading" ? (
          <p className="text-sm text-zinc-500">Loading session…</p>
        ) : !session ? (
          <Card>
            <CardHeader>
              <CardTitle>Sign in</CardTitle>
              <CardDescription>
                Blueprint flow: connect GitHub, then pick a repo and PR.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" onClick={() => signIn("github")}>
                Sign in with GitHub
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="min-h-[340px] overflow-hidden rounded-xl border-zinc-200/90 bg-white/90 shadow-lg shadow-zinc-900/5 backdrop-blur-sm dark:border-zinc-700/60 dark:bg-zinc-950/50 dark:shadow-[0_0_0_1px_rgba(63,63,70,0.4),0_16px_48px_-20px_rgba(0,0,0,0.4)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold tracking-[-0.02em]">
                  Repositories
                </CardTitle>
                <CardDescription>Recently updated first.</CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-0">
                {reposQ.isPending ? (
                  <p className="text-sm text-zinc-500">Loading…</p>
                ) : reposQ.isError ? (
                  <p className="text-sm text-red-600" role="alert">
                    {reposQ.error instanceof Error ? reposQ.error.message : "Error"}
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-zinc-200/90 dark:border-zinc-800/90">
                    <div className="border-b border-zinc-200/90 bg-zinc-50/95 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/70">
                      <div className="grid grid-cols-[1fr_auto] gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
                        <span>Repository</span>
                        <span className="text-right">Access</span>
                      </div>
                    </div>
                    <ul className="max-h-72 divide-y divide-zinc-200 overflow-y-auto dark:divide-zinc-800/80">
                      {reposQ.data?.map((r) => (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelected(r);
                              setPrListState("open");
                            }}
                            className={`grid w-full grid-cols-[1fr_auto] gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                              selected?.id === r.id
                                ? "bg-zinc-100 text-zinc-950 dark:bg-white/[0.08] dark:text-zinc-50"
                                : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                            }`}
                          >
                            <span className="min-w-0 truncate font-medium text-zinc-900 dark:text-zinc-100">
                              {r.fullName}
                            </span>
                            <span className="shrink-0 text-right text-[11px] text-zinc-500 dark:text-zinc-400">
                              {r.private ? "Private" : "Public"}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="min-h-[340px] overflow-hidden rounded-xl border-zinc-200/90 bg-white/90 shadow-lg shadow-zinc-900/5 backdrop-blur-sm dark:border-zinc-700/60 dark:bg-zinc-950/50 dark:shadow-[0_0_0_1px_rgba(63,63,70,0.4),0_16px_48px_-20px_rgba(0,0,0,0.4)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold tracking-[-0.02em]">
                  Pull requests
                </CardTitle>
                <CardDescription>
                  {selected
                    ? `${prListState === "open" ? "Open" : "Open + closed"} PRs — ${
                        prsQ.data?.prSource?.forkResolvedToUpstream
                          ? `upstream ${prsQ.data.prSource.listingFullName} (fork: ${selected.fullName})`
                          : selected.fullName
                      }`
                    : "Select a repository on the left."}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-0">
                {!selected ? (
                  <p className="text-sm text-zinc-500">No repository selected.</p>
                ) : prsQ.isPending ? (
                  <p className="text-sm text-zinc-500">Loading PRs…</p>
                ) : prsQ.isError ? (
                  <div className="space-y-2 text-sm text-red-600" role="alert">
                    <p>{prsQ.error instanceof Error ? prsQ.error.message : "Error"}</p>
                    <p className="text-zinc-600 dark:text-zinc-400">
                      If this says sign-in: use <strong>Sign out</strong> in the nav, then{" "}
                      <strong>Sign in with GitHub</strong> again so your OAuth token (with{" "}
                      <code className="rounded bg-zinc-200 px-1 font-mono text-xs dark:bg-zinc-800">
                        repo
                      </code>{" "}
                      scope) is stored.
                    </p>
                  </div>
                ) : prsQ.data?.prs?.length === 0 ? (
                  <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {prsQ.data?.prSource?.forkResolvedToUpstream ? (
                      <p className="rounded-md border border-zinc-200 bg-zinc-100 p-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-200">
                        This repo is a <strong>fork</strong>. PRs are listed from the upstream
                        repository <strong>{prsQ.data.prSource.listingFullName}</strong>. If the list
                        is still empty, try <strong>Show open + closed</strong> or check GitHub
                        directly.
                      </p>
                    ) : null}
                    <p>
                      No {prListState === "open" ? "open " : ""}pull requests returned
                      {prsQ.data?.prSource?.forkResolvedToUpstream
                        ? ` for ${prsQ.data.prSource.listingFullName}.`
                        : " for this repo."}
                    </p>
                    {prListState === "open" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPrListState("all")}
                      >
                        Show open + closed (last {50})
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPrListState("open")}
                      >
                        Show open only
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-zinc-200/90 dark:border-zinc-800/90">
                    <div className="border-b border-zinc-200/90 bg-zinc-50/95 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/70">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 dark:text-zinc-400">
                        Open pull requests
                      </div>
                    </div>
                    <ul className="max-h-72 divide-y divide-zinc-200 overflow-y-auto dark:divide-zinc-800/80">
                      {prsQ.data?.prs?.map((pr) => (
                        <li key={pr.id} className="p-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                #{pr.number}
                              </p>
                              <p className="mt-0.5 text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                                {pr.title}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2">
                              <Button type="button" size="sm" onClick={() => analyzePr(pr)}>
                                Analyze
                              </Button>
                              <Button variant="outline" size="sm" asChild>
                                <a href={pr.htmlUrl} target="_blank" rel="noopener noreferrer">
                                  GitHub
                                </a>
                              </Button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <p className="text-sm text-zinc-500">
          <Link href="/" className="font-medium text-zinc-700 underline dark:text-zinc-300">
            ← Back to analyze
          </Link>
        </p>
      </main>
    </div>
  );
}
