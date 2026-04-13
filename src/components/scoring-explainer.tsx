import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CATEGORY_WEIGHTS } from "@/lib/analysis/weights";

const ORDER = [
  ["security", "Security"],
  ["logic", "Logic"],
  ["performance", "Performance"],
  ["testing", "Testing"],
  ["accessibility", "Accessibility"],
  ["maintainability", "Maintainability"],
] as const;

export function ScoringExplainer() {
  return (
    <Card className="overflow-hidden rounded-2xl border-zinc-200/90 bg-white/80 shadow-lg shadow-zinc-900/5 backdrop-blur-sm dark:border-zinc-700/60 dark:bg-zinc-950/45 dark:shadow-[0_0_0_1px_rgba(63,63,70,0.35),0_20px_50px_-24px_rgba(0,0,0,0.5)]">
      <CardHeader className="border-b border-zinc-100 dark:border-zinc-800">
        <CardTitle className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          How scoring works
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          Matches the product blueprint: weighted dimensions, then verdict thresholds.
          Critical security issues always force BLOCK.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6 text-sm text-zinc-700 dark:text-zinc-300">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Dimension weights
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1.5 text-zinc-700 dark:text-zinc-300">
            {ORDER.map(([key, label]) => (
              <li key={key}>
                {label}: {Math.round(CATEGORY_WEIGHTS[key as keyof typeof CATEGORY_WEIGHTS] * 100)}%
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Verdict thresholds
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1.5 text-zinc-700 dark:text-zinc-300">
            <li>85–100 → SAFE (unless blocked by critical security)</li>
            <li>60–84 → RISKY</li>
            <li>Under 60 → BLOCK</li>
            <li>Any critical security issue → BLOCK</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
