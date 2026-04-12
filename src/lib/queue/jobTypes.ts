import type { AnalyzeBody } from "@/lib/validation/analyze";

/** Serializable payload for the BullMQ worker (no live PR fetch in the API process). */
export type AnalyzeJobData =
  | { mode: "pr"; prUrl: string }
  | {
      mode: "paste";
      code?: string;
      files?: Array<{ path: string; content: string }>;
    };

export function analyzeBodyToJobData(body: AnalyzeBody): AnalyzeJobData | null {
  if (body.prUrl?.trim()) {
    return { mode: "pr", prUrl: body.prUrl.trim() };
  }
  if (body.files && body.files.length > 0) {
    return {
      mode: "paste",
      files: body.files.map((f) => ({ path: f.path, content: f.content })),
    };
  }
  if (body.code?.trim()) {
    return { mode: "paste", code: body.code.trim() };
  }
  return null;
}

export function jobDataToAnalyzeBody(data: AnalyzeJobData): AnalyzeBody {
  if (data.mode === "pr") {
    return { prUrl: data.prUrl };
  }
  if (data.files && data.files.length > 0) {
    return { files: data.files };
  }
  return { code: data.code ?? "" };
}
