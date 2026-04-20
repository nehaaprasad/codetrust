"use client";

import { useState } from "react";
import { IssueSlideOver } from "./issue-slide-over";
import { cn } from "@/lib/utils";

type Issue = {
  category: string;
  severity: string;
  message: string;
  filePath: string | null;
  lineNumber: number | null;
};

export function IssueDetailList({ issues }: { issues: Issue[] }) {
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  function severityVariant(s: string): string {
    if (s === "HIGH") return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
    if (s === "MEDIUM") return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  }

  return (
    <>
      <ul className="space-y-2">
        {issues.map((issue, i) => (
          <li key={`${issue.message}-${i}`}>
            <button
              type="button"
              onClick={() => setSelectedIssue(issue)}
              className="w-full cursor-pointer rounded-xl border border-zinc-200/90 bg-white px-4 py-3.5 text-left shadow-sm hover:border-zinc-300/90 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:bg-zinc-900/40"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{issue.category}</span>
                  <span className="mx-1.5 text-zinc-300 dark:text-zinc-600">·</span>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{issue.severity}</span>
                </span>
                <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  View
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 line-clamp-2">
                {issue.message}
              </p>
              {issue.filePath ? (
                <p className="mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                  {issue.filePath}
                  {issue.lineNumber != null ? `:${issue.lineNumber}` : ""}
                </p>
              ) : null}
            </button>
          </li>
        ))}
      </ul>

      {selectedIssue && (
        <IssueSlideOver
          issue={selectedIssue}
          open={selectedIssue !== null}
          onClose={() => setSelectedIssue(null)}
        />
      )}
    </>
  );
}