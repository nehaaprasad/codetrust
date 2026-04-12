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

/** Extra review pass using OpenAI. Returns null if skipped or on failure. */
export async function fetchLlmReview(
  files: CodeFile[],
): Promise<{ issues: AnalysisIssue[]; summaryNote?: string } | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key || process.env.ENABLE_LLM === "false") return null;

  const context = buildContext(files);
  if (!context.trim()) return null;

  try {
    const client = new OpenAI({ apiKey: key });
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

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
    if (!raw) return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripJsonFence(raw));
    } catch {
      return null;
    }

    const safe = responseSchema.safeParse(parsed);
    if (!safe.success) return null;

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
    };
  } catch (e) {
    console.error("OpenAI review failed:", e);
    return null;
  }
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
