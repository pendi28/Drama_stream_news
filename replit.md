# DramaStream

Aggregator web app for the [Anichin / Dracin API](https://github.com/NingRong2/anichin-api) — a unified short-drama API across 15 sources (DramaBox, ReelShort, ShortMax, etc.).

## Architecture

Pnpm monorepo with two artifacts:

- **`artifacts/drama-app/`** — React + Vite frontend (Tailwind v4, wouter router, React Query, shadcn/ui). Mounted at `/`.
- **`artifacts/api-server/`** — Express server. Mounted at `/api`. Acts as a thin proxy that injects the Anichin `X-API-Key` header server-side so the key is never exposed to the browser.

Routes:

- `GET /api/sources` — list of supported source IDs / display names.
- `GET /api/v1/:source/:path?…` — proxied through to `https://api.anichin.bio/:source/:path?…` with `X-API-Key`.

Frontend pages (`artifacts/drama-app/src/pages/`):

- `home.tsx` — trending hero + grid
- `foryou.tsx` — paginated For-You feed
- `search.tsx` — debounced search per source
- `detail.tsx` — drama detail + episode grid (locked episodes greyed out)
- `watch.tsx` — full-screen video player with quality selector, prev/next ep, autoplay-next, click-to-toggle UI

## Environment variables

| Key | Default | Notes |
|---|---|---|
| `ANICHIN_API_KEY` | `TRIAL-ANICHIN-2026` | Trial key works for ~1 day. Replace with paid key for production. |
| `ANICHIN_BASE_URL` | `https://api.anichin.bio` | Upstream API base. |

## Deploy to Vercel

See [`DEPLOY.md`](./DEPLOY.md). Push to GitHub, import in Vercel, set env vars, deploy.

The repo includes:

- `vercel.json` — install/build commands and `/api/*` rewrite to the serverless function.
- `api/index.ts` — Vercel function entry point (re-exports the Express app from `artifacts/api-server/dist/serverless.mjs`).
- `artifacts/api-server/build.mjs` — emits both `dist/index.mjs` (long-running server for Replit) and `dist/serverless.mjs` (handler for Vercel).
