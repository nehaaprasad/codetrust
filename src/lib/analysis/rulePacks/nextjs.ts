import { firstLineForRegex, firstLineMatching } from "../lineFind";
import type { AnalysisIssue } from "../types";

type File = { path: string; content: string };

/**
 * Next.js rule pack.
 *
 * These rules target specific Next.js (App Router) footguns that are
 * genuinely painful in production but invisible to a generic JS linter.
 * Each rule is gated narrowly so it does not fire on unrelated code.
 */

const HOOK_REGEX =
  /\b(use(?:State|Effect|Reducer|Ref|LayoutEffect|CallbackRef|Context|Memo|Callback|ImperativeHandle|Transition|DeferredValue|Id|SyncExternalStore))\s*\(/;

function hasUseClientDirective(content: string): boolean {
  // Directives must be the first non-comment/non-empty statement. We only
  // look at the first ~30 lines to avoid matching the string "use client"
  // appearing deep inside a component.
  const head = content.split(/\r?\n/, 30).join("\n");
  return /^\s*["']use client["']/m.test(head);
}

function hasUseServerDirective(content: string): boolean {
  const head = content.split(/\r?\n/, 30).join("\n");
  return /^\s*["']use server["']/m.test(head);
}

function isUnderAppDir(path: string): boolean {
  return /(^|\/)app\//.test(path);
}

function isRouteHandler(path: string): boolean {
  return /(^|\/)app\/.+\/route\.(ts|tsx|js|jsx|mjs)$/.test(path);
}

function isMiddlewareFile(path: string): boolean {
  return /(^|\/)middleware\.(ts|js|mjs)$/.test(path);
}

function isTsxLike(path: string): boolean {
  return /\.(tsx|jsx)$/.test(path);
}

/**
 * Rule: React hook used in a Next.js Server Component.
 *
 * Next.js Server Components render on the server and have no client
 * lifecycle — `useState`, `useEffect`, etc. throw at runtime. The fix is
 * adding a `"use client"` directive at the top of the file (or splitting
 * the interactive bit into its own client component).
 */
function ruleServerComponentUsesHooks(file: File): AnalysisIssue | null {
  const { path, content } = file;
  if (!isTsxLike(path)) return null;
  if (!isUnderAppDir(path)) return null;
  if (isRouteHandler(path)) return null;
  if (hasUseClientDirective(content)) return null;
  if (!HOOK_REGEX.test(content)) return null;
  const line = firstLineForRegex(content, HOOK_REGEX);
  return {
    category: "logic",
    severity: "high",
    message:
      'React hook used inside a Next.js Server Component — add the `"use client"` directive at the top of the file, or extract the interactive part into a client component.',
    filePath: path,
    lineNumber: line ?? undefined,
  };
}

/**
 * Rule: Client Component reads a non-public environment variable.
 *
 * In Next.js, only env vars prefixed with `NEXT_PUBLIC_` are exposed to
 * the browser. Reading `process.env.DATABASE_URL` (or similar) from a
 * `"use client"` file silently resolves to `undefined` in production and
 * can mask auth/feature flags. This is a top cause of "works locally,
 * breaks on Vercel" reports.
 */
function ruleClientReadsNonPublicEnv(file: File): AnalysisIssue | null {
  const { path, content } = file;
  if (!isTsxLike(path) && !/\.(ts|js|mjs)$/.test(path)) return null;
  if (!hasUseClientDirective(content)) return null;
  const envRe = /process\.env\.([A-Z0-9_]+)/g;
  for (const m of content.matchAll(envRe)) {
    const name = m[1];
    if (name.startsWith("NEXT_PUBLIC_") || name === "NODE_ENV") continue;
    const re = new RegExp(`process\\.env\\.${name}\\b`);
    const line = firstLineForRegex(content, re);
    return {
      category: "logic",
      severity: "high",
      message: `Client component reads \`process.env.${name}\` — only \`NEXT_PUBLIC_*\` env vars are exposed to the browser, this resolves to \`undefined\` at runtime.`,
      filePath: path,
      lineNumber: line ?? undefined,
    };
  }
  return null;
}

/**
 * Rule: `next/image` component missing width/height/fill.
 *
 * An `<Image>` without dimensions causes layout shift and — in strict
 * Next.js builds — throws. Detecting an import of `next/image` + a usage
 * without any sizing attribute is a reliable signal. We only look at one
 * tag at a time (the first `<Image` ... `>` block).
 */
function ruleNextImageMissingDimensions(file: File): AnalysisIssue | null {
  const { path, content } = file;
  if (!isTsxLike(path)) return null;
  if (!/from\s+["']next\/image["']/.test(content)) return null;

  const lines = content.split(/\r?\n/);
  let bufStart = -1;
  let buf = "";
  for (let i = 0; i < lines.length; i += 1) {
    const l = lines[i];
    if (bufStart < 0) {
      if (/<Image\b/.test(l)) {
        bufStart = i + 1;
        buf = l;
        if (/\/>|<\/Image>/.test(l)) {
          if (!/\b(width|height|fill)\b/.test(buf)) {
            return {
              category: "performance",
              severity: "medium",
              message:
                "`<Image>` from `next/image` needs `width` + `height` (or `fill`) to avoid layout shift and hydration errors.",
              filePath: path,
              lineNumber: bufStart,
            };
          }
          bufStart = -1;
          buf = "";
        }
      }
      continue;
    }
    buf += "\n" + l;
    if (/\/>|<\/Image>/.test(l)) {
      if (!/\b(width|height|fill)\b/.test(buf)) {
        return {
          category: "performance",
          severity: "medium",
          message:
            "`<Image>` from `next/image` needs `width` + `height` (or `fill`) to avoid layout shift and hydration errors.",
          filePath: path,
          lineNumber: bufStart,
        };
      }
      bufStart = -1;
      buf = "";
    }
  }
  return null;
}

/**
 * Rule: Next.js middleware matcher is catch-all.
 *
 * A matcher like `"/(.*)"`, `"/:path*"`, or `"/"` without exclusions runs
 * middleware on every `_next/static/*` asset. On a moderately busy page
 * this multiplies cold-start cost by 10–100x. Real middlewares should
 * either list explicit routes or exclude `_next`/`favicon`/images.
 */
function ruleMiddlewareCatchAllMatcher(file: File): AnalysisIssue | null {
  const { path, content } = file;
  if (!isMiddlewareFile(path)) return null;
  const configRe = /export\s+const\s+config\s*=\s*\{[\s\S]*?\}/;
  const m = content.match(configRe);
  if (!m) return null;
  const configBlock = m[0];
  const matcherRe = /matcher\s*:\s*(\[([\s\S]*?)\]|["']([^"']+)["'])/;
  const mm = configBlock.match(matcherRe);
  if (!mm) return null;
  const patterns = mm[1];
  const tooBroad =
    /["']\/(?:\(\.\*\)|:path\*|)["']/.test(patterns) ||
    /["']\/\(\.\*\)["']/.test(patterns);
  if (!tooBroad) return null;
  if (/_next|favicon|\\\.(ico|png|jpg|svg|webp|css|js)/.test(patterns)) {
    return null;
  }
  const line = firstLineMatching(content, (l) => /matcher\s*:/.test(l));
  return {
    category: "performance",
    severity: "medium",
    message:
      "Middleware matcher is catch-all — every request including `_next/static/*` runs middleware. Exclude static assets (`_next`, `favicon`, images) or scope to real routes.",
    filePath: path,
    lineNumber: line ?? undefined,
  };
}

/**
 * Rule: Server Action receives FormData without runtime validation.
 *
 * A `"use server"` function that reads `formData` but has no visible
 * schema validation (`zod`, `valibot`, `yup`, manual `.parse(`) is
 * trusting the browser — an attacker can post any shape. Reported as
 * `security: medium` because it's a common pattern in AI-generated code.
 */
function ruleServerActionMissingValidation(file: File): AnalysisIssue | null {
  const { path, content } = file;
  if (!/\.(ts|tsx|js|jsx|mjs)$/.test(path)) return null;
  if (!hasUseServerDirective(content) && !/"use server"|'use server'/.test(content))
    return null;
  // Must actually accept FormData
  if (!/\bFormData\b/.test(content)) return null;
  // Any validation in scope? Generous — avoids false positives.
  const hasValidation =
    /\bz\.\w+|\bzod\b|\bvalibot\b|yup\.|\.safeParse\(|\.parse\(\s*form|schema\.parse\(|@sinclair\/typebox|assert\w*\(/.test(
      content,
    );
  if (hasValidation) return null;
  const line =
    firstLineForRegex(content, /\bFormData\b/) ??
    firstLineForRegex(content, /["']use server["']/);
  return {
    category: "security",
    severity: "medium",
    message:
      "Server Action reads `FormData` with no visible runtime validation — the browser controls the shape; validate with `zod`/`valibot` before use.",
    filePath: path,
    lineNumber: line ?? undefined,
  };
}

export function runNextjsRules(file: File): AnalysisIssue[] {
  const out: AnalysisIssue[] = [];
  const rules = [
    ruleServerComponentUsesHooks,
    ruleClientReadsNonPublicEnv,
    ruleNextImageMissingDimensions,
    ruleMiddlewareCatchAllMatcher,
    ruleServerActionMissingValidation,
  ] as const;
  for (const rule of rules) {
    const i = rule(file);
    if (i) out.push(i);
  }
  return out;
}

export const __testing = {
  ruleServerComponentUsesHooks,
  ruleClientReadsNonPublicEnv,
  ruleNextImageMissingDimensions,
  ruleMiddlewareCatchAllMatcher,
  ruleServerActionMissingValidation,
};
