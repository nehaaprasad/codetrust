# AI Code Trust Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Premium landing page for AI Code Trust — a developer tool that analyzes code changes and gives a clear verdict (SAFE/RISKY/BLOCK)

**Architecture:** Single-page marketing site with hero, problem statement, how-it-works, trust score breakdown, differentiation, integrations, before/after proof, and final CTA sections

**Tech Stack:** Next.js + TypeScript + TailwindCSS + Lucide icons

---

## Landing Page Structure

### 1. Hero Section

**Files:**
- Modify: `src/components/landing/landing-view.tsx:310-364`
- Modify: `src/app/globals.css:113-148`

**Content:**
- Product name: AI Code Trust
- Headline: `Ship with a verdict, not a guess.`
- Subheadline: AI Code Trust analyzes code changes before merge and returns a trust score plus a clear verdict: Safe, Risky, or Block — across security, logic, performance, testing, accessibility, and maintainability.
- Primary CTA: **Connect GitHub** (signs in with GitHub OAuth)
- Secondary CTA: **View Demo** (links to /analyze)
- Product mockup showing:
  - Trust score (87)
  - Verdict badge ("SAFE")
  - Top issues list (SQL path injection, Missing branch coverage, N+1 query)
  - Code diff preview

---

### 2. Problem Section

**Files:**
- Modify: `src/components/landing/landing-view.tsx:366-399`

**Content:**
- Section label: Problem
- Headline: `AI ships fast. Reviews still splinter.`
- Body copy:
  - AI writes code faster than most teams can review. Comments stack up in different tools, threads go in circles, and "LGTM" is not a risk assessment.
  - Before merge, you need one clear shipping decision — not another noisy thread.
- Three bullet points:
  1. Review is fragmented across PRs, chat, and docs
  2. Risk hides in logic, security, and edge cases
  3. Teams need a single signal: safe to ship or not

---

### 3. How It Works Section

**Files:**
- Modify: `src/components/landing/landing-view.tsx:401-419`

**Content:**
- Section label: How it works
- Headline: `From change to verdict — then back again.`
- 5 steps (grid layout, single column mobile / 5 columns desktop):
  1. **01**: Paste code or connect a repo — Snippet or GitHub — you pick where the change lives.
  2. **02**: Analyze the change — Diff-first: what you're shipping, not the whole tree.
  3. **03**: Score the risk — Dimensions roll into one trust score.
  4. **04**: Get the verdict — Safe, Risky, or Block — one line for release.
  5. **05**: Fix and re-run — Iterate until the score matches your bar.

---

### 4. Trust Score Section

**Files:**
- Modify: `src/components/landing/landing-view.tsx:421-452`

**Content:**
- Section label: Trust score
- Headline: `Multiple signals. One release decision.`
- Body: Six dimensions roll into a single score — so "ready to merge" means the same thing for frontend, full-stack, and AI-assisted workflows.
- 6 dimension cards (3 columns on desktop):
  1. **Security** — Secrets, injection, auth boundaries (Lock icon)
  2. **Logic** — Control flow, edge cases, failure modes (Braces icon)
  3. **Performance** — Hot paths, N+1, unnecessary work (Zap icon)
  4. **Testing** — How well the change is covered (TestTube2 icon)
  5. **Accessibility** — Semantics, keyboard, critical UI paths (Layers icon)
  6. **Maintainability** — Clarity, coupling, change cost (Code2 icon)
- Footer: Outcome: Safe · Risky · Block

---

### 5. Differentiation Section

**Files:**
- Modify: `src/components/landing/landing-view.tsx:454-505`

**Content:**
- Section label: Differentiation
- Headline: `Not another generic AI reviewer.`
- Body: Suggestions are useful — release readiness is what blocks a merge. AI Code Trust gives a final verdict tied to the diff you're about to ship.
- Three bullet points:
  1. Built for merge decisions, not open-ended chat
  2. Safe / Risky / Block maps to how teams actually ship
  3. Re-run until the score matches your risk bar
- Two cards comparison:
  - Generic review: unbounded comments, unclear ship bar
  - AI Code Trust: SAFE verdict, trust score 87

---

### 6. Integration Section

**Files:**
- Modify: `src/components/landing/landing-view.tsx:507-550`

