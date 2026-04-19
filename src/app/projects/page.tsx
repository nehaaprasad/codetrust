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

type Project = {
  id: string;
  name: string;
  repoUrl: string;
  analysisCount: number;
  createdAt: string;
};

export default function ProjectsPage() {
  const q = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      const data = (await res.json()) as Project[] | { error?: string };
      if (!res.ok) throw new Error((data as { error: string }).error ?? "Failed to load projects.");
      return data as Project[];
    },
  });

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 text-zinc-900 dark:bg-transparent dark:text-zinc-100">
      <AppNav />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12">
        <header className="space-y-6 text-left">
          <p className="text-sm font-normal tracking-[-0.01em] text-zinc-500 dark:text-zinc-500">
            ai code trust
          </p>
          <h1 className="max-w-[20ch] font-sans text-[2.375rem] font-light leading-[1.12] tracking-[-0.035em] sm:text-5xl sm:leading-[1.1] sm:tracking-[-0.04em]">
            <span className="block text-zinc-900 dark:text-[#fcfcf0]">projects</span>
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-lg">
            Group analyses by repository to track trust scores over time.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All projects</CardTitle>
            <CardDescription>
              Each project corresponds to a unique repository URL.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {q.isPending ? (
              <p className="text-sm text-zinc-500">Loading…</p>
            ) : q.isError ? (
              <p className="text-sm text-red-600" role="alert">
                {q.error instanceof Error ? q.error.message : "Error"}
              </p>
            ) : !q.data?.length ? (
              <div className="rounded-xl border border-dashed border-zinc-300/90 bg-zinc-50/50 px-4 py-10 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/30 dark:text-zinc-400">
                No projects yet. Run an analysis with a GitHub PR URL to create one.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Repository</TableHead>
                    <TableHead>Analyses</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {q.data.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        {project.name}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-zinc-600 dark:text-zinc-400">
                        <a
                          href={project.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {project.repoUrl.replace(/^https:\/\/github\.com\//, "")}
                        </a>
                      </TableCell>
                      <TableCell className="tabular-nums">{project.analysisCount}</TableCell>
                      <TableCell className="text-zinc-600 dark:text-zinc-400">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="link" size="sm" asChild>
                          <Link href={`/projects/${project.id}`}>View</Link>
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