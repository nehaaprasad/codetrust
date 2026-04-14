"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { SetupBanner } from "@/components/setup-banner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("block shrink-0 text-inherit", className)}
      aria-hidden
    >
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

/**
 * Wordmark icon: diff lanes (left) + verdict check (right) on a solid squircle.
 * Flat shapes only — reads clearly at 32px and avoids “AI gradient blob” look.
 */
function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="40" rx="11" fill="#1c1917" />
      <line x1="20.5" y1="9" x2="20.5" y2="31" stroke="#fafaf9" strokeOpacity="0.12" strokeWidth="1" />
      <path
        d="M10.5 14.5h6.5M10.5 19.5h10M10.5 24.5h7.5"
        fill="none"
        stroke="#fafaf9"
        strokeLinecap="round"
        strokeWidth="2"
        strokeOpacity="0.92"
      />
      <path
        d="M22.5 20.5l3 3.5 6.5-8"
        fill="none"
        stroke="#E06B45"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.25"
      />
    </svg>
  );
}

export function MarketingStickyHeader() {
  return (
    <div className="relative sticky top-0 z-30 flex flex-col overflow-hidden shadow-[0_6px_20px_-10px_rgba(90,70,55,0.12)]">
      {/* Same warm canvas as <main> so the gap above setup notices matches section backgrounds */}
      <div className="landing-bg pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <div className="landing-noise pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <div className="landing-vignette pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <header className="relative z-10 border-b border-stone-500/[0.12] bg-[#f4ece3]/88 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1320px] items-center justify-between px-5 sm:h-[3.75rem]">
          <Link href="/" className="group flex items-center gap-2.5">
            <BrandMark className="size-8 shrink-0 transition-transform duration-200 group-hover:scale-[1.03]" />
            <div className="flex flex-col leading-none">
              <span className="text-[14px] font-semibold tracking-[-0.03em] text-stone-900">AI Code Trust</span>
              <span className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.18em] text-stone-500">
                Release intelligence
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-2 sm:gap-2.5">
            <Button type="button" variant="landingNavSecondary" asChild className="[&_svg]:size-3.5">
              <Link href="/analyze">View Demo</Link>
            </Button>
            <Button type="button" variant="landingNavPrimary" onClick={() => signIn("github")}>
              <GitHubIcon className="size-3.5" />
              Sign in
            </Button>
          </div>
        </div>
      </header>
      <div className="relative z-[1]">
        <SetupBanner belowNav />
      </div>
    </div>
  );
}
