"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
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

type Project = {
  id: string;
  name: string;
  repoUrl: string;
  createdAt: string;
};

type Analysis = {
  id: string;
  score: number;
  decision: string;
  summary: string;
  prNumber: number | null;
  createdAt: string;
};

export default function ProjectDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const projectQ = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error((json as { error: string }).error ?? "Failed to load project.");
      return json as Project;
    },
    enabled: Boolean(id),
  });

  const analysesQ = useQuery({
    queryKey: ["project-analyses", id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}/analyses`);
      const data = (await res.json()) as Analysis[] | { error?: string };
      if (!res.ok) throw new Error((data as { error: string }).error ?? "Failed to load analyses.");
      return data as Analysis[];
    },
    enabled: Boolean(id),
  });

  if (!id) {
    return (
      <div className="flex min-h-full flex-1 flex-col bg-zinc-50 text-zinc-900 dark:bg-transparent dark:text-zinc-100">
        <AppNav />
        <main className="mx-auto max-w-lg px-4 py-16 sm:px-6">
          <p className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400">
            Missing project id.
          </p>
        </main>
      </div>
    );
  }

  if (projectQ.isPending || analysesQ.isPending) {
    return (
      <div className="flex min-h-full flex-1 flex-col bg-zinc-50 text-zinc-900 dark:bg-transparent dark:text-zinc-100">
        <AppNav />
        <main className="mx-auto flex flex-1 flex-col items-center justify-center gap-3 px-6 py-24">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600 dark:border-zinc-700 dark:border-t-zinc-300"
            aria-hidden
          />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
        </main>
      </div>
    );
  }

  if (projectQ.isError) {
    return (
      <div className="flex min-h-full flex-1 flex-col bg-zinc-50 text-zinc-900 dark:bg-transparent dark:text-zinc-100">
        <AppNav />
        <main className="mx-auto max-w-lg px-4 py-16 sm:px-6">
          <div className="rounded-xl border border-red-200 bg-red-50/80 px-5 py-4 dark:border-red-900/60 dark:bg-red-950/30">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              {projectQ.error instanceof Error ? projectQ.error.message : "Error"}
            </p>
            <Link
              href="/projects"
              className="mt-4 inline-flex text-sm font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
            >
              ← Back to projects
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const project = projectQ.data;
  const analyses = analysesQ.data ?? [];

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 text-zinc-900 dark:bg-transparent dark:text-zinc-100">
      <AppNav />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
        <Link
          href="/projects"
          className="w-fit text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          ← All projects
        </Link>

        <header className="space-y-4">
          <h1 className="font-sans text-3xl font-light tracking-[-0.02em] text-zinc-900 dark:text-[#fcfcf0]">
            {project.name}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-2 transition-colors hover:decoration-zinc-500 dark:text-zinc-100 dark:decoration-zinc-600"
            >
              {project.repoUrl.replace(/^https:\/\/github\.com\//, "")}
            </a>
            <span className="mx-2 text-zinc-400">·</span>
            Created {new Date(project.createdAt).toLocaleDateString()}
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Analyses</CardTitle>
            <CardDescription>
              All analyses for this project, newest first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!analyses.length ? (
              <div className="rounded-xl border border-dashed border-zinc-300/90 bg-zinc-50/50 px-4 py-10 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400">
                No analyses yet. Run one from the home page.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>PR</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Verdict</TableHead>
                    <TableHead className="max-w-md">Summary</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyses.map((analysis) => (
                    <TableRow key={analysis.id}>
                      <TableCell className="whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                        {new Date(analysis.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-zinc-600 dark:text-zinc-400">
                        {analysis.prNumber != null ? `#${analysis.prNumber}` : "—"}
                      </TableCell>
                      <TableCell className="tabular-nums font-medium">
                        {analysis.score}
                      </TableCell>
                      <TableCell>
                        <Badge variant={verdictBadgeVariant(analysis.decision)}>
                          {analysis.decision}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md truncate text-zinc-700 dark:text-zinc-300">
                        {analysis.summary}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="link" size="sm" asChild>
                          <Link href={`/results/${analysis.id}`}>Details</Link>
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