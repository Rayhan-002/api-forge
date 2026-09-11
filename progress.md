# API Forge — Progress

Tracks what was planned vs. what has actually been implemented, phase by phase. Updated at the end of every phase, alongside the commit for that milestone.

Full architecture/design plan: see project history — summarized in `README.md`.

## Phase Status

| Phase | Description | Status | Commit |
|---|---|---|---|
| 1 | Setup + DB + auth | Done | _(this commit)_ |
| 2 | Request builder + HTTP execution | Not started | — |
| 3 | Response viewer | Not started | — |
| 4 | Collections + saved requests | Not started | — |
| 5 | History | Not started | — |
| 6 | Environments + variables | Not started | — |
| 7 | Request chaining | Not started | — |
| 8 | Testing / assertions | Not started | — |
| 9 | Dashboard + polish | Not started | — |
| 10 | Testing + Docker + docs | Not started | — |

---

## Phase 1 — Setup + DB + auth

### Planned
- [ ] Monorepo scaffold: `frontend/` (Next.js + TS + Tailwind + ESLint + Prettier), `backend/` (Django project + app skeletons for all 7 apps)
- [ ] `docker-compose.yml` (frontend, backend, postgres, redis) + Dockerfiles + `.env.example` (both sides)
- [ ] Custom `User` model (email as username), `accounts` app
- [ ] JWT auth: register / login / refresh / logout / me, refresh token as httpOnly cookie, Redis(cache)-backed rotation reuse-detection
- [ ] DRF throttling on register/login
- [ ] `core` app: custom exception handler (no raw tracebacks)
- [ ] Frontend: login + register pages, API client with silent access-token refresh, auth store, protected app shell (sidebar/topbar), placeholder dashboard
- [ ] Backend tests: register, login, refresh, refresh-reuse-detection, logout, `/me`, unauthenticated access rejected
- [ ] Manual verification: full register → login → access protected route → refresh → logout flow works end-to-end against real dev servers

### Implemented
- [x] Monorepo scaffold: `frontend/` (Next.js 16 + TS + Tailwind v4 + ESLint + Prettier), `backend/` (Django 5 project + `apps/{accounts,core,collections,saved_requests,environments,history,testing}`, the last five scaffolded but empty until their own phase)
- [x] `docker-compose.yml` (frontend, backend, postgres, redis) + Dockerfiles + `.env.example` (both sides) — written and reviewed carefully, but **not smoke-tested** since Docker isn't installed in the dev environment this was built in. Please run `docker compose up --build` at your convenience and report any issues.
- [x] Custom `User` model (UUID pk, email as `USERNAME_FIELD`), `accounts` app
- [x] JWT auth: register / login / refresh / logout / me. Refresh token is an httpOnly, `Path=/api/auth/`-scoped cookie; rotation-reuse detection backed by Django's cache framework (Redis in Docker, in-process `LocMemCache` for native dev — see `config/settings/base.py`)
- [x] DRF `ScopedRateThrottle` on register/login (`auth` scope, 10/min default)
- [x] `core` app: custom exception handler (`{"error": ...}` shape, never leaks a traceback), default pagination class, `IsOwner` permission (for later phases)
- [x] Frontend: `/login` + `/register` pages, typed fetch client with silent access-token refresh (in-memory token only, never localStorage), Zustand auth store, `RequireAuth`/`RedirectIfAuthenticated` guards, dashboard shell (sidebar + topbar), honest "coming in Phase N" placeholders for Collections/Environments/History/Settings
- [x] Backend tests: 15 tests in `apps/accounts/tests/test_auth.py` — register (incl. duplicate email, mismatched/weak password), login (incl. wrong password/unknown email), refresh (incl. rotation + reuse-detection), logout (incl. invalidates the active refresh token), `/me` (incl. unauthenticated 401, no password field ever returned). All passing against a real local PostgreSQL database.
- [x] Manual end-to-end verification via a scripted headless-Chrome pass: register → dashboard (shows welcome + correct email) → logout → login → all 4 placeholder pages render without error. Screenshots confirm the dark theme/sidebar/toast styling renders correctly. Two expected `401` console entries come from the silent-refresh check on pages with no session yet — not a bug.
- [x] `ruff` added for backend lint/format (`pyproject.toml`); both backend (`ruff check`) and frontend (`eslint`, `tsc --noEmit`, `next build`) are clean

### Notes / deviations encountered
- Docker was not available in the environment this phase was built in — `docker-compose.yml`/Dockerfiles are unverified by an actual `docker compose up`. Flagged above; please test when convenient.
- The local native Postgres instance's `postgres` superuser password had been forgotten; it was reset (with the user driving the actual admin commands) before migrations/tests could run. See the memory notes for this project if this comes up again.
- No other deviations from the approved plan.
