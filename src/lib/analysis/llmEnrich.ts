import OpenAI from "openai";
import { z } from "zod";
import type { CodeFile } from "./checks";
import type { ChangedFileRegion } from "./diff-parser";
import type { AnalysisIssue } from "./types";

const categorySchema = z.enum([
  "security",
  "logic",
  "performance",
  "testing",
  "accessibility",
  "maintainability",
]);

const severitySchema = z.enum(["low", "medium", "high", "critical"]);

const responseSchema = z.object({
  issues: z
    .array(
      z.object({
        category: categorySchema,
        severity: severitySchema,
        message: z.string().min(1).max(600),
        filePath: z.string().optional(),
        lineNumber: z.number().int().positive().optional().nullable(),
      }),
    )
    .max(12),
  summaryNote: z.string().max(400).optional(),
});

const MAX_FILES = 8;
const MAX_CHARS_PER_FILE = 4_000;
const MAX_CONTEXT_CHARS = 24_000;

/**
 * Extra review pass using any OpenAI-compatible LLM provider.
 *
 * Despite the historical `OPENAI_*` env var names, this function is not
 * tied to OpenAI the vendor: the OpenAI Node SDK accepts an arbitrary
 * `baseURL`, so any provider whose HTTP surface mirrors OpenAI's
 * `/chat/completions` endpoint works with zero code changes. In practice
 * that means:
 *
 *   - **OpenAI**        — default, leave `OPENAI_BASE_URL` unset
 *   - **Groq**          — free tier, fast — see `.env.example` for setup
 *   - **OpenRouter**    — routes to many models, some free
 *   - **Together AI**   — free tier available
 *   - **Fireworks AI**  — OpenAI-compatible `chat/completions`
 *   - **Azure OpenAI**  — set base URL to your Azure deployment
 *
 * Provider defaults for model:
 *   - If `OPENAI_MODEL` is set, use it verbatim.
 *   - Else if `OPENAI_BASE_URL` points at groq.com, default to
 *     `llama-3.3-70b-versatile` (fast, free, supports JSON mode).
 *   - Else default to `gpt-4o-mini` (OpenAI).
 *
 * Returns `null` when the pass did not run (skipped or failed). Every path
 * that returns `null` logs a single line prefixed with `[ai-review]` to
 * stderr / Vercel function logs, so operators can diagnose a silent
 * `deterministic-v1` deployment by grepping one tag instead of guessing.
 *
 * Log taxonomy:
 *   [ai-review] skipped: OPENAI_API_KEY not set      (fix: set it)
 *   [ai-review] skipped: ENABLE_LLM=false            (someone turned it off)
 *   [ai-review] skipped: empty context               (no text to send)
 *   [ai-review] api error status=<code> message=…    (provider returned err)
 *   [ai-review] empty completion                     (provider returned nothing)
 *   [ai-review] invalid json in completion           (couldn't parse reply)
 *   [ai-review] schema mismatch                      (shape didn't match)
 */
