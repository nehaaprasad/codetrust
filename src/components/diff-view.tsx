"use client";

import { useState } from "react";
import type { DiffFile } from "@/lib/github/diff";

type DiffViewerProps = {
  files: DiffFile[];
  issues?: Array<{ filePath: string | null; lineNumber: number | null; message: string }>;
};

export function DiffViewer({ files, issues = [] }: DiffViewerProps) {
  const [selectedFile, setSelectedFile] = useState<string>(
    files.length > 0 ? files[0].path : ""
  );

  const selected = files.find((f) => f.path === selectedFile);

  // Build issue map for highlighting
  const issueMap = new Map<string, string[]>();
  for (const issue of issues) {
    if (issue.filePath && issue.lineNumber != null) {
      const key = `${issue.filePath}:${issue.lineNumber}`;
      if (!issueMap.has(key)) issueMap.set(key, []);
      issueMap.get(key)!.push(issue.message);
    }
  }

  return (
    <div className="flex h-full gap-4">
      {/* File list sidebar */}
      <aside className="w-64 flex-shrink-0 overflow-y-auto border-r border-zinc-200 bg-white pr-2 dark:border-zinc-800 dark:bg-zinc-950">
        <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-zinc-500">
          Changed files ({files.length})
        </h3>
        <ul className="space-y-1">
          {files.map((file) => (
            <li key={file.path}>
              <button
                type="button"
                onClick={() => setSelectedFile(file.path)}
                className={`w-full truncate rounded px-2 py-1.5 text-left text-sm ${
                  selectedFile === file.path
                    ? "bg-emerald-100 font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                <span
                  className={`mr-2 inline-block h-4 w-4 rounded text-center text-xs leading-4 ${
                    file.status === "added"
                      ? "bg-green-200 text-green-700 dark:bg-green-800 dark:text-green-300"
                      : file.status === "deleted"
                        ? "bg-red-200 text-red-700 dark:bg-red-800 dark:text-red-300"
                        : "bg-yellow-200 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-300"
                  }`}
                >
                  {file.status === "added"
                    ? "A"
                    : file.status === "deleted"
                      ? "D"
                      : "M"}
                </span>
                {file.path.split("/").pop()}
              </button>
              <div className="ml-6 px-2 text-xs text-zinc-500">
                <span className="text-green-600 dark:text-green-400">
                  +{file.additions}
                </span>
                {" "}
                <span className="text-red-600 dark:text-red-400">
                  -{file.deletions}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      {/* Diff content */}
      <main className="flex-1 overflow-y-auto">
        {selected ? (
          <div>
            <div className="mb-2 flex items-center gap-2 border-b border-zinc-200 pb-2 dark:border-zinc-800">
              <h2 className="font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {selected.path}
              </h2>
              <span className="text-xs text-zinc-500">
                (+{selected.additions} -{selected.deletions})
              </span>
            </div>
            <pre className="font-mono text-xs">
              {selected.hunks.map((hunk, hi) => (
                <div key={hi}>
                  {hunk.lines.map((line, li) => {
                    const lineKey = `${selected.path}:${line.newLineNum ?? line.oldLineNum}`;
                    const lineIssues = issueMap.get(lineKey) || [];

                    return (
                      <div
                        key={`${hi}-${li}`}
                        className={`flex ${
                          line.type === "added"
                            ? "bg-green-50 dark:bg-green-950/30"
                            : line.type === "deleted"
                              ? "bg-red-50 dark:bg-red-950/30"
                              : ""
                        } ${
                          lineIssues.length > 0
                            ? "ring-2 ring-amber-400 ring-inset"
                            : ""
                        }`}
                      >
                        {/* Line numbers */}
                        <span className="w-12 flex-shrink-0 select-none text-right text-zinc-400">
                          {line.oldLineNum ?? ""}
                        </span>
                        <span className="w-12 flex-shrink-0 select-none text-right text-zinc-400">
                          {line.newLineNum ?? ""}
                        </span>
                        {/* Content */}
                        <span
                          className={`flex-1 whitespace-pre-wrap break-all px-2 ${
                            line.type === "added"
                              ? "text-green-700 dark:text-green-300"
                              : line.type === "deleted"
                                ? "text-red-700 dark:text-red-300"
                                : "text-zinc-600 dark:text-zinc-400"
                          }`}
                        >
                          {line.type === "added" ? "+" : ""}
                          {line.type === "deleted" ? "-" : ""}
                          {line.content}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </pre>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No files to display.</p>
        )}
      </main>
    </div>
  );
}