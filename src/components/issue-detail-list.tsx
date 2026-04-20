"use client";

import { useState } from "react";
import { IssueSlideOver } from "./issue-slide-over";
import { buildEvidenceLink, type EvidenceContext } from "@/lib/github/evidenceLinks";
import { cn } from "@/lib/utils";

type Issue = {
  category: string;
  severity: string;
  message: string;
  filePath: string | null;
  lineNumber: number | null;
};

export function IssueDetailList({
  issues,
  evidence,
}: {
  issues: Issue[];
  /**
   * Optional PR context (owner/repo/headSha). When present, each
   * `filePath:lineNumber` line below the issue message becomes a
   * clickable GitHub permalink to the exact line at the PR's head.
   * Omitted for paste-only analyses, which have no repo anchor.
   */
  evidence?: EvidenceContext | null;
}) {
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  function severityVariant(s: string): string {
    if (s === "HIGH") return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
    if (s === "MEDIUM") return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
    return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  }

  return (
    <>
      <ul className="space-y-2">
        {issues.map((issue, i) => {
          const locationLabel = issue.filePath
            ? `${issue.filePath}${issue.lineNumber != null ? `:${issue.lineNumber}` : ""}`
            : null;
          const href = buildEvidenceLink(
            evidence ?? null,
            issue.filePath,
            issue.lineNumber,
          );
          return (
            <li
              key={`${issue.message}-${i}`}
              className="group rounded-xl border border-zinc-200/90 bg-white shadow-sm hover:border-zinc-300/90 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40 dark:hover:bg-zinc-900/40"
            >
              <button
                type="button"
                onClick={() => setSelectedIssue(issue)}
                className="w-full cursor-pointer rounded-xl px-4 pt-3.5 pb-2 text-left"
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
              </button>
              {locationLabel ? (
                <div className="px-4 pb-3.5">
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="font-mono text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                      title="Open on GitHub"
                    >
                      {locationLabel}
                    </a>
                  ) : (
                    <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      {locationLabel}
                    </span>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
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