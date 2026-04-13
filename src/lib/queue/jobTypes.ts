import type { AnalyzeBody } from "@/lib/validation/analyze";

/** Serializable payload for the BullMQ worker (no live PR fetch in the API process). */
export type AnalyzeJobData =
  | { mode: "pr"; prUrl: string; workspaceId?: string }
  | {
      mode: "paste";
      code?: string;
      files?: Array<{ path: string; content: string }>;
      workspaceId?: string;
    };

function workspaceFromBody(body: AnalyzeBody): { workspaceId?: string } {
  const w = body.workspaceId?.trim();
  return w ? { workspaceId: w } : {};
}

export function analyzeBodyToJobData(body: AnalyzeBody): AnalyzeJobData | null {
  const ws = workspaceFromBody(body);
  if (body.prUrl?.trim()) {
    return { mode: "pr", prUrl: body.prUrl.trim(), ...ws };
  }
  if (body.files && body.files.length > 0) {
    return {
      mode: "paste",
      files: body.files.map((f) => ({ path: f.path, content: f.content })),
      ...ws,
    };
  }
  if (body.code?.trim()) {
    return { mode: "paste", code: body.code.trim(), ...ws };
  }
  return null;
}

export function jobDataToAnalyzeBody(data: AnalyzeJobData): AnalyzeBody {
  const ws =
    data.workspaceId != null && data.workspaceId !== ""
      ? { workspaceId: data.workspaceId }
      : {};
  if (data.mode === "pr") {
    return { prUrl: data.prUrl, ...ws };
  }
  if (data.files && data.files.length > 0) {
    return { files: data.files, ...ws };
  }
  return { code: data.code ?? "", ...ws };
}
