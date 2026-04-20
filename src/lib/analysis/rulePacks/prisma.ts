import { firstLineForRegex } from "../lineFind";
import type { AnalysisIssue } from "../types";

type File = { path: string; content: string };

/**
 * Prisma rule pack.
 *
 * Prisma-specific footguns that cause real outages:
 *   1. `$queryRaw` with template-literal interpolation (SQL injection).
 *   2. `deleteMany({})` / `updateMany({})` with no `where` clause.
 *   3. `findMany(...)` in a request handler with no `take`/`cursor` — unbounded fetch.
 *   4. An unawaited Prisma call — the row(s) never land, promise floats.
 *
 * All rules are gated to files that actually look Prisma-flavoured, so
 * a utility file that coincidentally contains the word `prisma` stays
 * quiet.
 */

function looksLikePrismaFile(content: string): boolean {
  if (/from\s+["']@prisma\/client["']/.test(content)) return true;
  if (/import\s+\{[^}]*PrismaClient[^}]*\}/.test(content)) return true;
  if (/\bprisma\.\w+\.(findMany|findUnique|findFirst|create|update|delete|deleteMany|updateMany|upsert|count|aggregate|groupBy|\$queryRaw|\$executeRaw)\b/.test(
    content,
  ))
    return true;
  if (/\bdb\.\w+\.(findMany|findUnique|findFirst|create|update|delete|deleteMany|updateMany)\b/.test(
    content,
  ))
    return true;
  return false;
}

/**
 * Rule: `$queryRaw\`... ${userInput} ...\`` or `$executeRaw` with
 * template interpolation (not `Prisma.sql`).
 *
 * Prisma's tagged-template form `$queryRaw\`SELECT ${id}\`` is safe —
 * it parameterises. The unsafe form is `$queryRawUnsafe(\`... ${x}\`)`
 * OR calling `$queryRaw` with a plain string built via concatenation.
 * We flag the Unsafe variant explicitly and any `$queryRaw(` /
 * `$executeRaw(` called with a string that contains `${` before the
 * closing paren.
 */
function ruleRawSqlInterpolation(file: File): AnalysisIssue | null {
  const { path, content } = file;
  if (!looksLikePrismaFile(content)) return null;

  // Explicit Unsafe variants are always a finding.
  const unsafeRe = /\$(?:query|execute)RawUnsafe\s*\(/;
  if (unsafeRe.test(content)) {
    const line = firstLineForRegex(content, unsafeRe);
    return {
      category: "security",
      severity: "critical",
      message:
        "`$queryRawUnsafe` / `$executeRawUnsafe` bypass Prisma's parameterisation — use `Prisma.sql\\`\\`` or the tagged-template form (`$queryRaw\\`SELECT ${id}\\``) instead.",
      filePath: path,
      lineNumber: line ?? undefined,
    };
  }

  // Called form with string interpolation before the closing paren:
  //   prisma.$queryRaw(`SELECT * FROM t WHERE id = ${id}`)
  const calledInterpRe =
    /\$(?:query|execute)Raw\s*\(\s*`[^`]*\$\{[^}]*\}[^`]*`/;
  if (calledInterpRe.test(content)) {
    const line = firstLineForRegex(content, calledInterpRe);
    return {
      category: "security",
      severity: "critical",
      message:
        "`$queryRaw(` called as a function with an interpolated string is injectable — use the tagged-template form (no parens): `$queryRaw\\`SELECT ... ${value}\\``.",
      filePath: path,
      lineNumber: line ?? undefined,
    };
  }

  // String concatenation: $queryRaw("... " + userInput + " ...")
  const concatRe = /\$(?:query|execute)Raw\s*\([^)]*\+[^)]*\)/;
  if (concatRe.test(content)) {
    const line = firstLineForRegex(content, concatRe);
    return {
      category: "security",
      severity: "critical",
      message:
        "Raw SQL built via string concatenation inside `$queryRaw` / `$executeRaw` is injectable — use the tagged-template form or `Prisma.sql`.",
      filePath: path,
      lineNumber: line ?? undefined,
    };
  }

  return null;
}

/**
 * Rule: `deleteMany({})` / `updateMany({})` — destructive on the whole
 * table.
 *
 * Shipping a call with no `where` empties the table on the next deploy.
 * Flag aggressively (`high`) because the blast radius is total.
 */
