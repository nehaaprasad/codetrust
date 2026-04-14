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
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

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
    <div className="overflow-hidden rounded-xl border border-stone-200/90 bg-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)]">
      <div className="flex items-center justify-between border-b border-stone-200/80 bg-stone-50/90 px-3 py-2">
        <span className="font-mono text-[10px] font-medium text-stone-600">auth/session.ts</span>
        <span className="font-mono text-[10px] tabular-nums text-stone-500">
          <span className="font-semibold text-emerald-700">+8</span>{" "}
          <span className="font-semibold text-rose-700">−2</span>
        </span>
      </div>
      <div className="bg-stone-50/50 p-3 font-mono text-[10px] leading-[1.65]">
        {lines.map((line) => (
          <div
            key={line.n}
            className={cn(
              "flex gap-2 rounded-sm",
              line.sym === "+" && "bg-emerald-100/60",
              line.sym === "-" && "bg-rose-100/55",
              line.sym === " " && "bg-transparent",
            )}
          >
            <span className="w-5 shrink-0 select-none text-right text-stone-400">{line.n}</span>
            <span
              className={cn(
                "w-3 shrink-0 text-center font-semibold",
                line.sym === "+" && "text-emerald-700",
                line.sym === "-" && "text-rose-700",
                line.sym === " " && "text-stone-400",
              )}
            >
              {line.sym}
            </span>
            <span
              className={cn(
                "min-w-0 flex-1",
                line.sym === "+" && "text-emerald-950",
                line.sym === "-" && "text-rose-950",
                line.sym === " " && "text-stone-600",
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
  return (
    <div className="mx-auto w-full max-w-[480px] lg:mx-0 lg:max-w-none">
      <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-7">
            <div className="flex items-start gap-6">
              {/* Trust Score Circle */}
              <div className="relative flex-shrink-0">
                <svg width={140} height={140} className="transform -rotate-90">
                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>
                  <circle cx={70} cy={70} r={62} strokeWidth={8} className="fill-none stroke-stone-100" />
                  <circle
                    cx={70}
                    cy={70}
                    r={62}
                    strokeWidth={8}
                    fill="none"
                    stroke="url(#scoreGradient)"
                    strokeDasharray={`${(87 / 100) * 389.56} 389.56`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[72px] font-semibold leading-none tabular-nums tracking-tight text-gray-900">
                    87
                  </span>
                  <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-gray-500">
                    Trust Score
                  </span>
                  <span className="mt-0.5 font-mono text-[9px] text-gray-400">
                    out of 100
                  </span>
                </div>
              </div>

              {/* Verdict Badge */}
              <div className="mt-3 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Safe
                </span>
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-stone-500">
                Top issues
              </p>
              <ul className="space-y-2">
                {[
                  { sev: "high", title: "SQL path in user input", file: "api/users.ts" },
                  { sev: "med", title: "Missing branch coverage", file: "auth/login.test.ts" },
                  { sev: "low", title: "N+1 query pattern", file: "db/queries.ts" },
                ].map((row) => (
                  <li
                    key={row.title}
                    className="flex items-start gap-3 rounded-lg border border-stone-100 bg-stone-50/80 px-2.5 py-2 last:mb-0"
                  >
                    <span
                      className={cn(
                        "mt-0.5 shrink-0 rounded px-1 font-mono text-[9px] font-bold uppercase",
                        row.sev === "high" && "bg-rose-100 text-rose-800",
                        row.sev === "med" && "bg-amber-100 text-amber-900",
                        row.sev === "low" && "bg-stone-200/80 text-stone-600",
                      )}
                    >
                      {row.sev}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-stone-900">{row.title}</p>
                      <p className="font-mono text-[11px] text-stone-500">{row.file}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-5 border-t border-stone-200/90 pt-5">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-stone-500">
              Diff
            </p>
            <DiffSnippet />
          </div>
        </div>
      </div>
    </div>
  );
}

const dimensions = [
  { name: "Security", hint: "Secrets, injection, auth boundaries", icon: Lock },
  { name: "Logic", hint: "Control flow, edge cases, failure modes", icon: Braces },
  { name: "Performance", hint: "Hot paths, N+1, unnecessary work", icon: Zap },
  { name: "Testing", hint: "How well the change is covered", icon: TestTube2 },
  { name: "Accessibility", hint: "Semantics, keyboard, critical UI paths", icon: Layers },
  { name: "Maintainability", hint: "Clarity, coupling, change cost", icon: Code2 },
];

const steps = [
  { n: "01", title: "Paste code or connect a repo", body: "Snippet or GitHub — you pick where the change lives." },
  { n: "02", title: "Analyze the change", body: "Diff-first: what you’re shipping, not the whole tree." },
  { n: "03", title: "Score the risk", body: "Dimensions roll into one trust score." },
  { n: "04", title: "Get the verdict", body: "Safe, Risky, or Block — one line for release." },
  { n: "05", title: "Fix and re-run", body: "Iterate until the score matches your bar." },
];

export function LandingView() {
  return (
    <div className="landing-root relative isolate flex min-h-0 w-full flex-1 flex-col text-stone-800 [overflow-x:clip]">
      {/* Backgrounds are absolute (not fixed) so they stay within this page shell. */}
      <div className="landing-bg pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <div className="landing-noise pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <div className="landing-vignette pointer-events-none absolute inset-0 -z-10" aria-hidden />

      <main>
        {/* Hero — editorial stacks + floating product (not a generic 2-col card page) */}
        <section className="relative">
          <div className="mx-auto max-w-[1200px] px-5 pb-10 pt-6 sm:pb-14 sm:pt-8 lg:pb-14">
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
                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="landingPrimary"
                    className="[&_svg]:size-3.5"
                    onClick={() => signIn("github")}
                  >
                    <GitHubIcon className="size-3.5 text-white" />
                    Connect GitHub
                  </Button>
                  <Button type="button" variant="landingSecondary" asChild className="[&_svg]:size-3.5">
                    <Link href="/analyze" className="inline-flex items-center gap-1.5">
                      View Demo
                      <ChevronRight className="size-3.5 text-stone-500/80" />
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
          <div className="mx-auto max-w-[880px] px-5">
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

        {/* How it works — bento (asymmetric; breaks “5 equal cards”) */}
        <section className="py-14 sm:py-16">
          <div className="mx-auto max-w-[1320px] px-5">
            <div className="max-w-xl">
              <SectionEyebrow>How it works</SectionEyebrow>
              <h2 className="text-balance text-[clamp(1.45rem,2.5vw,2.15rem)] font-semibold leading-[1.12] tracking-[-0.035em] text-stone-900">
                From change to verdict — then back again.
              </h2>
            </div>

            <div className="mt-10 grid gap-2.5 sm:gap-3 lg:grid-cols-12">
              <div className="flex min-h-[200px] flex-col justify-between rounded-2xl border border-stone-300/70 bg-white/50 p-5 shadow-sm backdrop-blur-sm lg:col-span-7 lg:min-h-[230px]">
                <div>
                  <span className="font-mono text-[9px] text-amber-900/80">{steps[0].n}</span>
                  <h3 className="mt-2.5 text-[17px] font-semibold tracking-[-0.025em] text-stone-900">{steps[0].title}</h3>
                  <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-stone-600">{steps[0].body}</p>
                </div>
                <div className="mt-5 h-px w-full max-w-xs bg-gradient-to-r from-amber-800/25 to-transparent" />
              </div>

              <div className="flex min-h-[200px] flex-col rounded-2xl border border-stone-300/70 bg-white/40 p-5 lg:col-span-5 lg:min-h-[230px]">
                <span className="font-mono text-[9px] text-amber-900/80">{steps[1].n}</span>
                <h3 className="mt-2.5 text-[16px] font-semibold tracking-[-0.02em] text-stone-900">{steps[1].title}</h3>
                <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-stone-600">{steps[1].body}</p>
              </div>

              {steps.slice(2).map((s) => (
                <div
                  key={s.n}
                  className="flex flex-col rounded-2xl border border-stone-300/60 bg-white/35 p-4 lg:col-span-4"
                >
                  <span className="font-mono text-[9px] text-stone-500">{s.n}</span>
                  <h3 className="mt-2 text-[14px] font-semibold tracking-[-0.02em] text-stone-900">{s.title}</h3>
                  <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-stone-600">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust dimensions — split: timeline + figure */}
        <section className="border-t border-amber-900/10 py-14 sm:py-16">
          <div className="mx-auto grid max-w-[1320px] gap-10 px-5 lg:grid-cols-[1fr_300px] lg:items-start xl:gap-14">
            <div>
              <SectionEyebrow>Trust score</SectionEyebrow>
              <h2 className="max-w-xl text-balance text-[clamp(1.45rem,2.5vw,2.1rem)] font-semibold leading-[1.12] tracking-[-0.035em] text-stone-900">
                Multiple signals. One release decision.
              </h2>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-stone-600">
                Six dimensions roll into a single score — so “ready to merge” means the same thing in
                frontend, full-stack, and AI-assisted workflows.
              </p>

              <ul className="relative mt-8 space-y-0 border-l border-stone-300/90 pl-6">
                {dimensions.map((d, i) => (
                  <li key={d.name} className="relative pb-7 last:pb-0">
                    <span className="absolute -left-6 top-1 flex size-3.5 -translate-x-1/2 items-center justify-center rounded-full border border-stone-300 bg-[#f3e9de] font-mono text-[8px] text-stone-600">
                      {i + 1}
                    </span>
                    <div className="flex gap-3">
                      <d.icon className="mt-0.5 size-3.5 shrink-0 text-stone-500" />
                      <div>
                        <h3 className="text-[14px] font-medium text-stone-900">{d.name}</h3>
                        <p className="mt-0.5 text-[13px] text-stone-600">{d.hint}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <aside className="lg:sticky lg:top-28">
              <div className="rounded-2xl border border-stone-300/80 bg-white/55 p-6 shadow-sm backdrop-blur-sm">
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-stone-500">Outcome</p>
                <div className="mt-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-stone-200/90 pb-2.5">
                    <span className="text-[13px] text-stone-600">Verdict</span>
                    <span className="rounded-md bg-emerald-600/10 px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
                      Safe
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-stone-200/90 pb-2.5">
                    <span className="text-[13px] text-stone-600">Trust</span>
                    <span className="font-mono text-xl font-semibold tabular-nums text-stone-900">87</span>
                  </div>
                  <p className="font-mono text-[11px] leading-relaxed text-stone-500">
                    Rolls up to <span className="text-emerald-700">Safe</span> ·{" "}
                    <span className="text-amber-700">Risky</span> · <span className="text-rose-700">Block</span>
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        {/* Differentiation — contrast panel */}
        <section className="landing-band-subtle py-14 sm:py-16">
          <div className="mx-auto max-w-[1320px] px-5">
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
                  <div className="mt-3 space-y-1.5">
                    {[100, 88, 76, 64, 52].map((w) => (
                      <div key={w} className="h-1.5 rounded-full bg-stone-300/90" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] text-stone-500">Unbounded comments · unclear bar</p>
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

        {/* Integrations — horizontal, light chrome (less “card farm”) */}
        <section className="py-14 sm:py-16">
          <div className="mx-auto max-w-[1320px] px-5">
            <div className="mx-auto max-w-xl text-center">
              <SectionEyebrow>Integrations</SectionEyebrow>
              <h2 className="text-balance text-[clamp(1.45rem,2.5vw,2.1rem)] font-semibold tracking-[-0.035em] text-stone-900">
                Fits your GitHub workflow.
              </h2>
            </div>
            <div className="mt-10 grid gap-8 sm:grid-cols-2 sm:gap-10 lg:grid-cols-4 lg:gap-6">
              {[
                { icon: GitHubIcon, title: "GitHub", desc: "OAuth and repos your team already uses." },
                { icon: GitBranch, title: "PR flow", desc: "Analyze the PR you’re about to merge." },
                { icon: Code2, title: "Diff analysis", desc: "Scores the change — not random files." },
                { icon: MessageSquare, title: "Optional comments", desc: "Post verdicts where reviewers look." },
              ].map((item) => (
                <div key={item.title} className="group text-center lg:text-left">
                  <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-xl border border-stone-300/80 bg-white/50 transition-colors group-hover:border-stone-400 lg:mx-0">
                    <item.icon className="size-5 text-stone-600 transition-colors group-hover:text-stone-900" />
                  </div>
                  <h3 className="text-[14px] font-semibold text-stone-900">{item.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-stone-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Before / After — type-forward */}
        <section className="border-t border-amber-900/10 py-14 sm:py-16">
          <div className="mx-auto max-w-[880px] px-5 text-center">
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
        <section className="relative border-t border-amber-900/10 bg-gradient-to-b from-amber-950/[0.06] via-[#f0e4d8] to-[#f3e9de] py-16 sm:py-20">
          <div className="mx-auto max-w-[560px] px-5 text-center">
            <h2 className="text-balance text-[clamp(1.45rem,2.7vw,2.1rem)] font-semibold leading-[1.12] tracking-[-0.04em] text-stone-900">
              Merge when the verdict says you can.
            </h2>
            <p className="mt-3 text-[14px] text-stone-600">
              One trust score. Safe, Risky, or Block — for teams that ship for real.
            </p>
            <Button
              type="button"
              variant="landingPrimary"
              className="mt-8 !px-10 [&_svg]:size-3.5"
              onClick={() => signIn("github")}
            >
              <GitHubIcon className="size-3.5 text-white" />
              Connect GitHub
            </Button>
            <p className="mt-7 font-mono text-[11px] text-stone-500">After sign-in — Analyze · Connect · Dashboard</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-amber-900/10 py-8">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-4 px-5 text-[13px] text-stone-600">
          <span className="flex items-center gap-2 font-medium text-stone-700">
            <Shield className="size-3.5 text-stone-600" />
            AI Code Trust
          </span>
          <span className="font-mono text-[11px]">© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
