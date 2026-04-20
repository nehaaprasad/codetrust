import OpenAI from "openai";
import { z } from "zod";
import type { CodeFile } from "./checks";
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

  const context = buildContext(files);
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
          content:
            "You review code for release readiness. Respond with JSON only. " +
            "List issues that simple pattern scanners often miss: edge cases, error handling, " +
            "contracts between modules, risky assumptions, shallow tests, accessibility gaps. " +
            "Use the same categories and severities as in the schema. " +
            "Avoid vague praise; each issue must be actionable. " +
            "If code looks fine for deeper review, return few or zero issues.",
        },
        {
          role: "user",
          content:
            `Files to review (truncated):\n\n${context}\n\n` +
            "Return JSON: {\"issues\":[{\"category\":\"security|logic|performance|testing|accessibility|maintainability\",\"severity\":\"low|medium|high|critical\",\"message\":\"...\",\"filePath\":\"optional\",\"lineNumber\":null or number}],\"summaryNote\":\"optional short sentence\"}",
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

    const issues: AnalysisIssue[] = safe.data.issues.map((i) => ({
      category: i.category,
      severity: i.severity,
      message: i.message,
      ...(i.filePath ? { filePath: i.filePath } : {}),
      lineNumber: i.lineNumber ?? undefined,
    }));

    return {
      issues,
      ...(safe.data.summaryNote ? { summaryNote: safe.data.summaryNote } : {}),
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

function buildContext(files: CodeFile[]): string {
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
