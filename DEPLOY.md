# Deploy DramaStream to Vercel

This repo is a pnpm monorepo. Vercel will build the React frontend (Vite) and
serve all `/api/*` traffic through a single serverless function that wraps the
Express app in `artifacts/api-server`.

## One-time setup

1. Push this repo to GitHub.
2. Go to https://vercel.com → **Add New Project** → import the GitHub repo.
3. **Framework Preset:** *Other* (Vercel reads `vercel.json`).
4. **Root Directory:** leave as the repo root.
5. **Environment Variables (optional but recommended):**

   | Key | Default | Description |
   |---|---|---|
   | `ANICHIN_API_KEY` | `TRIAL-ANICHIN-2026` | Your Anichin / Dracin API key. The trial key works but is heavily rate-limited (50 req/min, ~1 day TTL). |
   | `ANICHIN_BASE_URL` | `https://api.anichin.bio` | Override only if you self-host the upstream. |

6. Click **Deploy**.

That's it. Vercel will:

- Install with `corepack enable && pnpm install --no-frozen-lockfile`
- Build the Express bundle and the Vite frontend
- Serve `artifacts/drama-app/dist/public/` as static files
- Route any `/api/*` request to the bundled Express app via `api/index.ts`

## Architecture

```
Browser
   │
   ├──  /            →  static React app (Vite build)
   │
   └──  /api/*       →  api/index.ts (Vercel Function)
                            └─→ artifacts/api-server/dist/serverless.mjs (Express)
                                    └─→ https://api.anichin.bio  (X-API-Key added server-side)
```

The Anichin API key is **never** sent to the browser; the React app only ever
talks to the same-origin `/api/*` endpoints.

## Local dev (on Replit)

The two artifacts run automatically as workflows:

- `drama-app` (web) on the preview pane root `/`
- `api-server` on `/api`

No extra steps needed — open the preview.
