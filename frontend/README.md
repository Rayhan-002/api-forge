# API Forge — Frontend

Next.js (App Router) + TypeScript + Tailwind CSS client for API Forge.

## Stack

- Next.js / React / TypeScript
- Tailwind CSS v4 (dark developer-tool theme, tokens in `src/app/globals.css`)
- TanStack Query for server state, Zustand for client/auth state
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

## Project layout

- `src/app` — routes: `(auth)/login`, `(auth)/register`, `(dashboard)/{dashboard,collections,environments,history,settings}`
- `src/components` — `ui/` (atoms), `auth/` (session bootstrap + route guards), `layout/` (sidebar/topbar/shell)
- `src/lib/api` — typed fetch client with silent access-token refresh
- `src/store` — Zustand auth store (access token kept in memory only, never persisted)

See `../progress.md` for what's implemented vs. planned.
