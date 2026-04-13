import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/45 dark:focus-visible:ring-sky-400/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-sky-600 text-white shadow-md shadow-sky-900/15 hover:bg-sky-500 dark:bg-sky-500 dark:shadow-[0_0_32px_-6px_rgba(56,189,248,0.55)] dark:hover:bg-sky-400",
        outline:
          "border border-zinc-300/90 bg-white/90 shadow-sm backdrop-blur-sm hover:bg-zinc-50 dark:border-zinc-600/80 dark:bg-zinc-950/60 dark:hover:bg-zinc-900/90",
        ghost: "hover:bg-zinc-100 dark:hover:bg-zinc-800/80",
        link: "text-sky-700 underline-offset-4 hover:text-sky-600 hover:underline dark:text-sky-400 dark:hover:text-sky-300",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
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
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