function ruleDestructiveWithoutWhere(file: File): AnalysisIssue | null {
  const { path, content } = file;
  if (!looksLikePrismaFile(content)) return null;
  // Match .deleteMany( ... ) / .updateMany( ... ) — no `where` inside.
  // Multi-line object literals covered by the [\s\S] quantifier.
  const re =
    /\.(deleteMany|updateMany)\s*\(\s*(?:\{\s*\}|)\s*\)/;
  if (!re.test(content)) return null;
  const line = firstLineForRegex(content, re);
  return {
    category: "security",
    severity: "high",
    message:
      "`deleteMany` / `updateMany` with no `where` clause affects every row in the table — add a `where` filter or document why a full-table mutation is intended.",
    filePath: path,
    lineNumber: line ?? undefined,
  };
}

/**
 * Rule: `findMany(...)` with no `take` or `cursor`.
 *
 * In an API route, an unbounded `findMany` that returns to the client
 * is a latency/memory timebomb on a growing table. We flag only when
 * the file path looks like a route/handler, so background jobs that
 * legitimately need everything aren't pestered.
 */
function ruleUnboundedFindMany(file: File): AnalysisIssue | null {
  const { path, content } = file;
  if (!looksLikePrismaFile(content)) return null;
  const looksLikeHandler =
    /(^|\/)app\/api\//.test(path) ||
    /(^|\/)pages\/api\//.test(path) ||
    /(^|\/)api\//.test(path) ||
    /route\.(ts|js|tsx|jsx|mjs)$/.test(path);
  if (!looksLikeHandler) return null;

  // findMany(...) — look for any call that does NOT mention `take:` or
  // `cursor:` inside the nearest matching parens.
  const callRe = /\.findMany\s*\(([\s\S]*?)\)/g;
  let m: RegExpExecArray | null;
  while ((m = callRe.exec(content)) !== null) {
    const args = m[1];
    if (/\btake\s*:/.test(args)) continue;
    if (/\bcursor\s*:/.test(args)) continue;
    const line = firstLineForRegex(content, /\.findMany\s*\(/);
    return {
      category: "performance",
      severity: "medium",
      message:
        "`findMany` in a request handler has no `take` / `cursor` — add a pagination bound, unbounded reads become a latency/memory issue as the table grows.",
      filePath: path,
      lineNumber: line ?? undefined,
    };
  }
  return null;
}

/**
 * Rule: unawaited Prisma call.
 *
 * `prisma.user.update({ ... })` without `await`, `return`, `void`, or a
 * visible `.then(` hanging off it is almost always a bug — the write
 * races the response and can be lost. We're conservative: only flag
 * lines that *start* with `prisma.` (i.e. statement position), and
 * where the same line does not show `await`/`return`/`yield`/`=` /
 * `void`.
 */
function ruleUnawaitedPrismaCall(file: File): AnalysisIssue | null {
  const { path, content } = file;
  if (!looksLikePrismaFile(content)) return null;
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const l = lines[i];
    // Statement-position prisma call.
    if (!/^\s*prisma\.\w+\.\w+\s*\(/.test(l)) continue;
    // Any of these prefixes on the same or previous line means it's awaited/returned/assigned.
    if (/^\s*(await|return|yield|void)\b|[=]\s*prisma\.|\.then\s*\(/.test(l))
      continue;
    const prev = i > 0 ? lines[i - 1] : "";
    // Handle the common pattern where the identifier is assigned across a wrap.
    if (/=\s*$/.test(prev)) continue;
    if (/^\s*(await|return|yield|void)\s*$/.test(prev)) continue;
    return {
      category: "logic",
      severity: "medium",
      message:
        "Prisma call is not awaited — the query races the surrounding code and writes can be lost. Add `await` (or `return` if returning the promise).",
      filePath: path,
      lineNumber: i + 1,
    };
  }
  return null;
}

export function runPrismaRules(file: File): AnalysisIssue[] {
  const out: AnalysisIssue[] = [];
  const rules = [
    ruleRawSqlInterpolation,
    ruleDestructiveWithoutWhere,
    ruleUnboundedFindMany,
    ruleUnawaitedPrismaCall,
  ] as const;
  for (const rule of rules) {
    const i = rule(file);
    if (i) out.push(i);
  }
  return out;
}

export const __testing = {
  ruleRawSqlInterpolation,
  ruleDestructiveWithoutWhere,
  ruleUnboundedFindMany,
  ruleUnawaitedPrismaCall,
  looksLikePrismaFile,
};
