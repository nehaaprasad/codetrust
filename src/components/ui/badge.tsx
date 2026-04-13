import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/40 dark:focus:ring-sky-400/35",
  {
    variants: {
      variant: {
        default:
          "border-sky-200 bg-sky-600 text-white shadow-sm shadow-sky-900/10 hover:bg-sky-700 dark:border-sky-400/35 dark:bg-sky-500/20 dark:text-sky-50 dark:shadow-[0_0_28px_-6px_rgba(56,189,248,0.55)] dark:hover:bg-sky-400/25",
        secondary:
          "border-zinc-200 bg-zinc-100 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-100",
        risky:
          "border-amber-200/80 bg-amber-100 text-amber-950 dark:border-amber-500/25 dark:bg-amber-500/12 dark:text-amber-100 dark:shadow-[0_0_20px_-8px_rgba(245,158,11,0.35)]",
        block:
          "border-red-200/80 bg-red-100 text-red-950 dark:border-red-500/30 dark:bg-red-500/12 dark:text-red-100 dark:shadow-[0_0_20px_-8px_rgba(248,113,113,0.35)]",
        outline: "text-zinc-950 dark:text-zinc-50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
