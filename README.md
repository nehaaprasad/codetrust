# AI Code Trust

Local web app that runs **deterministic checks** on pasted code or a GitHub PR, optionally adds an **OpenAI JSON review pass** when `OPENAI_API_KEY` is set, then combines everything into a **weighted score** and a **ship verdict** (SAFE / RISKY / BLOCK). Results can be stored in Postgres.

**Async analysis:** when `REDIS_URL` is set, `POST /api/analyze` returns **202** with a `jobId` and runs the pipeline in a **BullMQ worker** (`npm run worker`). Set `USE_ASYNC_ANALYSIS=false` to keep the request synchronous even if Redis is available. **GitHub sign-in** uses Auth.js (`/api/auth/*`); create a [GitHub OAuth App](https://github.com/settings/developers) with callback URL **`http://localhost:3000/api/auth/callback/github`** locally and set `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET`, and `AUTH_SECRET`. For **deployed** environments, set **`AUTH_URL`** to the site’s canonical origin (e.g. `https://your-app.vercel.app`) and register **`https://<same-host>/api/auth/callback/github`** in the OAuth app’s callback URLs (add localhost, production, and **preview** URLs as needed, or use **separate** OAuth apps per environment). For PR URLs, the app can **post a summary comment** when `GITHUB_TOKEN` has permission (`GITHUB_POST_PR_COMMENT=false` to disable). **Re-run** updates that same comment when `prCommentId` is stored; if the comment was deleted on GitHub, it creates a new one.

### Where the backend lives

There is **no separate Fastify service**. The backend is **Next.js on the server**: Route Handlers under `src/app/api/` run on Node, talk to Postgres through Prisma, call GitHub with Octokit, and call OpenAI when configured. One process (`next dev` / `next start`) serves both the UI and the API.

```mermaid
flowchart TB
  subgraph api [Next.js server]
    R[Route handlers /api/*]
    L[Analysis: rules + optional OpenAI]
    D[(PostgreSQL)]
  end
  R --> L
  L --> D
  L -.->|optional| O[OpenAI API]
  L -.->|PR URLs| G[GitHub API]
  L -.->|optional async| Q[(Redis + worker)]
```

---

## How a request flows

```mermaid
flowchart LR
  subgraph client [Browser]
    L[Landing]
    R["/results/:id"]
  end

  subgraph server [Next.js server]
    A["POST /api/analyze"]
    E[Checks + score + verdict]
    P[(PostgreSQL)]
  end

  L --> A
  A --> E
  E --> P
  P --> R
```

Without `DATABASE_URL`, the same handler still returns a full JSON result on the landing page; nothing is written and there is no saved id to open `/results/:id`.

---

## Pipeline (what the code actually does)

```mermaid
flowchart TD
  I[Code or PR files] --> C[Deterministic checks]
  I --> L[Optional OpenAI JSON review]
  C --> M[Merge issues]
  L --> M
  M --> D[Per-dimension scores 0–100]
  D --> W[Weighted average → trust score]
  W --> V{Verdict rules}
  V -->|score ≥ 85, no critical sec| S[SAFE]
  V -->|60–84| Y[RISKY]
  V -->|under 60 or critical security| B[BLOCK]
```

Weights: security 30%, logic 25%, performance 15%, testing 15%, accessibility 10%, maintainability 5%.  
If `OPENAI_API_KEY` is missing or `ENABLE_LLM=false`, the OpenAI step is skipped and only rules run.  
`modelVersion` in responses is `deterministic-v1` or `deterministic+openai-v1`.

---

## Repo layout

| Path | Role |
|------|------|
| `src/lib/analysis/` | Checks, LLM enrich (`llmEnrich.ts`), weights, scoring, decision, summary |
| `src/lib/github/` | Parse PR URL, fetch files, post PR comment |
| `src/lib/db.ts` | Prisma client (Postgres adapter) |
| `src/lib/persistAnalysis.ts` | Save analysis, issues, sources; rerun updates |
| `src/lib/queue/` | BullMQ queue, Redis connection, job payload helpers |
| `src/worker.ts` | BullMQ worker process (run beside `npm run dev`) |
| `src/auth.ts` | Auth.js / GitHub OAuth config |
| `src/app/api/` | `analyze`, `jobs/[jobId]`, `analysis/*`, `auth/[...nextauth]`, `github/repos`, `github/prs`, `github/webhook` |
| `src/app/` | UI: landing, `dashboard`, `results/[id]` |
| `src/components/ui/` | shadcn-style primitives (Button, Card, …) |
| `src/stores/` | Zustand UI state (e.g. dashboard filter) |
| `prisma/schema.prisma` | `Project`, `Analysis`, `Issue`, `Source`, workspaces, `ApiKey`, … |

---

## Requirements

- Node.js 20+ (what Next 16 expects)
- npm
- Postgres reachable from your machine (local Docker is fine)

---

## Setup

**1. Environment**

Copy `.env.example` to `.env` and set at least:

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | For persistence | Postgres connection string |
| `GITHUB_TOKEN` | Only for PR URLs | Read repo; also used to post the PR comment |
| `GITHUB_POST_PR_COMMENT` | No | Default on; set `false` to skip posting a comment |
| `OPENAI_API_KEY` | No | Second-pass review; omit for rules-only |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini` |
| `ENABLE_LLM` | No | Set to `false` to force rules-only even with a key |
| `REDIS_URL` | No | e.g. `redis://127.0.0.1:6379` — enables async analyze (202 + worker) |
| `USE_ASYNC_ANALYSIS` | No | Set `false` to run analysis inline even when `REDIS_URL` is set |
| `AUTH_SECRET` | For sign-in | Random string for Auth.js (session signing); not the same as `AUTH_GITHUB_SECRET` |
| `AUTH_URL` | Deployments | Canonical site URL with no trailing slash (e.g. `https://your-domain.com`) so OAuth redirects match the deployed host |
| `AUTH_GITHUB_ID` | For sign-in | GitHub OAuth App client id |
| `AUTH_GITHUB_SECRET` | For sign-in | GitHub OAuth App **client** secret from Developer settings |
| `GITHUB_WEBHOOK_SECRET` | For **webhooks** | Shared secret; required for `POST /api/github/webhook` |
| `ANALYZE_MAX_TOTAL_BYTES` | No | Combined-source cap fed into the analyzer (default `1500000`, i.e. 1.5 MB; clamped to 100 KB … 50 MB). Raise for very large PRs. |

**2. Database**

```bash
# optional: start local Postgres
docker compose up -d

# apply schema
npm run db:push
```

**3. Install and run**

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production (e.g. Vercel)

- Set **`DATABASE_URL`** if you use saved analyses, the dashboard, API keys, or shareable `/results/:id` links; without it, the app may show a “database not configured” notice.
- Set **`AUTH_SECRET`**, **`AUTH_GITHUB_ID`**, **`AUTH_GITHUB_SECRET`**, and **`AUTH_URL`** (same origin as users visit — no trailing slash). The GitHub OAuth app must list **`{AUTH_URL}/api/auth/callback/github`** among **Authorization callback URLs** (add preview hostnames too, or use another OAuth app for previews).

**4. Optional: Redis + worker (async analysis)**

```bash
docker compose up -d redis
# in .env: REDIS_URL=redis://127.0.0.1:6379
npm run worker
```

Run the worker in a second terminal while using the app; otherwise queued jobs stay pending.

---

## Scripts

| Command | What it runs |
|---------|----------------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Production server (after build) |
| `npm run lint` | ESLint |
| `npm run db:push` | Push `prisma/schema.prisma` to the DB |
| `npm run worker` | BullMQ worker (needs `REDIS_URL` and same `.env` as the app) |

`postinstall` runs `prisma generate` so the client exists after `npm install`.

---

## API (short)

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/api/analyze` | Body: `{ "code" }` and/or `{ "prUrl" }` and/or `{ "files": [...] }`. Optional auth: `Authorization: Bearer <api_key>` or `X-API-Key` (create keys on the **Dashboard**). Browser sessions attach your GitHub user id when signed in. Sync: **200** with full result. Async (Redis): **202** + `{ "jobId" }`. Returns **413** `{ error, totalBytes, limitBytes }` when combined input exceeds `ANALYZE_MAX_TOTAL_BYTES`. For PR URLs the analyzer uses each file's **diff patch** (added + context lines) rather than fetching head-ref blobs in full, so request size scales with the change, not the repo. |
| `GET` | `/api/jobs/:jobId` | Job state: `waiting` / `active` / `completed` / `failed`; `result` when completed |
| `GET` | `/api/analysis/:id` | Stored row; includes `prCommentUrl` when a comment was posted; needs DB |
| `POST` | `/api/analysis/:id/rerun` | Re-runs from stored input; needs DB |
| `GET` | `/api/health` | Setup status: database / Redis / async / flags (no secrets exposed) |
| `GET` | `/api/analyses` | Recent saved analyses (`limit`, optional `decision=…`, optional `scope=mine` when signed in); needs DB |
| `GET` | `/api/dashboard/usage` | Signed-in: totals, last 7 days, verdict counts, API keys with usage; needs DB |
| `GET` | `/api/api-keys` | List your API keys (metadata only); needs DB + session |
| `POST` | `/api/api-keys` | Create key; response includes `key` **once**; needs DB + session |
| `DELETE` | `/api/api-keys/:id` | Revoke key; needs DB + session |
| `GET` | `/api/github/repos` | Signed-in user’s repos (OAuth token); **401** if not signed in or token missing |
| `GET` | `/api/github/prs?owner=&repo=&state=` | Lists PRs for a repo; OAuth **or** `GITHUB_TOKEN`; **401** if neither available |
| `POST` | `/api/github/webhook` | GitHub **pull_request** events: verifies `X-Hub-Signature-256` with `GITHUB_WEBHOOK_SECRET`, enqueues PR analysis when `REDIS_URL` + async worker are available |

List-repo and list-PR routes run on the **Node.js** runtime so session/JWT cookies decode reliably in production.

### GitHub webhook (v1)

1. In the repo → **Settings → Webhooks → Add webhook**: Payload URL `https://<your-host>/api/github/webhook`, content type **application/json**, secret = **same value** as `GITHUB_WEBHOOK_SECRET` in `.env`.
2. Enable events: **Pull requests** (or individual: `opened`, `synchronize`, `reopened`, `ready_for_review`).
3. Run **Redis** and **npm run worker** so queued jobs execute; without `REDIS_URL` the endpoint still returns **200** with `{ skipped: true, reason: ... }` so GitHub does not retry on missing infra.

