import type { AnalyzeBody } from "@/lib/validation/analyze";

/** Serializable payload for the BullMQ worker (no live PR fetch in the API process). */
export type AnalyzeJobData =
  | {
      mode: "pr";
      prUrl: string;
      workspaceId?: string;
      projectId?: string;
      userId?: string | null;
      apiKeyId?: string | null;
    }
  | {
      mode: "paste";
      code?: string;
      files?: Array<{ path: string; content: string }>;
      workspaceId?: string;
      projectId?: string;
      userId?: string | null;
      apiKeyId?: string | null;
    };

function workspaceFromBody(body: AnalyzeBody): { workspaceId?: string; projectId?: string } {
  const w = body.workspaceId?.trim();
  const p = body.projectId?.trim();
  return {
    ...(w ? { workspaceId: w } : {}),
    ...(p ? { projectId: p } : {}),
  };
}

export function analyzeBodyToJobData(
  body: AnalyzeBody,
  auth?: { userId?: string | null; apiKeyId?: string | null },
): AnalyzeJobData | null {
  const ws = workspaceFromBody(body);
  const au = {
    userId: auth?.userId ?? null,
    apiKeyId: auth?.apiKeyId ?? null,
  };
  if (body.prUrl?.trim()) {
    return { mode: "pr", prUrl: body.prUrl.trim(), ...ws, ...au };
  }
  if (body.files && body.files.length > 0) {
    return {
      mode: "paste",
      files: body.files.map((f) => ({ path: f.path, content: f.content })),
      ...ws,
      ...au,
    };
  }
  if (body.code?.trim()) {
    return { mode: "paste", code: body.code.trim(), ...ws, ...au };
  }
  return null;
}

export function jobDataToAnalyzeBody(data: AnalyzeJobData): AnalyzeBody {
  const ws =
    data.workspaceId != null && data.workspaceId !== ""
      ? { workspaceId: data.workspaceId }
      : {};
  const p =
    data.projectId != null && data.projectId !== ""
      ? { projectId: data.projectId }
      : {};
  if (data.mode === "pr") {
    return { prUrl: data.prUrl, ...ws, ...p };
  }
  if (data.files && data.files.length > 0) {
    return { files: data.files, ...ws, ...p };
  }
  return { code: data.code ?? "", ...ws, ...p };
}