**Content:**
- Section label: Integrations
- Headline: `Fits your GitHub workflow.`
- 4 integration cards (2x2 grid):
  1. **GitHub** — Connect with OAuth — same repos your team already uses.
  2. **PR review flow** — Analyze the pull request you're about to merge.
  3. **Code diff analysis** — Scores what changed — not a random slice of the repo.
  4. **Optional GitHub comments** — Surface the verdict where reviewers already look.

---

### 7. Before / After Section

**Files:**
- Modify: `src/components/landing/landing-view.tsx:552-565`

**Content:**
- Section label: Proof
- Headline: `Score up. Verdict follows.`
- Body: Start with a lower trust score and a Risky verdict. Fix what matters, re-run on the same change, and watch the score — and badge — move.
- Before card:
  - Label: First run
  - Score: 62
  - Badge: Risky (amber)
  - Issues: 4 flagged
- After card:
  - Label: After fixes
  - Score: 89
  - Badge: Safe (green)
  - Issues: 0 blocking

---

### 8. Final CTA Section

**Files:**
- Modify: `src/components/landing/landing-view.tsx:567-594`

**Content:**
- Section label: (none)
- Headline: `Merge when the verdict says you can.`
- Body: One trust score. Safe, Risky, or Block — built for serious shipping teams.
- Button: **Connect GitHub**
- Footer note: After sign-in: Analyze, Connect, Dashboard.

---

## Design Implementation Details

### Background & Atmosphere

**CSS Classes:** `.landing-bg`, `.landing-noise`, `.landing-hero-glow`

**Implementation in globals.css:**
```css
.landing-bg {
  background-color: #08080a;
  background-image:
    radial-gradient(ellipse 100% 80% at 50% -30%, rgba(120, 113, 255, 0.12), transparent 55%),
    radial-gradient(ellipse 60% 50% at 100% 0%, rgba(56, 189, 248, 0.08), transparent 45%),
    radial-gradient(ellipse 50% 40% at 0% 80%, rgba(139, 92, 246, 0.06), transparent 50%),
    radial-gradient(ellipse 90% 50% at 50% 110%, rgba(39, 39, 42, 0.5), transparent 55%);
}

.landing-bg::after {
  /* grid pattern overlay */
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: linear-gradient(to bottom, black 0%, black 35%, transparent 95%);
}

.landing-hero-glow {
  background: radial-gradient(
    ellipse 70% 55% at 70% 45%,
    rgba(99, 102, 241, 0.14) 0%,
    rgba(56, 189, 248, 0.06) 40%,
    transparent 70%
  );
}
```

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| Background | #08080a | Page canvas |
| Surface | zinc-950/90 | Cards, panels |
| Border | white/[0.06] - white/[0.09] | Subtle borders |
| Primary accent | violet-500 | CTAs, highlights |
| Secondary accent | sky-500 | Gradients |
| Text primary | zinc-50 | Headlines |
| Text secondary | zinc-400 | Body |
| Text muted | zinc-500, zinc-600 | Labels |
| Safe | emerald-400 | Verdict badge |
| Risky | amber-400 | Verdict badge |
| Block | rose-400 | Verdict badge |

### Typography

- **Headlines**: Default sans, tracking tight, text-balance
- **Section labels**: Mono, uppercase, tracking wide
- **Body**: Default sans, relaxed leading
- **Code elements**: Mono (for diffs, scores)

### Components

| Component | File | Lines |
|-----------|------|-------|
| HeroMockup | landing-view.tsx | 102-189 |
| DiffSnippet | landing-view.tsx | 54-100 |
| BeforeCard | landing-view.tsx | 191-228 |
| BeforeAfterMockup | landing-view.tsx | 230-254 |
| GitHubIcon | landing-view.tsx | 24-31 |
| SectionLabel | landing-view.tsx | 33-39 |
| SectionTitle | landing-view.tsx | 41-52 |

---

## Implementation Status

**Complete** — This landing page is fully implemented and currently in production at `/`.

- [x] Hero with CTAs and mockup
- [x] Problem section
- [x] How it works (5 steps)
- [x] Trust score (6 dimensions)
- [x] Differentiation
- [x] Integrations
- [x] Before/After proof
- [x] Final CTA
- [x] Design system (CSS, colors, typography)
- [x] Responsive layout

---

## Execution Options

The landing page is already built and deployed. Available actions:

1. **Review the existing code** — Inspect `/src/components/landing/landing-view.tsx`
2. **Make targeted changes** — Edit specific sections
3. **Create a variant** — New design direction in a separate component
4. **Add new sections** — Extend the page structure

Which approach would you like?