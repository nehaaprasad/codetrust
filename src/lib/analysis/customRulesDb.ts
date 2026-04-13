import { getPrisma, isDatabaseConfigured } from "@/lib/db";
import type { CustomRuleRow } from "./customRulesApply";

/** Rules for the given workspace only (no workspace on the request → none). */
export async function loadEnabledCustomRules(
  workspaceId?: string | null,
): Promise<CustomRuleRow[]> {
  if (!isDatabaseConfigured() || !workspaceId) return [];
  const prisma = getPrisma();
  const rows = await prisma.customRule.findMany({
    where: {
      enabled: true,
      workspaceId,
    },
    select: {
      id: true,
      name: true,
      pattern: true,
      category: true,
      severity: true,
    },
  });
  return rows;
}
