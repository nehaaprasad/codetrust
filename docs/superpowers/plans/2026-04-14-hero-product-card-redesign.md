# Hero Product Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the hero product card component with a refined, production-level dashboard aesthetic

**Architecture:** Modify the existing HeroProductPanel component in landing-view.tsx to implement the new design - trust score circle with progress ring, verdict badge, issues list, and diff preview

**Tech Stack:** Next.js, Tailwind CSS, React

---

### Task 1: Update Card Container Styles

**Files:**
- Modify: `src/components/landing/landing-view.tsx:97-178` (HeroProductPanel function)

- [ ] **Step 1: Read current HeroProductPanel code**

Verify the current implementation at lines 97-178

- [ ] **Step 2: Update container styles**

Replace the current container with:

```tsx
<div className mx-auto w-full max-w-[480px] lg:mx-0 lg:max-w-none>
  <div className overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]>
```

- [ ] **Step 3: Remove top bar (repo info section)**

Delete lines 101-111 (the header with GitBranch icon and PR info)

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/landing-view.tsx
git commit -m refactor(landing): update card container styles
```

---

### Task 2: Create Trust Score Circle Component

**Files:**
- Modify: `src/components/landing/landing-view.tsx:113-133`

- [ ] **Step 1: Replace trust score section with new implementation**

Replace the existing trust score display (lines 114-133) with:

```tsx
<div className flex items-start gap-6>
  {/* Trust Score Circle */}
  <div className relative flex-shrink-0>
    <svg className size-[140px] transform -rotate-90>
      <circle
        cx={70}
        cy={70}
        r={62}
        strokeWidth={8}
        className fill-none stroke-stone-100
      />
      <circle
        cx={70}
        cy={70}
        r={62}
        strokeWidth={8}
        fillnone
        strokeUrl={gradient}
        strokeDasharray={`${(87 / 100) * 389} 389`}
        className=\"stroke-emerald-500 transition-all duration-1000 ease-out\"
        strokeLinecap=\"round\"
      />
    </svg>
    <div className absolute inset-0 flex flex-col items-center justify-center>
      <span className=\"text-[72px] font-semibold leading-none tabular-nums tracking-tight text-gray-900\">
        87
      </span>
      <span className=\"mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-gray-500\">
        Trust Score
      </span>
      <span className=\"mt-0.5 font-mono text-[9px] text-gray-400\">
        out of 100
      </span>
    </div>
  </div>

  {/* Verdict Badge */}
  <div className mt-3 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5>
    <span className=\"font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-700\">
      Safe
    </span>
  </div>
</div>
```

Note: For the gradient, use a linearGradient definition or simplify to solid emerald color:

```tsx
<svg width={140} height={140} className=\"transform -rotate-90\">
  <defs>
    <linearGradient id=\"scoreGradient\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"0%\">
      <stop offset=\"0%\" stopColor=\"#10b981\" />
      <stop offset=\"100%\" stopColor=\"#34d399\" />
    </linearGradient>
  </defs>
  <circle cx={70} cy={70} r={62} strokeWidth={8} className=\"fill-none stroke-gray-100\" />
  <circle
    cx={70}
    cy={70}
    r={62}
    strokeWidth={8}
    fillnone
    stroke=\"url(#scoreGradient)\"
    strokeDasharray={`${(87 / 100) * 389.56} 389.56`}
    strokeLinecap=\"round\"
  />
</svg>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/landing/landing-view.tsx
git commit -m feat(landing): add trust score circle with progress ring
```

---

### Task 3: Update Top Issues List

**Files:**
- Modify: `src/components/landing/landing-view.tsx:135-166`

- [ ] **Step 1: Replace issues list with cleaner design**

Replace the existing issues section (lines 135-166) with:

```tsx
<div className mt-6>
  <p className=\"font-mono text-[11px] uppercase tracking-[0.1em] text-gray-500 mb-3\">
    Top Issues
  </p>
  <ul className=\"space-y-0\">
    {[
      { sev: \"high\", title: \"SQL path in user input\", file: \"api/users.ts\" },
      { sev: \"med\", title: \"Missing branch coverage\", file: \"auth/login.test.ts\" },
      { sev: \"low\", title: \"N+1 query pattern\", file: \"db/queries.ts\" },
    ].map((row) => (
      <li
        key={row.title}
        className=\"flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0\"
      >
        <span
          className={cn(
            \"rounded-full px-2 py-0.5 font-mono text-[8px] font-bold uppercase\",
            row.sev === \"high\" && \"bg-red-50 text-red-600\",
            row.sev === \"med\" && \"bg-amber-50 text-amber-600\",
            row.sev === \"low\" && \"bg-gray-100 text-gray-500\",
          )}
        >
          {row.sev}
        </span>
        <div className=\"min-w-0 flex-1\">
          <p className=\"text-[13px] font-medium text-gray-900 truncate\">{row.title}</p>
          <p className=\"font-mono text-[11px] text-gray-400\">{row.file}</p>
        </div>
      </li>
    ))}
  </ul>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/landing/landing-view.tsx
git commit -m feat(landing): update top issues list styling
```

---

### Task 4: Update Diff Preview Section

**Files:**
- Modify: `src/components/landing/landing-view.tsx:169-174`

- [ ] **Step 1: Update diff section with cleaner styling**

Replace the existing diff section (lines 169-174) with:

```tsx
<div className=\"mt-6 pt-4 border-t border-gray-100\">
  <p className=\"font-mono text-[11px] uppercase tracking-[0.1em] text-gray-500 mb-3\">
    Code diff
  </p>
  <div className=\"rounded-lg border border-gray-200 bg-gray-50 p-3 overflow-hidden\">
    <div className=\"font-mono text-[12px] leading-relaxed\">
      <div className=\"flex\">
        <span className=\"w-6 text-right text-gray-400 select-none\">24</span>
        <span className=\"w-4 text-center text-gray-400 select-none\"> </span>
        <span className=\"text-gray-700\">return verifySession(ctx);</span>
      </div>
      <div className=\"flex\">
        <span className=\"w-6 text-right text-gray-400 select-none\">25</span>
        <span className=\"w-4 text-center text-emerald-600 font-semibold\">+</span>
        <span className=\"text-emerald-700\">if (!ctx.token) {</span>
      </div>
      <div className=\"flex\">
        <span className=\"w-6 text-right text-gray-400 select-none\">26</span>
        <span className=\"w-4 text-center text-emerald-600 font-semibold\">+</span>
        <span className=\"text-emerald-700\">throw new AuthError(\"missing\");</span>
      </div>
      <div className=\"flex\">
        <span className=\"w-6 text-right text-gray-400 select-none\">27</span>
        <span className=\"w-4 text-center text-red-600 font-semibold\">-</span>
        <span className=\"text-red-700\">// TODO: validate</span>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/landing/landing-view.tsx
git commit -m feat(landing): update diff preview styling
```

---

### Task 5: Verify Implementation

**Files:**
- Test: `src/components/landing/landing-view.tsx`

- [ ] **Step 1: Run type check**

```bash
cd /home/neha/codetrust && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 2: Build the project**

```bash
cd /home/neha/codetrust && npm run build
```

Expected: Build completes successfully

- [ ] **Step 3: Final commit**

```bash
git add src/components/landing/landing-view.tsx docs/superpowers/specs/2026-04-14-hero-product-card-design.md
git commit -m \"feat(landing): complete hero product card redesign\"
```

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-14-hero-product-card-redesign.md`**

Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?