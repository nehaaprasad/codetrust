"use client";

import { useEffect } from "react";
import { issueWhyItMatters } from "@/lib/analysis/issueWhyItMatters";
import { cn } from "@/lib/utils";

type Issue = {
  category: string;
  severity: string;
  message: string;
  filePath: string | null;
  lineNumber: number | null;
};

function severityVariant(s: string): "default" | "destructive" | "warning" {
  if (s === "HIGH") return "destructive";
  if (s === "MEDIUM") return "warning";
  return "default";
}

function categoryBadgeVariant(c: string): string {
  if (c === "Security") return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
  if (c === "Reliability") return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
  if (c === "Best Practice") return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
  return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
}

export function IssueSlideOver({
  issue,
  open,
  onClose,
}: {
  issue: Issue;
  open: boolean;
  onClose: () => void;
}) {
  // Close on escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-lg overflow-y-auto",
          "border-l border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950",
          "transform transition-transform duration-200 ease-in-out"
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Issue Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6 px-6 py-5">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                categoryBadgeVariant(issue.category)
              )}
            >
              {issue.category}
            </span>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                severityVariant(issue.severity) === "destructive" && "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
                severityVariant(issue.severity) === "warning" && "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
                severityVariant(issue.severity) === "default" && "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              )}
            >
              {issue.severity}
            </span>
          </div>

          {/* Description */}
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Description
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              {issue.message}
            </p>
          </div>

          {/* File path and line number */}
          {issue.filePath && (
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Location
              </p>
              <p className="mt-2 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                {issue.filePath}
                {issue.lineNumber != null ? `:${issue.lineNumber}` : ""}
              </p>
            </div>
          )}

          {/* Why this matters */}
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Why this matters
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {issueWhyItMatters(issue.category, issue.severity)}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}