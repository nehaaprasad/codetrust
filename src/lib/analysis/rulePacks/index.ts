import type { AnalysisIssue } from "../types";
import { runNextjsRules } from "./nextjs";
import { runPrismaRules } from "./prisma";
import { runReactRules } from "./react";

type File = { path: string; content: string };

/**
 * Framework rule packs.
 *
 * Depth that a generic JS linter can't match:
 *   - Next.js App Router footguns (Server/Client boundary, middleware,
 *     next/image, Server Actions).
 *   - React hook / key patterns.
 *   - Prisma raw-SQL, destructive ops, unbounded reads, unawaited
 *     mutations.
 *
 * The entry point is intentionally small — the caller passes in the
 * classification bits (`isTest`, `isSource`) so the packs don't need
 * their own copy of the classifier.
 */
export function runRulePacks(
  file: File,
  opts: { isTest: boolean; isSource: boolean },
): AnalysisIssue[] {
  if (opts.isTest) return [];
  if (!opts.isSource) return [];
  return [
    ...runNextjsRules(file),
    ...runReactRules(file),
    ...runPrismaRules(file),
  ];
}
