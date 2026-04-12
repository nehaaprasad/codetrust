import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600",
        secondary:
          "border-transparent bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
        risky:
          "border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
        block:
          "border-transparent bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
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
