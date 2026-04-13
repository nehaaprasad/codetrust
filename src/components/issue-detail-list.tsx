"use client";

import { issueWhyItMatters } from "@/lib/analysis/issueWhyItMatters";

type Issue = {
  category: string;
  severity: string;
  message: string;
  filePath: string | null;
  lineNumber: number | null;
};

export function IssueDetailList({ issues }: { issues: Issue[] }) {
  return (
    <ul className="space-y-2">
      {issues.map((issue, i) => (
        <li key={`${issue.message}-${i}`} className="list-none">
          <details className="group rounded-lg border border-zinc-200 bg-white shadow-sm open:ring-1 open:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-900">
            <summary className="cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  [{issue.category}] <span className="text-zinc-600 dark:text-zinc-400">{issue.severity}</span>
                </span>
                <span className="text-xs text-zinc-500 group-open:hidden">Open details</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {issue.message}
              </p>
              {issue.filePath ? (
                <p className="mt-1 font-mono text-xs text-zinc-500">
                  {issue.filePath}
                  {issue.lineNumber != null ? `:${issue.lineNumber}` : ""}
                </p>
              ) : null}
            </summary>
            <div className="border-t border-zinc-100 px-4 py-3 text-sm leading-relaxed text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
              <p className="font-medium text-zinc-800 dark:text-zinc-200">Why this matters</p>
              <p className="mt-1">{issueWhyItMatters(issue.category, issue.severity)}</p>
              <p className="mt-3 text-xs text-zinc-500">
                Where:{" "}
                {issue.filePath
                  ? `${issue.filePath}${issue.lineNumber != null ? ` line ${issue.lineNumber}` : ""}`
                  : "location not tied to a single file (see message above)"}
              </p>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
