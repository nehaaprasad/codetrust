"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { DiffViewer } from "@/components/diff-view";

type DiffData = {
  files: Array<{
    path: string;
    status: "added" | "modified" | "deleted";
    additions: number;
    deletions: number;
    hunks: Array<{
      oldStart: number;
      oldLines: number;
      newStart: number;
      newLines: number;
      lines: Array<{
        type: "context" | "added" | "deleted";
        content: string;
        oldLineNum: number | null;
        newLineNum: number | null;
      }>;
    }>;
  }>;
  totalFiles: number;
  totalAdditions: number;
  totalDeletions: number;
};

type IssueData = {
  filePath: string | null;
  lineNumber: number | null;
  message: string;
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-zinc-50 text-zinc-900 dark:bg-transparent dark:text-zinc-100">
      <AppNav />
      {children}
    </div>
  );
}

export default function DiffPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  // Fetch diff data
  const diffQ = useQuery({
    queryKey: ["diff", id],
    queryFn: async () => {
      const res = await fetch(`/api/analysis/${id}/diff`);
      const data = (await res.json()) as DiffData & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load diff");
      return data;
    },
    enabled: Boolean(id),
  });

  // Fetch issues for linking
  const issuesQ = useQuery({
    queryKey: ["analysis-issues", id],
    queryFn: async () => {
      const res = await fetch(`/api/analysis/${id}`);
      const data = (await res.json()) as { issues: IssueData[] };
      return data.issues.filter(
        (i) => i.filePath && i.lineNumber != null
      ) as IssueData[];
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

  if (diffQ.isPending) {
    return (
      <Shell>
        <div className="flex flex-1 items-center justify-center p-8 text-zinc-600">
          Loading diff…
        </div>
      </Shell>
    );
  }

  if (diffQ.isError) {
    return (
      <Shell>
        <div className="mx-auto max-w-2xl space-y-4 p-8">
          <p className="text-sm text-red-600">
            {diffQ.error instanceof Error ? diffQ.error.message : "Error"}
          </p>
          <Link href={`/results/${id}`} className="text-sm font-medium text-zinc-700 underline dark:text-zinc-300">
            Back to results
          </Link>
        </div>
      </Shell>
    );
  }

  const diff = diffQ.data;
  const issues = issuesQ.data ?? [];

  return (
    <Shell>
      <main className="flex flex-1 flex-col overflow-hidden px-6 py-4">
        <header className="mb-4 flex items-center gap-4">
          <Link
            href={`/results/${id}`}
            className="text-sm font-medium text-zinc-700 hover:underline dark:text-zinc-300"
          >
            ← Back to results
          </Link>
          <span className="h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            <span className="text-zinc-500 dark:text-zinc-400">
              +{diff.totalAdditions}
            </span>
            {" "}
            <span className="text-red-600 dark:text-red-400">
              -{diff.totalDeletions}
            </span>
            {" "}
            in {diff.totalFiles} file{diff.totalFiles !== 1 ? "s" : ""}
          </div>
        </header>

        <div className="flex-1 overflow-hidden rounded-xl border border-zinc-200/90 bg-white/95 shadow-lg shadow-zinc-900/5 backdrop-blur-sm dark:border-zinc-700/60 dark:bg-zinc-950/50 dark:shadow-[0_0_0_1px_rgba(63,63,70,0.4),0_24px_64px_-28px_rgba(0,0,0,0.55)]">
          {diff.files.length > 0 ? (
            <DiffViewer files={diff.files} issues={issues} />
          ) : (
            <p className="p-8 text-center text-sm text-zinc-500">
              No diff data available.
            </p>
          )}
        </div>
      </main>
    </Shell>
  );
}