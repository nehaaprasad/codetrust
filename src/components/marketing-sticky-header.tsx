"use client";

import Link from "next/link";
import { useId } from "react";
import { signIn } from "next-auth/react";
import { SetupBanner } from "@/components/setup-banner";
import { Button } from "@/components/ui/button";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

/** Custom mark: stacked “code lanes” + verdict tick — distinct from a generic shield icon. */
function BrandMark({ className }: { className?: string }) {
  const gid = useId();
  const gradId = `brand-${gid.replace(/:/g, "")}`;

  return (
    <svg
      viewBox="0 0 36 36"
      className={className}
      aria-hidden
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradId} x1="8" y1="6" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#57534e" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="30" height="30" rx="9" fill={`url(#${gradId})`} opacity="0.12" />
      <rect x="3.5" y="3.5" width="29" height="29" rx="8.5" stroke={`url(#${gradId})`} strokeWidth="1" opacity="0.55" />
      <path
        d="M11 14h6M11 18h10M11 22h7"
        stroke="#44403c"
        strokeWidth="1.75"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M24.5 17.5l-3 3-2-2"
        stroke="#b45309"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="26" cy="12" r="2" fill="#b45309" opacity="0.9" />
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
          <Link href="/" className="group flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-white/90 to-stone-200/80 shadow-[0_1px_0_0_rgba(255,255,255,0.85),inset_0_1px_2px_rgba(28,25,23,0.06)] ring-1 ring-stone-400/25 transition-shadow group-hover:shadow-md group-hover:ring-stone-400/35">
              <BrandMark className="size-[1.65rem]" />
            </span>
            <div className="flex flex-col leading-none">
              <span className="text-[14px] font-semibold tracking-[-0.03em] text-stone-900">AI Code Trust</span>
              <span className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.18em] text-stone-500">
                Release intelligence
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-[13px] font-medium text-stone-700 hover:bg-transparent hover:text-stone-900"
              asChild
            >
              <Link href="/analyze">View Demo</Link>
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-full border border-stone-300/90 bg-stone-900 px-3.5 text-[13px] text-white shadow-sm hover:bg-stone-800"
              onClick={() => signIn("github")}
            >
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
