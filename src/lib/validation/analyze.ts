import { z } from "zod";

const fileSchema = z.object({
  path: z.string().min(1).max(2048),
  content: z.string().max(500_000),
});

export const analyzeBodySchema = z
  .object({
    code: z.string().max(500_000).optional(),
    prUrl: z.string().max(2048).optional(),
    files: z.array(fileSchema).max(200).optional(),
    /** Optional workspace scope for history, rules, and webhooks. */
    workspaceId: z.string().cuid().optional(),
  })
  .superRefine((data, ctx) => {
    const hasCode = Boolean(data.code?.trim());
    const hasPr = Boolean(data.prUrl?.trim());
    const hasFiles = Boolean(data.files && data.files.length > 0);
    if (!hasCode && !hasPr && !hasFiles) {
      ctx.addIssue({
        code: "custom",
        message: "Provide at least one of: code, prUrl, or files.",
        path: [],
      });
    }
  });

export type AnalyzeBody = z.infer<typeof analyzeBodySchema>;
