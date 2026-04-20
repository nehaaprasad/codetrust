# Issue Slide-over Panel & Rerun Diff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement two features: (1) Convert issue list to slide-over panel, (2) Show before/after issues diff after rerun

**Architecture:**
1. Replace `<details>` elements in IssueDetailList with fixed-position slide-over panel component with backdrop
2. Store previous issues before rerun API call, diff against new results after reload

**Tech Stack:** Next.js 16, React 19, Tailwind CSS, TanStack Query

---

### Task 1: Create IssueSlideOver Component

**Files:**
- Create: `src/components/issue-slide-over.tsx`

- [ ] **Step 1: Create the issue slide-over component**

```tsx
"use client";

import { useEffect, useState } from "react";
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
  if (c === " Reliability") return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/issue-slide-over.tsx
git commit -m "feat: add issue slide-over panel component"
```

---

### Task 2: Update IssueDetailList to Use Slide-over

**Files:**
- Modify: `src/components/issue-detail-list.tsx`

- [ ] **Step 1: Update IssueDetailList to use slide-over instead of details**

The updated component:

```tsx
"use client";

import { useState } from "react";
import { issueWhyItMatters } from "@/lib/analysis/issueWhyItMatters";
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

      <IssueSlideOver
        issue={selectedIssue!}
        open={selectedIssue !== null}
        onClose={() => setSelectedIssue(null)}
      />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/issue-detail-list.tsx
git commit -m "feat: convert issue list to slide-over panel"
```

---

### Task 3: Implement Issues Diff Component

**Files:**
- Create: `src/components/issues-diff.tsx`

- [ ] **Step 1: Create the issues diff component**

```tsx
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

type GroupedIssues = {
  fixed: Issue[];
  new: Issue[];
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/issues-diff.tsx
git commit -m "feat: add issues diff component"
```

---

### Task 4: Update Results Page to Store Previous Issues and Show Diff

**Files:**
- Modify: `src/app/results/[id]/page.tsx` (lines 524-566 for RerunButton, and add IssuesDiff import and usage)

- [ ] **Step 1: Update the results page to implement rerun with diff**

Replace the RerunButton function (lines 524-566) with this updated version:

```tsx
type Issue = {
  category: string;
  severity: string;
  message: string;
  filePath: string | null;
  lineNumber: number | null;
};

function RerunButton({
  analysisId,
  previousIssues,
}: {
  analysisId: string;
  previousIssues: Issue[];
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [newIssues, setNewIssues] = useState<Issue[] | null>(null);
  const [newAnalysisId, setNewAnalysisId] = useState<string | null>(null);

  async function rerun() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/analysis/${analysisId}/rerun`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string; id?: string; issues?: Issue[] };

      if (!res.ok) {
        setError(data.error ?? "Rerun failed.");
        setLoading(false);
        return;
      }

      // Get new issues from response for diff
      if (data.issues && data.id) {
        setNewIssues(data.issues);
        setNewAnalysisId(data.id);
        setShowDiff(true);
        setLoading(false);
        return;
      }

      // Fallback: just reload if no issues returned
      window.location.reload();
    } catch {
      setError("Network error.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {showDiff && newIssues && (
        <>
          <IssuesDiff previousIssues={previousIssues} currentIssues={newIssues} />
          {newAnalysisId && (
            <Button
              type="button"
              onClick={() => window.location.href = `/results/${newAnalysisId}`}
              className="w-full sm:w-auto"
            >
              View new analysis →
            </Button>
          )}
        </>
      )}

      {!showDiff && (
        <>
          <Button
            type="button"
            variant="outline"
            onClick={rerun}
            disabled={loading}
            className="w-full border-zinc-300 bg-white font-medium shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:w-auto"
          >
            {loading ? "Re-running…" : "Re-run analysis"}
          </Button>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update the imports and component usage**

Add import for IssuesDiff:
```tsx
import { IssuesDiff } from "@/components/issues-diff";
```

Update the component call in the page (line ~506) to pass previousIssues:
```tsx
<RerunButton analysisId={id} previousIssues={data.issues} />
```

- [ ] **Step 3: Commit**

```bash
git add src/app/results/[id]/page.tsx
git commit -m "feat: add issues diff on rerun"
```

---

### Task 5: Update Rerun API to Return Issues

**Files:**
- Modify: `src/app/api/analysis/[id]/rerun/route.ts`

- [ ] **Step 1: Update the rerun API to return new issues**

Add the issues to the response after rerun completes. Look for the return statement and add issues field:

```typescript
return NextResponse.json({
  id: newAnalysis.id,
  issues: newAnalysis.issues.map((i) => ({
    category: i.category,
    severity: i.severity,
    message: i.description,
    filePath: i.filePath,
    lineNumber: i.lineNumber,
  })),
});
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/analysis/[id]/rerun/route.ts
git commit -m "feat: return issues in rerun API response"
```

---

### Self-Review

1. **Spec coverage:**
   - Slide-over panel: Tasks 1-2 ✓ (fixed positioning, backdrop, category/severity badges, description, file path, line number, "Why this matters")
   - Before/after issues diff: Tasks 3-5 ✓ (stores previous issues before rerun, diffs by category+description, shows "Fixed" and "New" lists)

2. **Placeholder scan:** All steps have complete code.

3. **Type consistency:** `Issue` type matches between components. `RerunButton` receives `previousIssues` from page data.

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-20-issue-slideover-and-rerun-diff.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**