export async function fetchLlmReview(
  files: CodeFile[],
  opts?: {
    /**
     * If provided, the LLM receives a diff-scoped view of each file —
     * added/modified lines prefixed with `>>` and surrounded by a few lines
     * of context — instead of the full file. The prompt instructs the model
     * to target the marked lines, which eliminates the "LLM comments on
     * pre-existing code" failure mode that produces generic findings on
     * refactor PRs.
     */
    changedRegions?: Record<string, ChangedFileRegion>;
  },
): Promise<{
  issues: AnalysisIssue[];
  summaryNote?: string;
  provider: string;
} | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    console.warn("[ai-review] skipped: OPENAI_API_KEY not set");
    return null;
  }
  if (process.env.ENABLE_LLM === "false") {
    console.warn("[ai-review] skipped: ENABLE_LLM=false");
    return null;
  }

  const useDiffContext =
    opts?.changedRegions != null &&
    Object.keys(opts.changedRegions).length > 0;
  const context = useDiffContext
    ? buildDiffContext(files, opts!.changedRegions!)
    : buildFullFileContext(files);
  if (!context.trim()) {
    console.warn("[ai-review] skipped: empty context (no readable files)");
    return null;
  }

  const baseURL = process.env.OPENAI_BASE_URL?.trim() || undefined;
  const model = resolveDefaultModel(baseURL);

  try {
    const client = new OpenAI({ apiKey: key, ...(baseURL ? { baseURL } : {}) });

    const completion = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are a senior security-minded code reviewer. Respond with JSON only — no prose outside the JSON object.",
            "",
            useDiffContext
              ? "REVIEW SCOPE (diff-aware mode): each file below shows windows around the lines the pull request ADDS or MODIFIES. Lines prefixed with `>>` are those changed lines. Lines without `>>` are surrounding context shown so you understand what the change interacts with. Your findings MUST target the `>>` lines — either a bug introduced by a `>>` line, a contract break between a `>>` line and surrounding code, or a missing safeguard around the `>>` lines. Do NOT file findings that describe only context lines."
              : "REVIEW SCOPE: review each file as a whole.",
            "",
            "HARD RULES (violations mean the finding is wrong and must be dropped):",
            "",
            "R1. Every finding must be grounded in the code shown to you. Cite filePath and the exact lineNumber from the `NN:` gutter.",
            "",
            "R2. BANNED WORDS in every `message` AND in `summaryNote`: may, might, could, possibly, potential, potentially, susceptible, in certain scenarios, should be improved, should consider.",
            "    If you cannot state the defect as a declarative fact ('X is Y' / 'X does Z'), OMIT the finding.",
            "    Wrong: 'The call may be susceptible to injection'. Right: 'line 45 passes user-controlled `name` into shell=True subprocess'.",
            "",
            "R3. For any `security` finding, you must be able to name: (a) the untrusted input source, (b) the sink where it lands, (c) the exploit the attacker gains. If you cannot name all three from the code, it is NOT a security finding.",
            "",
            "R4. FALSE-POSITIVE PATTERNS — do NOT file these:",
            "    - `subprocess.Popen([const, const, ...], shell=False)` where every argv entry is a string literal, `sys.executable`, `__file__`, or another module-level constant. String literals cannot be injected.",
            "    - A database connection string / URL is NOT a SQL query. SQL injection requires query text built by concatenation/interpolation of untrusted input; a connection URL has no such surface.",
            "    - Missing try/except around a test fixture. Test fixtures are allowed to raise — pytest surfaces the error.",
            "    - 'Consider adding tests / docs / type hints' unless the PR actually breaks existing ones.",
            "    - Logging calls, comments, formatting, or import order.",
            "    - Calls whose inputs are all constants defined in the same file.",
            "",
            "R5. Do NOT file a finding that agrees with the code in the same sentence ('X is correct, but ...'). If the code is correct, stay silent.",
            "",
            "R6. Severity rubric — do NOT inflate:",
            "    - critical: exploitable by an unauthenticated attacker, OR silent data loss/corruption.",
            "    - high: concrete bug a reviewer would block on (auth bypass, wrong result returned to caller, visible race condition, unhandled exception on a hot path).",
            "    - medium: real defect, non-blocking.",
            "    - low: minor correctness nit.",
            "",
            "R7. If the change looks sound after honest review, return {\"issues\": []} and omit summaryNote. Zero findings is a trusted, correct answer; padding with weak findings is not.",
            "",
            "Categories allowed: security, logic, performance, testing, accessibility, maintainability.",
            "Severities allowed: low, medium, high, critical.",
          ].join("\n"),
        },
        {
          role: "user",
          content:
            `${useDiffContext ? "Diff-scoped view of changes (lines with `>>` are changed; others are context):" : "Files to review (truncated):"}\n\n${context}\n\n` +
            'Return JSON in this exact shape: {"issues":[{"category":"security|logic|performance|testing|accessibility|maintainability","severity":"low|medium|high|critical","message":"declarative fact with file+line, no banned words","filePath":"path","lineNumber":number}],"summaryNote":"optional single declarative sentence, no banned words, or omit"}',
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      console.warn(`[ai-review] empty completion model=${model}`);
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripJsonFence(raw));
    } catch {
      console.warn(
        `[ai-review] invalid json in completion model=${model} preview=${raw.slice(0, 120)}`,
      );
      return null;
    }

    const safe = responseSchema.safeParse(parsed);
    if (!safe.success) {
      console.warn(
        `[ai-review] schema mismatch model=${model} issues=${safe.error.issues.length}`,
      );
      return null;
    }

    const rawIssues: AnalysisIssue[] = safe.data.issues.map((i) => ({
      category: i.category,
      severity: i.severity,
      message: i.message,
      ...(i.filePath ? { filePath: i.filePath } : {}),
      lineNumber: i.lineNumber ?? undefined,
    }));

    // Belt-and-braces hedging filter. The prompt tells the model not to use
    // hedging words, but llama-3.3-70b and similar models ignore this ~20% of
    // the time. A finding that hedges ("may be susceptible", "could lead to")
    // is, by the prompt's own definition, one the model couldn't commit to —
    // so it shouldn't reach the user. We drop it here rather than argue with
    // the model. Same rule applies to summaryNote: if it hedges, we drop it
    // entirely rather than ship "Multiple potential security issues" copy.
    const issues = rawIssues.filter((i) => !containsHedging(i.message));
    const droppedHedging = rawIssues.length - issues.length;
    if (droppedHedging > 0) {
      console.warn(
        `[ai-review] filtered ${droppedHedging}/${rawIssues.length} hedging finding(s) model=${model}`,
      );
    }

    const rawNote = safe.data.summaryNote?.trim();
    const summaryNote =
      rawNote && !containsHedging(rawNote) ? rawNote : undefined;
    if (rawNote && !summaryNote) {
      console.warn(
        `[ai-review] dropped hedging summaryNote model=${model} preview=${rawNote.slice(0, 80)}`,
      );
    }

    return {
      issues,
      ...(summaryNote ? { summaryNote } : {}),
      provider: resolveProviderName(baseURL),
    };
  } catch (e) {
    // The OpenAI SDK attaches `status` (HTTP code) and `code` (string enum) on
    // its error classes. Surfacing both turns "it doesn't work" into "you got
    // a 401 invalid_api_key" without having to dig.
    const err = e as {
      status?: number;
      code?: string;
      message?: string;
      name?: string;
    };
    const status = err.status ?? "?";
    const code = err.code ?? err.name ?? "unknown";
    const message = err.message ?? String(e);
    const providerHint = baseURL ? ` baseURL=${baseURL}` : "";
    console.error(
      `[ai-review] api error model=${model}${providerHint} status=${status} code=${code} message=${message}`,
    );
    return null;
  }
}

