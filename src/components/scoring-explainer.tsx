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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">How scoring works</CardTitle>
        <CardDescription>
          Matches the product blueprint: weighted dimensions, then verdict thresholds.
          Critical security issues always force BLOCK.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-zinc-700 dark:text-zinc-300">
        <div>
          <p className="font-medium text-zinc-900 dark:text-zinc-100">Dimension weights</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {ORDER.map(([key, label]) => (
              <li key={key}>
                {label}: {Math.round(CATEGORY_WEIGHTS[key as keyof typeof CATEGORY_WEIGHTS] * 100)}%
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-medium text-zinc-900 dark:text-zinc-100">Verdict thresholds</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
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
