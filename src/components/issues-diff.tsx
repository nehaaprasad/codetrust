"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type Issue = {
  category: string;
  severity: string;
  message: string;
  filePath: string | null;
  lineNumber: number | null;
};

function issueKey(i: Issue): string {
  return `${i.category}:${i.message}`;
}

export function IssuesDiff({
  previousIssues,
  currentIssues,
}: {
  previousIssues: Issue[];
  currentIssues: Issue[];
}) {
  const [showFixed, setShowFixed] = useState(true);
  const [showNew, setShowNew] = useState(true);

  const prevKeys = new Set(previousIssues.map(issueKey));
  const currKeys = new Set(currentIssues.map(issueKey));

  const fixed = currentIssues.filter((i) => !prevKeys.has(issueKey(i)));
  const newIssues = previousIssues.filter((i) => !currKeys.has(issueKey(i)));

  if (fixed.length === 0 && newIssues.length === 0) {
    return null;
  }

  function formatIssue(i: Issue): string {
    return `${i.category} · ${i.severity} — ${i.message.slice(0, 60)}${i.message.length > 60 ? "..." : ""}`;
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Issues comparison
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Changes since the previous analysis.
        </p>
      </div>

      <div className="space-y-0">
        {fixed.length > 0 && (
          <div className="border-b border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setShowFixed(!showFixed)}
              className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30"
            >
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                Fixed issues ({fixed.length})
              </span>
              <span className={cn("transition-transform", showFixed ? "rotate-180" : "")}>
                ▼
              </span>
            </button>
            {showFixed && (
              <ul className="px-5 pb-4">
                {fixed.map((i, idx) => (
                  <li key={idx} className="py-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {formatIssue(i)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {newIssues.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30"
            >
              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                New issues ({newIssues.length})
              </span>
              <span className={cn("transition-transform", showNew ? "rotate-180" : "")}>
                ▼
              </span>
            </button>
            {showNew && (
              <ul className="px-5 pb-4">
                {newIssues.map((i, idx) => (
                  <li key={idx} className="py-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {formatIssue(i)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}