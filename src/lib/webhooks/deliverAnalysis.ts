import { createHmac } from "crypto";
import type { AnalysisResult } from "@/lib/analysis/run";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";

export function isValidWebhookUrl(raw: string): boolean {
  try {
    const u = new URL(raw.trim());
    if (!["http:", "https:"].includes(u.protocol)) return false;
    if (process.env.NODE_ENV === "production" && u.protocol !== "https:") {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export type OutboundAnalysisPayload = {
  event: "analysis.completed";
  analysisId: string;
  workspaceId: string | null;
  score: number;
  decision: string;
  modelVersion: string;
  summary: string;
  repoUrl: string | null;
  prUrl: string | null;
  prNumber: number | null;
  issues: Array<{
    category: string;
    severity: string;
    message: string;
    filePath?: string;
    lineNumber?: number | null;
  }>;
};

async function postWithRetries(
  url: string,
  body: string,
  headers: Record<string, string>,
): Promise<void> {
  const delays = [500, 1500, 4500];
  let lastErr: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 12_000);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body,
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (res.ok) return;
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        return;
      }
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    if (attempt < delays.length) {
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }
  }
  console.error("developer webhook delivery failed:", url, lastErr);
}

export async function deliverAnalysisWebhooks(opts: {
  analysisId: string;
  workspaceId: string | null;
  result: AnalysisResult;
  repoMeta: {
    repoUrl: string;
    prUrl: string;
    prNumber: number;
  } | null;
}): Promise<void> {
  if (!isDatabaseConfigured()) return;
  if (!opts.workspaceId) return;

  const prisma = getPrisma();
  const hooks = await prisma.developerWebhook.findMany({
    where: {
      enabled: true,
      workspaceId: opts.workspaceId,
    },
  });

  const payload: OutboundAnalysisPayload = {
    event: "analysis.completed",
    analysisId: opts.analysisId,
    workspaceId: opts.workspaceId,
    score: opts.result.score,
    decision: opts.result.decision,
    modelVersion: opts.result.modelVersion,
    summary: opts.result.summary,
    repoUrl: opts.repoMeta?.repoUrl ?? null,
    prUrl: opts.repoMeta?.prUrl ?? null,
    prNumber: opts.repoMeta?.prNumber ?? null,
    issues: opts.result.issues.map((i) => ({
      category: i.category,
      severity: i.severity,
      message: i.message,
      filePath: i.filePath,
      lineNumber: i.lineNumber ?? null,
    })),
  };

  const raw = JSON.stringify(payload);

  for (const h of hooks) {
    if (!isValidWebhookUrl(h.url)) continue;
    const headers: Record<string, string> = {};
    if (h.secret?.trim()) {
      const sig = createHmac("sha256", h.secret.trim())
        .update(raw)
        .digest("hex");
      headers["X-Webhook-Signature"] = `sha256=${sig}`;
    }
    await postWithRetries(h.url.trim(), raw, headers);
  }
}
