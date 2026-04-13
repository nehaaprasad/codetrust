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
    <div className="flex h-[calc(100vh-4rem)] flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
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
          <Link href={`/results/${id}`} className="text-sm font-medium text-emerald-700 underline">
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
            className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            ← Back to results
          </Link>
          <span className="h-4 w-px bg-zinc-300 dark:bg-zinc-700" />
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            <span className="text-green-600 dark:text-green-400">
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

        <div className="flex-1 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
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