/**
 * Pick a sensible default model for the configured provider.
 *
 * Respects an explicit `OPENAI_MODEL` env var if the operator set one;
 * otherwise routes based on the base URL so a "just set the key and go"
 * setup works for each supported provider.
 */
function resolveDefaultModel(baseURL: string | undefined): string {
  const override = process.env.OPENAI_MODEL?.trim();
  if (override) return override;
  if (baseURL && /groq\.com/i.test(baseURL)) return "llama-3.3-70b-versatile";
  if (baseURL && /openrouter\.ai/i.test(baseURL)) return "meta-llama/llama-3.3-70b-instruct:free";
  if (baseURL && /together\.(ai|xyz)/i.test(baseURL))
    return "meta-llama/Llama-3.3-70B-Instruct-Turbo";
  return "gpt-4o-mini";
}

/**
 * Short provider slug derived from the base URL, used to build the
 * `modelVersion` string on the result (e.g. `deterministic+groq-v1`).
 * Defaults to `openai` when no base URL is set.
 */
function resolveProviderName(baseURL: string | undefined): string {
  if (!baseURL) return "openai";
  if (/groq\.com/i.test(baseURL)) return "groq";
  if (/openrouter\.ai/i.test(baseURL)) return "openrouter";
  if (/together\.(ai|xyz)/i.test(baseURL)) return "together";
  if (/fireworks\.ai/i.test(baseURL)) return "fireworks";
  if (/azure\.com/i.test(baseURL)) return "azure";
  return "custom";
}

/** Lines of surrounding context to include around each changed line. */
const DIFF_CONTEXT_LINES = 4;

/**
 * Full-file context used when we have no diff information (direct code
 * pastes, repo-root analysis, or a caller that didn't pass changedRegions).
 */
function buildFullFileContext(files: CodeFile[]): string {
  const parts: string[] = [];
  let total = 0;
  let n = 0;
  for (const f of files) {
    if (n >= MAX_FILES) break;
    let body = f.content;
    if (body.length > MAX_CHARS_PER_FILE) {
      body = `${body.slice(0, MAX_CHARS_PER_FILE)}\n… [truncated]`;
    }
    const block = `--- ${f.path} ---\n${body}`;
    if (total + block.length > MAX_CONTEXT_CHARS) break;
    parts.push(block);
    total += block.length;
    n += 1;
  }
  return parts.join("\n\n");
}

/**
 * Diff-aware context. For each file that the PR changed we emit windows of
 * the post-PR file around each added/modified line, with the changed lines
 * prefixed with `>>` so the LLM can tell them apart from pure context at a
 * glance. Line numbers are printed in a `NN:` gutter so the model can cite
 * them back in findings without having to guess hunk-relative offsets.
 *
 * Example output for a file where the PR added lines 45 and 46:
 *
 *   --- src/auth.ts ---
 *      41:   export function verify(token: string) {
 *      42:     const payload = decode(token);
 *      43:     if (!payload) throw new Error("bad token");
 *      44:     const userId = payload.sub;
 *   >> 45:     const sql = `SELECT * FROM users WHERE id = ${userId}`;
 *   >> 46:     return db.query(sql);
 *      47:   }
 *      48: }
 *
 * Windows that overlap (or sit within 2*CONTEXT_LINES of each other) are
 * merged so a hunk spanning 20 added lines renders as one contiguous block
 * instead of a comb of tiny windows.
 *
 * Files with zero added lines (pure deletions, or files untouched by this
 * PR that we nevertheless fetched) are omitted — there is nothing for the
 * LLM to review post-change.
 */
