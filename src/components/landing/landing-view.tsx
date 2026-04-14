"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  ArrowRight,
  Braces,
  CheckCircle2,
  ChevronRight,
  Code2,
  Gauge,
  GitBranch,
  Layers,
  Lock,
  MessageSquare,
  Minus,
  Shield,
  Target,
  TestTube2,
  Zap,
} from "lucide-react";
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

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.07 2.07 0 01-2.062-2.065 2.063 2.063 0 114.125 0 2.07 2.07 0 01-2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const FOOTER_SOCIAL = {
  github: "https://github.com/nehaaprasad/codetrust",
  linkedin: "https://www.linkedin.com/in/neha-prasad-92499821b/",
  x: "https://x.com/nehaaaa_6",
} as const;

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2.5 font-mono text-[9px] font-medium uppercase tracking-[0.24em] text-stone-500">
      {children}
    </p>
  );
}

function DiffSnippet() {
  const lines = [
    { n: "24", sym: " " as const, text: "  return verifySession(ctx);" },
    { n: "25", sym: "+" as const, text: "  if (!ctx.token) {" },
    { n: "26", sym: "+" as const, text: '    throw new AuthError("missing");' },
    { n: "27", sym: "+" as const, text: "  }" },
    { n: "28", sym: "-" as const, text: "  // TODO: validate" },
  ];
  return (
    <div className="overflow-hidden rounded-md border border-zinc-800 bg-[#141414]">
      <div className="flex items-center justify-between border-b border-zinc-800/90 px-3 py-2">
        <span className="font-mono text-[11px] text-zinc-400">auth/session.ts</span>
        <span className="font-mono text-[11px] tabular-nums text-zinc-500">
          <span className="text-emerald-400/90">+8</span> <span className="text-rose-400/90">−2</span>
        </span>
      </div>
      <div className="p-3 font-mono text-[10px] leading-[1.7] text-zinc-300">
        {lines.map((line) => (
          <div key={line.n} className="flex gap-2">
            <span className="w-5 shrink-0 select-none text-right text-zinc-600">{line.n}</span>
            <span
              className={cn(
                "w-3 shrink-0 text-center",
                line.sym === "+" && "text-emerald-400/90",
                line.sym === "-" && "text-rose-400/90",
                line.sym === " " && "text-zinc-600",
              )}
            >
              {line.sym}
            </span>
            <span
              className={cn(
                "min-w-0 flex-1",
                line.sym === "+" && "bg-emerald-500/[0.12] text-zinc-200",
                line.sym === "-" && "bg-rose-500/[0.12] text-zinc-200",
                line.sym === " " && "text-zinc-500",
              )}
            >
              {line.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroProductPanel() {
  const findings = [
    { sev: "high" as const, title: "SQL path in user input", file: "api/users.ts" },
    { sev: "med" as const, title: "Missing branch coverage", file: "auth/login.test.ts" },
    { sev: "low" as const, title: "N+1 query pattern", file: "db/queries.ts" },
  ];

  return (
    <div className="mx-auto w-full max-w-[440px] lg:mx-0 lg:max-w-none">
      <div
        className={cn(
          "overflow-hidden rounded-xl border border-stone-200/90 bg-white",
          "shadow-[0_12px_40px_-16px_rgba(28,25,23,0.12),0_2px_6px_-1px_rgba(28,25,23,0.05)]",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/80 bg-white px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <GitBranch className="size-4 shrink-0 text-stone-400" aria-hidden />
            <span className="truncate text-sm font-medium text-stone-950">acme/web</span>
            <span className="shrink-0 text-sm font-medium text-blue-700">#142</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-stone-600">Verdict</span>
            <span className="font-medium text-emerald-800">Safe</span>
          </div>
        </div>

        <div className="grid gap-6 bg-white p-4 sm:p-5 lg:grid-cols-[minmax(0,7.5rem)_1fr] lg:items-start lg:gap-8">
          <div>
            <div className="flex items-baseline gap-1 text-stone-950">
              <span className="text-[2.75rem] font-semibold leading-none tracking-tight tabular-nums">87</span>
              <span className="text-sm text-stone-600">/100</span>
            </div>
            <p className="mt-1 text-xs font-medium text-stone-600">Trust score</p>
            <div className="mt-3 h-1.5 w-full max-w-[9rem] rounded-full bg-stone-200/90">
              <div className="h-full w-[87%] rounded-full bg-stone-800" />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-stone-600">Findings</p>
            <div className="divide-y divide-stone-200/70 overflow-hidden rounded-lg border border-stone-200/90 bg-white">
              {findings.map((row) => (
                <div key={row.title} className="px-3 py-2.5">
                  <p className="text-[13px] leading-snug text-stone-900">
                    <span
                      className={cn(
                        "mr-2 font-medium",
                        row.sev === "high" && "text-rose-700",
                        row.sev === "med" && "text-amber-800",
                        row.sev === "low" && "text-stone-500",
                      )}
                    >
                      {row.sev === "high" ? "High" : row.sev === "med" ? "Med" : "Low"}
                    </span>
                    {row.title}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-stone-600">{row.file}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-stone-200/80 bg-white px-4 py-3.5 sm:px-5">
          <p className="mb-2 text-xs font-medium text-stone-600">Diff</p>
          <DiffSnippet />
        </div>
      </div>
    </div>
  );
}

/** Fake thread snippets for the “Noise” card — messy, unbounded feedback (not missing UI). */
const differentiationNoiseLines = [
  "LGTM — skimmed on mobile, didn’t walk every path.",
  "nit: rename · also see design thread from Tuesday…",
  "Can we defer? Tagging @infra for overlap with #882.",
  "Same comment as last sprint — parking for later.",
  "Any blocker or just merge?",
];

const dimensions = [
  { name: "Security", hint: "Secrets, injection, auth boundaries", icon: Lock },
  { name: "Logic", hint: "Control flow, edge cases, failure modes", icon: Braces },
  { name: "Performance", hint: "Hot paths, N+1, unnecessary work", icon: Zap },
  { name: "Testing", hint: "How well the change is covered", icon: TestTube2 },
  { name: "Accessibility", hint: "Semantics, keyboard, critical UI paths", icon: Layers },
  { name: "Maintainability", hint: "Clarity, coupling, change cost", icon: Code2 },
];

type Step = {
  n: string;
  title: string;
  body: string;
  items: string[];
};

const steps: Step[] = [
  {
    n: "01",
    title: "Paste code or connect a repo",
    body: "Start from a snippet or wire GitHub so analysis always targets the change you’re shipping—not a random slice of the tree.",
    items: ["Paste a diff, files, or a focused snippet", "Connect GitHub and pick a PR or branch", "Keep scope limited to what merges"],
  },
  {
    n: "02",
    title: "Analyze the change",
    body: "We treat the diff as the unit of review: paths, hunks, and touched surfaces—so findings map to what you actually changed.",
    items: ["Diff-first parsing (not whole-repo noise)", "Surfaces security, logic, perf, tests, a11y, maintainability"],
  },
  {
    n: "03",
    title: "Score the risk",
    body: "Signals roll into one trust score you can compare across PRs and teams—same bar, same language.",
    items: ["Weighted dimensions tuned for merge risk", "Comparable scores across repositories"],
  },
  {
    n: "04",
    title: "Get the verdict",
    body: "One shipping line: Safe, Risky, or Block—aligned with how release managers think, not a thread of opinions.",
    items: ["Policy-friendly outcomes", "Clear gate for merge or hold"],
  },
  {
    n: "05",
    title: "Fix and re-run",
    body: "Patch what matters, push again, and re-run until the score matches the bar your org actually enforces.",
    items: ["Same change set, new result in one click", "Iterate without resetting context"],
  },
];

function StepBullets({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("mt-4 space-y-2 border-l border-amber-900/15 pl-3.5", className)}>
      {items.map((line) => (
        <li key={line} className="text-[13px] leading-snug text-stone-600">
          {line}
        </li>
      ))}
    </ul>
  );
}

export function LandingView() {
  return (
    <div className="landing-root relative isolate flex min-h-0 w-full flex-1 flex-col text-stone-800 [overflow-x:clip]">
      {/* Backgrounds are absolute (not fixed) so they stay within this page shell. */}
      <div className="landing-bg pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <div className="landing-noise pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <div className="landing-vignette pointer-events-none absolute inset-0 -z-10" aria-hidden />

      <main>
        {/* Hero — editorial stacks + floating product (not a generic 2-col card page) */}
        <section className="landing-hero-pattern relative">
          <div className="relative z-[1] mx-auto max-w-[1200px] px-5 pb-10 pt-6 sm:pb-14 sm:pt-8 lg:pb-14">
            <div className="grid items-start gap-8 lg:min-h-0 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:items-center lg:gap-6 xl:gap-10">
              <div className="flex max-w-xl flex-col justify-center lg:max-w-[min(100%,42rem)] lg:pr-1">
                <SectionEyebrow>AI Code Trust</SectionEyebrow>
                <h1
                  className="text-balance font-light leading-[1.08] tracking-[-0.02em] antialiased [font-family:var(--font-hero-serif),ui-serif,Georgia,serif]"
                  style={{ fontFeatureSettings: '"liga" 1, "kern" 1' }}
                >
                  <span className="block text-[clamp(2rem,5vw,3.5rem)] text-neutral-950">
                    Ship with a verdict,
                  </span>
                  <span className="mt-1 block text-[clamp(2rem,5vw,3.5rem)] text-[#E06B45]">
                    not a guess.
                  </span>
                </h1>
                <p className="mt-5 max-w-lg text-pretty text-[14.5px] leading-[1.65] text-stone-600">
                  AI Code Trust analyzes code before merge and returns a trust score plus a clear
                  verdict — <span className="font-medium text-stone-800">Safe</span>,{" "}
                  <span className="font-medium text-stone-800">Risky</span>, or{" "}
                  <span className="font-medium text-stone-800">Block</span> — across security, logic, performance,
                  testing, accessibility, and maintainability.
                </p>
                <div className="mt-7 flex max-w-full flex-row flex-nowrap items-center gap-2 overflow-x-auto sm:gap-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <Button
                    type="button"
                    variant="landingPrimary"
                    className="shrink-0 [&_svg]:size-3.5 shadow-sm !px-4 sm:!px-7"
                    onClick={() => signIn("github")}
                  >
                    <GitHubIcon />
                    Connect GitHub
                  </Button>
                  <Button
                    type="button"
                    variant="landingSecondary"
                    asChild
                    className="shrink-0 !px-4 shadow-sm sm:!px-5"
                  >
                    <Link href="/analyze" className="inline-flex items-center gap-1.5">
                      View Demo
                      <ChevronRight className="size-3.5 opacity-[0.82]" aria-hidden />
                    </Link>
                  </Button>
                </div>
                <p className="mt-5 max-w-md text-[13px] leading-relaxed text-stone-500">
                  Prefer to paste code first?{" "}
                  <Link
                    href="/analyze"
                    className="font-medium text-amber-900/90 underline decoration-amber-900/20 underline-offset-[3px] hover:text-amber-950"
                  >
                    Continue without signing in
                  </Link>
                </p>
              </div>
              <div className="relative lg:pl-2">
                <HeroProductPanel />
              </div>
            </div>
          </div>
        </section>

        {/* Span-style credibility strip — typography only until you add logos */}
        <section className="border-y border-amber-900/10 bg-white/35 py-4">
          <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-center gap-x-7 gap-y-2 px-5 font-mono text-[10px] uppercase tracking-[0.18em] text-stone-600">
            <span className="text-stone-500">GitHub-native</span>
            <Minus className="hidden size-2.5 text-stone-400 sm:inline" />
            <span>Diff-first analysis</span>
            <Minus className="hidden size-2.5 text-stone-400 sm:inline" />
            <span>PR & paste</span>
            <Minus className="hidden size-2.5 text-stone-400 sm:inline" />
            <span>API-ready</span>
          </div>
        </section>

        {/* Problem — editorial statement, not a card grid */}
        <section className="landing-band-subtle py-14 sm:py-16">
          <div className="relative z-[1] mx-auto max-w-[880px] px-5">
            <SectionEyebrow>Problem</SectionEyebrow>
            <p className="text-balance text-[clamp(1.35rem,2.6vw,1.85rem)] font-light leading-[1.28] tracking-[-0.03em] text-stone-800">
              AI writes code faster than most teams can review. Comments splinter across tools — and
              “LGTM” is still not a risk assessment.
            </p>
            <div className="mt-8 grid gap-6 border-l border-amber-900/20 pl-6 sm:pl-8">
              <p className="text-[15px] leading-relaxed text-stone-600">
                You need{" "}
                <span className="font-medium text-stone-900">one clear shipping decision before merge</span>,
                not another noisy thread.
              </p>
              <ul className="space-y-2.5 text-[13.5px] leading-relaxed text-stone-600">
                {[
                  "Review fragments across PRs, chat, and docs",
                  "Risk hides in logic, security, and edge cases",
                  "Teams need a single signal: safe to ship — or not",
                ].map((t) => (
                  <li key={t} className="flex gap-2.5">
                    <Target className="mt-0.5 size-3.5 shrink-0 text-amber-800/70" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* LLM vs general chat — pipeline verdict, not open conversation */}
        <section className="landing-band-how py-14 sm:py-16">
          <div className="relative z-[1] mx-auto max-w-[1100px] px-5">
            <div className="mx-auto max-w-3xl text-center lg:mx-0 lg:max-w-[48rem] lg:text-left">
              <SectionEyebrow>How the LLM fits in</SectionEyebrow>
              <h2
                className="text-balance text-[clamp(1.5rem,2.85vw,2.15rem)] font-light leading-[1.14] tracking-[-0.02em] text-stone-900 antialiased [font-family:var(--font-hero-serif),ui-serif,Georgia,serif]"
                style={{ fontFeatureSettings: '"liga" 1, "kern" 1' }}
              >
                A model inside a merge pipeline — not a chat window.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-pretty text-[15px] leading-relaxed text-stone-600 lg:mx-0">
                ChatGPT and Claude are general assistants: open-ended answers, session by session. AI Code Trust uses the same{" "}
                <span className="font-medium text-stone-800">kind</span> of model as{" "}
                <span className="font-medium text-stone-800">one layer</span> in a fixed pipeline — after deterministic checks,
                structured review, then a single <span className="font-medium text-stone-800">trust score</span> and{" "}
                <span className="font-medium text-stone-800">Safe, Risky, or Block</span> on the change you ship.
              </p>
            </div>

            <div className="mt-10 grid items-stretch gap-6 lg:grid-cols-2 lg:gap-8">
              <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200/95 bg-gradient-to-b from-white/95 to-stone-100/45 p-6 shadow-[0_16px_44px_-26px_rgba(35,28,22,0.14),0_2px_8px_-4px_rgba(35,28,22,0.06)] ring-1 ring-stone-900/[0.035] backdrop-blur-[2px] sm:p-7">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-stone-400/35 to-transparent"
                  aria-hidden
                />
                <div className="pointer-events-none absolute inset-x-6 top-3.5 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-90" aria-hidden />
                <div className="flex gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-stone-50 to-stone-100/80 ring-1 ring-stone-200/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)]">
                    <MessageSquare className="size-[1.35rem] text-stone-500" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-stone-500">
                      Typical chat tools
                    </p>
                    <p className="mt-2 text-[13.5px] leading-snug text-stone-600">
                      Great for questions and drafts —{" "}
                      <span className="text-stone-700">not a release gate.</span>
                    </p>
                  </div>
                </div>
                <ul className="mt-6 space-y-3 border-t border-stone-200/70 pt-6 text-[13.5px] leading-relaxed text-stone-600">
                  {[
                    "Back-and-forth dialogue; answers shift with how you prompt",
                    "No rolled-up trust score or merge verdict for a specific diff",
                    "You copy context in each time; no PR-native loop by default",
                    "Hard to standardize “ship / don’t ship” across the team",
                  ].map((t) => (
                    <li key={t} className="flex gap-2.5">
                      <span
                        className="mt-2 size-1.5 shrink-0 rounded-full bg-stone-400/85 ring-2 ring-stone-300/40"
                        aria-hidden
                      />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-amber-900/20 bg-gradient-to-br from-white via-amber-50/40 to-[#f0e4d8]/90 p-6 shadow-[0_20px_52px_-24px_rgba(120,80,50,0.22),0_4px_14px_-6px_rgba(90,70,55,0.1)] ring-1 ring-amber-900/[0.08] sm:p-7">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-700/25 to-transparent"
                  aria-hidden
                />
                <div className="pointer-events-none absolute inset-x-4 top-3 h-[3.5rem] rounded-full bg-[radial-gradient(ellipse_80%_100%_at_50%_0%,rgba(214,176,120,0.12),transparent_72%)]" aria-hidden />
                <div className="relative flex gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-amber-50/95 to-stone-100/90 ring-1 ring-amber-900/12 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.85)]">
                    <Gauge className="size-[1.35rem] text-amber-900/85" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-amber-900/88">
                      What this product adds
                    </p>
                    <p className="mt-2 text-[13.5px] leading-snug text-stone-700">
                      Rules + optional model pass → scored issues →{" "}
                      <span className="font-medium text-stone-900">one verdict per run.</span>
                    </p>
                  </div>
                </div>
                <ul className="relative mt-6 space-y-3 border-t border-amber-900/12 pt-6 text-[13.5px] leading-relaxed text-stone-700">
                  {[
                    "Deterministic checks run first; the LLM adds structured findings that rules can miss",
                    "Output feeds dimensions and a weighted trust score — not a thread to negotiate",
                    "Scoped to the change (paste, PR, branch) with GitHub wiring when you connect",
                    "Re-run the same change and compare scores as fixes land",
                  ].map((t) => (
                    <li key={t} className="flex gap-2.5">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-amber-800/80" aria-hidden />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* How it works — bento (asymmetric; breaks “5 equal cards”) */}
        <section className="landing-band-how py-14 sm:py-16">
          <div className="relative z-[1] mx-auto max-w-[1320px] px-5">
            <div className="max-w-3xl">
              <SectionEyebrow>How it works</SectionEyebrow>
              <h2
                className="text-balance text-[clamp(1.65rem,3.2vw,2.65rem)] font-light leading-[1.18] tracking-[-0.02em] text-stone-900 antialiased [font-family:var(--font-hero-serif),ui-serif,Georgia,serif]"
                style={{ fontFeatureSettings: '"liga" 1, "kern" 1' }}
              >
                <span className="block">From change to verdict</span>
                <span className="mt-1 block text-[0.88em] italic text-stone-700/95">— then back again.</span>
              </h2>
              <p className="mt-5 max-w-2xl text-pretty text-[15px] leading-relaxed text-stone-600">
                Five steps: capture the change, judge it with one score and a verdict, then loop until it clears your bar—without
                losing the thread of what you&apos;re actually shipping.
              </p>
            </div>

            <div className="mt-10 grid gap-2.5 sm:gap-3 lg:grid-cols-12">
              <div className="flex flex-col rounded-2xl border border-stone-300/70 bg-white/55 p-5 shadow-sm backdrop-blur-sm lg:col-span-7">
                <span className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-amber-900/85">
                  {steps[0].n}
                </span>
                <h3 className="mt-2.5 text-[17px] font-semibold tracking-[-0.025em] text-stone-900">{steps[0].title}</h3>
                <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-stone-600">{steps[0].body}</p>
                <StepBullets items={steps[0].items} className="mt-1 max-w-xl" />
              </div>

              <div className="flex flex-col rounded-2xl border border-stone-300/70 bg-white/45 p-5 shadow-sm backdrop-blur-sm lg:col-span-5">
                <span className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-amber-900/85">
                  {steps[1].n}
                </span>
                <h3 className="mt-2.5 text-[16px] font-semibold tracking-[-0.02em] text-stone-900">{steps[1].title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-stone-600">{steps[1].body}</p>
                <StepBullets items={steps[1].items} />
              </div>

              {steps.slice(2).map((s) => (
                <div
                  key={s.n}
                  className="flex flex-col rounded-2xl border border-stone-300/60 bg-white/40 p-5 shadow-sm backdrop-blur-sm lg:col-span-4"
                >
                  <span className="font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-stone-600">{s.n}</span>
                  <h3 className="mt-2 text-[14.5px] font-semibold tracking-[-0.02em] text-stone-900">{s.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-stone-600">{s.body}</p>
                  <StepBullets items={s.items} className="mt-1" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust dimensions — timeline + outcome (tight pair; avoids ultra-wide 1fr gap) */}
        <section className="landing-band-trust py-14 sm:py-16">
          <div className="relative z-[1] mx-auto max-w-[1320px] px-5">
            <div className="mx-auto max-w-3xl text-center">
              <SectionEyebrow>Trust score</SectionEyebrow>
              <h2
                className="text-balance text-[clamp(1.9rem,3.4vw,2.85rem)] font-light leading-[1.14] tracking-[-0.02em] text-stone-900 antialiased [font-family:var(--font-hero-serif),ui-serif,Georgia,serif]"
                style={{ fontFeatureSettings: '"liga" 1, "kern" 1' }}
              >
                <span className="block">Multiple signals.</span>
                <span className="mt-1.5 block text-[0.95em] text-stone-800">One release decision.</span>
              </h2>
              <p className="mt-6 text-[17px] leading-[1.65] text-stone-600">
                Six dimensions roll into a single score — so “ready to merge” means the same thing in frontend,
                full-stack, and AI-assisted workflows.
              </p>
            </div>

            <div className="mx-auto mt-10 flex w-full max-w-[52rem] flex-col items-center gap-8 lg:mt-12 lg:flex-row lg:items-start lg:justify-center lg:gap-7 xl:max-w-[56rem] xl:gap-8">
              <div className="min-w-0 w-full max-w-xl text-left lg:max-w-[26rem]">
                <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.14em] text-stone-500">
                  What we measure
                </p>
                <ul className="relative space-y-0 border-l border-stone-300/90 pl-6">
                  {dimensions.map((d, i) => (
                    <li key={d.name} className="relative pb-5 last:pb-0">
                      <span className="absolute -left-6 top-1 flex size-3.5 -translate-x-1/2 items-center justify-center rounded-full border border-stone-300 bg-[#f3e9de] font-mono text-[8px] text-stone-600">
                        {i + 1}
                      </span>
                      <div className="flex gap-3">
                        <d.icon className="mt-0.5 size-4 shrink-0 text-stone-500" />
                        <div>
                          <h3 className="text-[15px] font-medium text-stone-900">{d.name}</h3>
                          <p className="mt-0.5 text-[14px] leading-snug text-stone-600">{d.hint}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="relative flex min-w-0 w-full max-w-md flex-col border-t border-stone-200/80 pt-8 text-left lg:max-w-[18.5rem] lg:flex-none lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0 xl:max-w-[19.5rem] xl:pl-7">
                <div className="mb-2 flex items-center gap-2 lg:-ml-0">
                  <ArrowRight className="size-[1.125rem] shrink-0 text-amber-900/55" aria-hidden />
                  <span className="text-[13px] font-medium text-stone-600">Rolls up here</span>
                </div>
                <aside className="lg:sticky lg:top-28">
                  <div className="rounded-2xl border border-stone-300/80 bg-white p-6 shadow-[0_8px_30px_-18px_rgba(28,25,23,0.12)]">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">Outcome</p>
                    <p className="mt-3 text-[14px] leading-snug text-stone-600">
                      Every signal on the left feeds the same score and a single merge verdict—nothing drifts into a
                      side conversation.
                    </p>
                    <div className="mt-5 space-y-3">
                      <div className="flex items-center justify-between border-b border-stone-200/90 pb-2.5">
                        <span className="text-[14px] text-stone-600">Verdict</span>
                        <span className="text-[14px] font-semibold text-emerald-800">Safe</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-stone-200/90 pb-2.5">
                        <span className="text-[14px] text-stone-600">Trust score</span>
                        <span className="font-mono text-2xl font-semibold tabular-nums text-stone-900">87</span>
                      </div>
                      <p className="text-[13px] leading-relaxed text-stone-500">
                        Outcomes: <span className="font-medium text-emerald-700">Safe</span>
                        <span className="text-stone-400"> · </span>
                        <span className="font-medium text-amber-800">Risky</span>
                        <span className="text-stone-400"> · </span>
                        <span className="font-medium text-rose-800">Block</span>
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </section>

        {/* Differentiation — contrast panel */}
        <section className="landing-band-subtle landing-band-pattern-strong py-14 sm:py-16">
          <div className="relative z-[1] mx-auto max-w-[1320px] px-5">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center xl:gap-14">
              <div>
                <SectionEyebrow>Differentiation</SectionEyebrow>
                <h2 className="text-balance text-[clamp(1.45rem,2.5vw,2.1rem)] font-semibold leading-[1.1] tracking-[-0.035em] text-stone-900">
                  Not another generic AI reviewer.
                </h2>
                <p className="mt-5 text-[15px] leading-relaxed text-stone-600">
                  Suggestions are easy to generate. <span className="font-medium text-stone-800">Release readiness</span> is
                  what actually blocks a merge — AI Code Trust gives a{" "}
                  <span className="font-semibold text-stone-900">final verdict</span> on the diff you&apos;re about to ship.
                </p>
                <ul className="mt-6 space-y-2.5 text-[13.5px] text-stone-600">
                  {[
                    "Built for merge decisions, not open-ended chat",
                    "Safe / Risky / Block matches how teams ship",
                    "Re-run until the score matches your bar",
                  ].map((t) => (
                    <li key={t} className="flex gap-2.5">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-amber-800/75" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative space-y-3">
                <div className="rounded-2xl border border-stone-300/60 bg-stone-900/[0.04] p-5 opacity-80">
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-stone-500">Noise</p>
                  <div className="mt-3 space-y-2 border-l border-stone-300/80 pl-3">
                    {differentiationNoiseLines.map((line) => (
                      <p key={line} className="text-[11px] leading-snug text-stone-600/95">
                        {line}
                      </p>
                    ))}
                  </div>
                  <p className="mt-3 border-t border-stone-300/50 pt-2.5 text-[11px] text-stone-500">
                    Unbounded comments · unclear bar
                  </p>
                </div>
                <div className="relative overflow-hidden rounded-2xl border border-amber-900/15 bg-gradient-to-br from-amber-100/40 via-white/50 to-stone-100/60 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-amber-900/90">Verdict</span>
                    <Gauge className="size-4 text-amber-900/80" />
                  </div>
                  <p className="mt-4 font-mono text-3xl font-semibold tracking-[0.1em] text-stone-900">SAFE</p>
                  <p className="mt-1.5 text-[13px] text-stone-600">Trust score 87 · policy-aligned</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Integrations — mesh background + lifted cards */}
        <section className="landing-band-integrations py-20 sm:py-24">
          <div className="relative z-[1] mx-auto max-w-[1180px] px-5">
            <div className="mx-auto max-w-2xl text-center">
              <SectionEyebrow>Integrations</SectionEyebrow>
              <div
                className="mx-auto mt-3 h-px w-12 bg-gradient-to-r from-transparent via-amber-800/25 to-transparent"
                aria-hidden
              />
              <h2
                className="mt-5 text-balance text-[clamp(1.7rem,3.1vw,2.45rem)] font-light leading-[1.12] tracking-[-0.02em] text-stone-900 antialiased [font-family:var(--font-hero-serif),ui-serif,Georgia,serif]"
                style={{ fontFeatureSettings: '"liga" 1, "kern" 1' }}
              >
                Fits your GitHub workflow.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-pretty text-[15px] leading-[1.7] text-stone-600">
                OAuth once, then stay on the PR — trust runs on the diff, not your whole repo map.
              </p>
            </div>
            <div className="mt-14 grid gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-7">
              {(
                [
                  { icon: GitHubIcon, title: "GitHub", desc: "OAuth and repos your team already uses." },
                  { icon: GitBranch, title: "PR flow", desc: "Analyze the PR you’re about to merge." },
                  { icon: Code2, title: "Diff analysis", desc: "Scores the change — not random files." },
                  { icon: MessageSquare, title: "Optional comments", desc: "Post verdicts where reviewers look." },
                ] as const
              ).map((item, i) => (
                <div
                  key={item.title}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-6 shadow-[0_12px_40px_-22px_rgba(35,28,22,0.12),0_2px_10px_-4px_rgba(35,28,22,0.05)] ring-1 ring-stone-900/[0.03] transition-[box-shadow,border-color,transform] duration-300 hover:-translate-y-1 hover:border-stone-300/95 hover:shadow-[0_20px_48px_-24px_rgba(35,28,22,0.18),0_4px_14px_-6px_rgba(35,28,22,0.07)]"
                >
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-90"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-amber-900/12 to-transparent"
                    aria-hidden
                  />
                  <span className="absolute right-4 top-3.5 font-mono text-[10px] font-medium tabular-nums tracking-wider text-stone-400">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-b from-stone-50 to-stone-100/90 ring-1 ring-stone-200/80 transition-[background,box-shadow] duration-300 group-hover:from-amber-50/90 group-hover:to-stone-50 group-hover:ring-amber-900/10">
                    <item.icon className="size-[1.4rem] text-stone-700 transition-colors duration-300 group-hover:text-stone-900" />
                  </div>
                  <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-stone-900">{item.title}</h3>
                  <p className="mt-2.5 flex-1 text-[13.5px] leading-[1.62] text-stone-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Before / After — type-forward */}
        <section className="landing-band-proof py-10 sm:py-12">
          <div className="relative z-[1] mx-auto max-w-[880px] px-5 text-center">
            <SectionEyebrow>Proof</SectionEyebrow>
            <h2 className="text-balance text-[clamp(1.45rem,2.5vw,2.1rem)] font-semibold tracking-[-0.035em] text-stone-900">
              Score up. Verdict follows.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[15px] text-stone-600">
              Fix what matters, re-run the same change, watch trust move.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-12 md:gap-14">
              <div className="text-center">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-stone-500">First run</p>
                <p className="mt-2 font-mono text-[clamp(3rem,8vw,5rem)] font-semibold leading-none tabular-nums tracking-tight text-stone-400">
                  62
                </p>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-amber-800">Risky</p>
              </div>
              <ArrowRight className="hidden size-6 text-stone-400 sm:block" aria-hidden />
              <div className="text-center">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-stone-500">After fixes</p>
                <p className="mt-2 font-mono text-[clamp(3rem,8vw,5rem)] font-semibold leading-none tabular-nums tracking-tight text-stone-900">
                  89
                </p>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-emerald-800">Safe</p>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA — single focal column */}
        <section className="landing-band-final-cta">
          <div className="relative z-[1] mx-auto max-w-[min(100%,42rem)] px-6 text-center sm:px-8">
            <p className="mb-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.2em] text-stone-500 sm:text-[11px]">
              Get started
            </p>
            <h2
              className="text-balance text-pretty text-[clamp(1.75rem,3.15vw,2.55rem)] font-light leading-[1.1] tracking-[-0.02em] antialiased [font-family:var(--font-hero-serif),ui-serif,Georgia,serif]"
              style={{ fontFeatureSettings: '"liga" 1, "kern" 1' }}
            >
              <span className="text-stone-900">Merge when the verdict says </span>
              <span className="text-[#9a3412]">you can.</span>
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-stone-600 sm:text-[16px]">
              One trust score. Safe, Risky, or Block — for teams that ship for real.
            </p>
            <p className="mt-3 text-[13.5px] leading-relaxed text-stone-500 sm:text-[14px]">
              GitHub sign-in · Private repos · Same score on every PR and in CI
            </p>
            <Button
              type="button"
              variant="landingPrimary"
              className="mt-7 !h-12 !min-h-12 !px-12 !text-[15px] !shadow-none hover:!shadow-[0_2px_8px_-2px_rgba(28,25,23,0.2)] sm:!text-[16px]"
              onClick={() => signIn("github")}
            >
              <GitHubIcon />
              Connect GitHub
            </Button>
            <p className="mt-6 font-mono text-[12px] text-stone-500 sm:text-[12.5px]">
              After sign-in — Analyze · Connect · Dashboard
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.08] bg-[#1c1d21] py-7 text-[13px]">
        <div className="mx-auto flex max-w-[1320px] flex-col items-center justify-between gap-5 px-5 sm:flex-row sm:gap-4">
          <span className="flex items-center gap-2 font-medium tracking-[-0.02em] text-stone-200">
            <Shield className="size-4 text-stone-400" aria-hidden />
            AI Code Trust
          </span>
          <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-6">
            <span className="font-mono text-[11px] tabular-nums text-stone-500">
              © {new Date().getFullYear()}
            </span>
            <span className="hidden text-stone-600 sm:inline" aria-hidden>
              |
            </span>
            <nav className="flex items-center gap-1" aria-label="Social links">
              <a
                href={FOOTER_SOCIAL.github}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md p-2 text-stone-400 transition-colors hover:bg-white/[0.08] hover:text-stone-100"
                aria-label="GitHub"
              >
                <GitHubIcon className="size-[18px]" />
              </a>
              <a
                href={FOOTER_SOCIAL.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md p-2 text-stone-400 transition-colors hover:bg-white/[0.08] hover:text-stone-100"
                aria-label="LinkedIn"
              >
                <LinkedInIcon className="size-[18px]" />
              </a>
              <a
                href={FOOTER_SOCIAL.x}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md p-2 text-stone-400 transition-colors hover:bg-white/[0.08] hover:text-stone-100"
                aria-label="X (Twitter)"
              >
                <XIcon className="size-[18px]" />
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
