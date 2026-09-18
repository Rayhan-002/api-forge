# API Forge — Frontend

Next.js (App Router) + TypeScript + Tailwind CSS client for API Forge. See the [root README](../README.md) for the full architecture writeup, security notes, and API summary.

## Stack

- Next.js / React / TypeScript
- Tailwind CSS v4 (dark developer-tool theme, tokens in `src/app/globals.css`)
- TanStack Query for server state, Zustand for client/auth state
- `@dnd-kit/core` for drag-and-drop collection/request reorganization
- CodeMirror 6 for the JSON body editor
- Talks directly to the Django backend from the browser (no Next.js server-side session — the refresh cookie belongs to the API's own origin)

## Local setup

```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL should point at the running backend
npm run dev
```

Requires the backend (see `../backend/README.md`) running and reachable at `NEXT_PUBLIC_API_URL`.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` / `npm run start` — production build/serve
- `npm run lint` — ESLint
- `npm run format` / `npm run format:check` — Prettier
- `npm run test` — Vitest (51 tests) / `npm run test:watch` — watch mode

## Project layout

- `src/app` — routes: `(auth)/login`, `(auth)/register`, `(dashboard)/{dashboard,collections,environments,history,workspace,settings}`
- `src/components` — `ui/` (atoms), `auth/` (session bootstrap + route guards), `layout/` (sidebar/topbar/shell), `request-builder/`, `response-viewer/`, `collections/`, `environments/`, `testing/`, `dashboard/`
- `src/lib/api` — typed fetch client with silent access-token refresh, one module per resource
- `src/lib/utils` — pure helpers (JSON-path extraction, collection tree building, formatting) — unit-tested in place as `*.test.ts`
- `src/store` — Zustand stores: auth (access token kept in memory only, never persisted) and the request-builder draft

See [`../progress.md`](../progress.md) for what's implemented vs. planned.
