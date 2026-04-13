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

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
        <header className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-sky-700 dark:text-sky-400">
            Connect & analyze
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Choose a repository and pull request
          </h1>
          <p className="max-w-2xl text-zinc-600 dark:text-zinc-400">
            Sign in with GitHub so we can list your repos and open PRs. Analysis still uses the
            server{" "}
            <code className="rounded bg-zinc-200 px-1 py-0.5 font-mono text-xs dark:bg-zinc-800">
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
            <Card className="min-h-[320px]">
              <CardHeader>
                <CardTitle className="text-lg">Repositories</CardTitle>
                <CardDescription>Recently updated first.</CardDescription>
              </CardHeader>
              <CardContent>
                {reposQ.isPending ? (
                  <p className="text-sm text-zinc-500">Loading…</p>
                ) : reposQ.isError ? (
                  <p className="text-sm text-red-600" role="alert">
                    {reposQ.error instanceof Error ? reposQ.error.message : "Error"}
                  </p>
                ) : (
                  <ul className="max-h-72 space-y-1 overflow-y-auto text-sm">
                    {reposQ.data?.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelected(r);
                            setPrListState("open");
                          }}
                          className={`w-full rounded-md px-2 py-2 text-left transition-colors ${
                            selected?.id === r.id
                              ? "bg-sky-100 text-sky-950 dark:bg-sky-500/15 dark:text-sky-100 dark:ring-1 dark:ring-sky-400/30"
                              : "hover:bg-zinc-100 dark:hover:bg-zinc-900"
                          }`}
                        >
                          <span className="font-medium">{r.fullName}</span>
                          {r.private ? (
                            <span className="ml-2 text-xs text-zinc-500">Private</span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="min-h-[320px]">
              <CardHeader>
                <CardTitle className="text-lg">Pull requests</CardTitle>
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
              <CardContent>
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
                      <p className="rounded-md border border-sky-200 bg-sky-50 p-2 text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
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
                  <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
                    {prsQ.data?.prs?.map((pr) => (
                      <li
                        key={pr.id}
                        className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                      >
                        <div>
                          <span className="font-medium">#{pr.number}</span>{" "}
                          <span className="text-zinc-700 dark:text-zinc-300">{pr.title}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" onClick={() => analyzePr(pr)}>
                            Analyze this PR
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <a href={pr.htmlUrl} target="_blank" rel="noopener noreferrer">
                              Open on GitHub
                            </a>
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <p className="text-sm text-zinc-500">
          <Link href="/" className="font-medium text-sky-700 underline dark:text-sky-400">
            ← Back to analyze
          </Link>
        </p>
      </main>
    </div>
  );
}
