import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold tracking-[-0.02em] transition-[color,box-shadow,transform,background-color,border-color] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 disabled:pointer-events-none disabled:opacity-45 dark:focus-visible:ring-zinc-500/70 dark:focus-visible:ring-offset-zinc-950 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-zinc-800/80 bg-zinc-900 text-white shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_2px_4px_-1px_rgba(0,0,0,0.18),0_4px_12px_-4px_rgba(0,0,0,0.22)] hover:border-zinc-700 hover:bg-zinc-800 hover:shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_4px_8px_-2px_rgba(0,0,0,0.25)] [&_svg]:text-white dark:border-white/12 dark:bg-zinc-100 dark:text-zinc-950 dark:[&_svg]:text-zinc-950 dark:shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_1px_2px_rgba(0,0,0,0.15),0_8px_24px_-8px_rgba(0,0,0,0.55)] dark:hover:border-white/20 dark:hover:bg-white dark:hover:shadow-[0_1px_0_0_rgba(255,255,255,1)_inset,0_4px_16px_-4px_rgba(0,0,0,0.45)]",
        outline:
          "border border-zinc-300 bg-white text-zinc-900 shadow-sm hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-100 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] dark:hover:border-zinc-500 dark:hover:bg-zinc-800/90",
        ghost:
          "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800/90",
        link: "rounded-md border-0 bg-transparent px-0 font-medium text-zinc-700 underline-offset-[3px] shadow-none hover:bg-transparent hover:text-zinc-950 hover:underline active:scale-100 dark:text-zinc-300 dark:hover:text-white",
        /** Marketing / landing — warm stone pills (use with any size; ! fixes height vs default) */
        landingPrimary:
          "!h-11 !min-h-[2.75rem] !rounded-full !px-7 !text-[14px] border border-stone-900/15 bg-stone-900 text-white shadow-[0_1px_2px_rgba(28,25,23,0.12)] hover:bg-stone-800 hover:shadow-[0_2px_8px_-2px_rgba(28,25,23,0.2)] [&_svg]:text-white dark:border-stone-800 dark:bg-stone-900 dark:text-white dark:[&_svg]:text-white dark:hover:bg-stone-800",
        landingSecondary:
          "!h-11 !min-h-[2.75rem] !rounded-full !px-6 !text-[14px] border border-stone-200/95 bg-gradient-to-b from-white to-stone-50/70 font-semibold text-stone-800 shadow-[0_1px_0_0_rgba(255,255,255,0.95)_inset,0_2px_6px_-1px_rgba(28,25,23,0.06),0_8px_24px_-12px_rgba(90,70,55,0.15)] ring-1 ring-stone-900/[0.04] hover:border-stone-300/90 hover:bg-white hover:shadow-[0_1px_0_0_rgba(255,255,255,1)_inset,0_4px_14px_-4px_rgba(90,70,55,0.12)] hover:ring-stone-900/[0.06] active:scale-[0.99] dark:border-stone-600/50 dark:bg-gradient-to-b dark:from-stone-900/88 dark:to-stone-950 dark:text-stone-100 dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)_inset,0_2px_8px_-2px_rgba(0,0,0,0.38)] dark:ring-stone-700/25 dark:hover:border-stone-500/55 dark:hover:from-stone-800/94 dark:hover:to-stone-900 dark:hover:shadow-[0_4px_16px_-6px_rgba(0,0,0,0.35)] dark:[&_svg]:text-stone-200",
        landingNavPrimary:
          "!h-9 !min-h-9 !rounded-full !px-3.5 !text-[13px] border border-stone-900/15 bg-stone-900 font-semibold text-white shadow-sm hover:bg-stone-800 [&_svg]:size-3.5 [&_svg]:text-white dark:bg-stone-900 dark:text-white dark:[&_svg]:text-white dark:hover:bg-stone-800",
        landingNavSecondary:
          "!h-9 !min-h-9 !rounded-full !px-3.5 !text-[13px] border border-stone-200/90 bg-gradient-to-b from-white to-stone-50/60 font-semibold text-stone-800 shadow-[0_1px_0_0_rgba(255,255,255,0.95)_inset,0_1px_3px_rgba(28,25,23,0.06),0_6px_16px_-8px_rgba(90,70,55,0.12)] ring-1 ring-stone-900/[0.04] hover:border-stone-300/80 hover:bg-white hover:shadow-[0_2px_10px_-4px_rgba(90,70,55,0.14)] dark:border-stone-600/45 dark:bg-gradient-to-b dark:from-stone-900/85 dark:to-stone-950 dark:text-stone-100 dark:shadow-[0_1px_2px_rgba(0,0,0,0.28)] dark:ring-stone-700/28 dark:hover:border-stone-500/50 dark:hover:from-stone-800/92 dark:hover:to-stone-900 dark:[&_svg]:text-stone-200",
      },
      size: {
        default: "h-10 min-h-10 px-5 py-2",
        sm: "h-9 min-h-9 rounded-lg px-3.5 text-[13px]",
        lg: "h-11 min-h-11 rounded-xl px-8 text-[15px]",
        icon: "h-10 w-10 min-h-10 rounded-xl p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
