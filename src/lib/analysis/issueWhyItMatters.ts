/** Static “why this matters” copy for transparency (Elite spec: issue detail). */

const CATEGORY: Record<string, string> = {
  security:
    "Security issues can become breaches or data loss once this ships. Fixing them before merge is far cheaper than after production.",
  logic:
    "Logic bugs cause wrong behavior, bad data, and hard-to-debug incidents. They often slip past casual review when AI-generated code looks plausible.",
  performance:
    "Performance regressions can slow users, spike infra cost, and trigger outages under load. Catching them here avoids firefighting later.",
  testing:
    "Without tests, refactors and fixes can silently break behavior. Weak coverage signals higher risk when this code changes again.",
  accessibility:
    "Accessibility gaps exclude users, create compliance risk, and often surface as costly rework after launch.",
  maintainability:
    "Hard-to-read or duplicated code slows every future change and increases the chance of new defects.",
};

const SEVERITY: Record<string, string> = {
  critical:
    "Critical severity usually means an exploitable flaw, data exposure, or a correctness break that could fail in production immediately.",
  high:
    "High severity indicates serious risk or a likely failure mode that should be addressed before shipping.",
  medium:
    "Medium severity is meaningful but may be acceptable short-term if tracked and scheduled.",
  low:
    "Low severity is a smaller concern; still worth fixing when touching the same area.",
};

export function issueWhyItMatters(category: string, severity: string): string {
  const c =
    CATEGORY[category.toLowerCase()] ??
    "This dimension contributes to overall trust and release readiness.";
  const s =
    SEVERITY[severity.toLowerCase()] ??
    "Severity reflects how strongly this issue should influence the verdict.";
  return `${c} ${s}`;
}