function buildDiffContext(
  files: CodeFile[],
  changedRegions: Record<string, ChangedFileRegion>,
): string {
  const parts: string[] = [];
  let total = 0;
  let n = 0;
  for (const f of files) {
    if (n >= MAX_FILES) break;
    const region = changedRegions[f.path];
    if (!region) continue;
    if (region.addedLines.length === 0) continue;

    const block = renderAnnotatedWindows(f, region);
    if (!block.trim()) continue;
    if (total + block.length > MAX_CONTEXT_CHARS) break;
    parts.push(block);
    total += block.length;
    n += 1;
  }
  return parts.join("\n\n");
}

function renderAnnotatedWindows(
  file: CodeFile,
  region: ChangedFileRegion,
): string {
  const sourceLines = file.content.split(/\r?\n/);
  const addedSet = new Set(region.addedLines.map((l) => l.lineNumber));

  const windows: Array<{ start: number; end: number }> = [];
  for (const ln of addedSet) {
    windows.push({
      start: Math.max(1, ln - DIFF_CONTEXT_LINES),
      end: Math.min(sourceLines.length, ln + DIFF_CONTEXT_LINES),
    });
  }
  windows.sort((a, b) => a.start - b.start);

  const merged: Array<{ start: number; end: number }> = [];
  for (const w of windows) {
    const last = merged[merged.length - 1];
    if (last && w.start <= last.end + 1) {
      last.end = Math.max(last.end, w.end);
    } else {
      merged.push({ ...w });
    }
  }

  const out: string[] = [`--- ${file.path} ---`];
  let rendered = 0;
  for (let i = 0; i < merged.length; i++) {
    if (rendered > MAX_CHARS_PER_FILE) {
      out.push("   … [remaining windows truncated]");
      break;
    }
    if (i > 0) out.push("   … [skipped unchanged lines] …");
    const w = merged[i];
    for (let ln = w.start; ln <= w.end; ln++) {
      const marker = addedSet.has(ln) ? ">>" : "  ";
      const gutter = String(ln).padStart(4);
      const body = sourceLines[ln - 1] ?? "";
      const row = `${marker} ${gutter}: ${body}`;
      out.push(row);
      rendered += row.length + 1;
    }
  }
  return out.join("\n");
}

/**
 * Hedging vocabulary that drains trust from a code review.
 *
 * Patterns match either the exact word (case-insensitive) or a telltale
 * hedging phrase. A message that contains any of these is, by definition,
 * one the model wasn't willing to commit to — and therefore not one we want
 * to put in front of a senior reviewer.
 *
 * Examples filtered:
 *   "may lead to a race condition"     → dropped (`\bmay\b`)
 *   "Potential SQL injection"          → dropped (`\bpotential\b`)
 *   "could be susceptible to …"        → dropped (multiple hits)
 *
 * NOT filtered (declarative, keep):
 *   "line 45 passes `name` to shell=True subprocess"
 *   "fetchUser returns null when id is 0, callers don't handle it"
 */
const HEDGING_PATTERNS: RegExp[] = [
  /\bmay\b/i,
  /\bmight\b/i,
  /\bcould\b/i,
  /\bpossibly\b/i,
  /\bpotential(ly)?\b/i,
  /\bsusceptible\b/i,
  /\bin certain scenarios\b/i,
  /\bshould be improved\b/i,
  /\bshould consider\b/i,
];

function containsHedging(s: string): boolean {
  return HEDGING_PATTERNS.some((re) => re.test(s));
}

function stripJsonFence(s: string): string {
  const t = s.trim();
  if (t.startsWith("```")) {
    return t
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/u, "")
      .trim();
  }
  return t;
}

export function mergeIssues(
  first: AnalysisIssue[],
  second: AnalysisIssue[],
): AnalysisIssue[] {
  const seen = new Set(first.map((i) => i.message.trim().toLowerCase()));
  const out = [...first];
  for (const i of second) {
    const k = i.message.trim().toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(i);
  }
  return out;
}

/**
 * Test-only surface: exposes the internal context builders so scenario
 * tests can verify the rendered format without making a real API call.
 * Keep this tiny — anything added here becomes API surface.
 */
export const __testing = {
  buildDiffContext,
  buildFullFileContext,
};
