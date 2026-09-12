# API Forge — Progress

Tracks what was planned vs. what has actually been implemented, phase by phase. Updated at the end of every phase, alongside the commit for that milestone.

Full architecture/design plan: see project history — summarized in `README.md`.

## Phase Status

| Phase | Description | Status | Commit |
|---|---|---|---|
| 1 | Setup + DB + auth | Done | _(this commit)_ |
| 2 | Request builder + HTTP execution | Done | _(this commit)_ |
| 3 | Response viewer | Done | _(this commit)_ |
| 4 | Collections + saved requests | Done | _(this commit)_ |
| 5 | History | Done | _(this commit)_ |
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

---

## Phase 2 — Request builder + HTTP execution

### Planned
- [ ] `core` app: SSRF-safe `httpx` execution service, `/api/execute/` endpoint
- [ ] Full request-builder UI (method/URL/params/headers/body/auth) wired to a real Send

### Implemented
- [x] SSRF protection (`apps/core/ssrf.py`): resolves the hostname and checks **every** resolved IP (private/loopback/link-local incl. `169.254.169.254`/multicast/reserved/unspecified) before connecting, re-validated on **every redirect hop** (max 3), `http`/`https` schemes only. Proven against DNS-rebinding-style resolution (a hostname that resolves to a private IP is still blocked), not just a hostname-string blocklist.
- [x] HTTP execution service (`apps/core/http_client.py`): connect/read timeouts (5s/15s), streamed response capped at 5MB, manual redirect loop (method/body preserved across hops — a documented simplification vs. RFC-exact 301/302 method-downgrade semantics), Bearer/Basic/API Key auth application, JSON/raw/form-urlencoded/multipart body encoding (multipart is text-fields-only this phase — see note below).
- [x] `POST /api/execute/`: authenticated, throttled (`execute` scope). Returns HTTP 400 only for a malformed call to *this* endpoint; a well-formed call whose *target* request fails (timeout/DNS/SSRF-blocked/etc.) is a 200 with `{"success": false, "error_type", "error_message"}` — Send always succeeds from the tool's perspective, only the request under test can fail.
- [x] Frontend request builder: method selector (color-coded), URL bar, Params/Headers/Auth/Body tabs, add-on-type key/value editors, Bearer/Basic/API Key auth forms, body editor (CodeMirror 6 + JSON lint/format for JSON, textarea for raw, key/value editor for form/multipart), Ctrl/Cmd+Enter to send, duplicate-submit guarded.
- [x] `/workspace` route + sidebar entry; Dashboard's "New Request" button now genuinely navigates there.
- [x] Minimal response panel (status/time/size + raw body) — deliberately basic; the full JSON-tree/headers-table/error-state viewer is Phase 3.
- [x] Backend tests: 24 new tests (`apps/core/tests/`) — execution success/params/headers, all 3 auth types, all 4 body-encoding types, redirect following + redirect-to-private-IP blocking + max-redirects, oversized-response rejection, SSRF blocklist (parametrized across localhost/RFC1918/link-local/metadata), disallowed scheme, DNS-rebinding simulation, DNS-failure handling, plus view-layer auth/validation/response-shape tests. All using `httpx.MockTransport` / a stubbed resolver — fully offline and deterministic, no live network dependency in the suite itself.
- [x] Live end-to-end verification (scripted headless Chrome) against **real external calls to httpbin.org**: GET with query param + custom header + bearer token all correctly echoed back; POST with a JSON body via the CodeMirror editor correctly received; a request to the `169.254.169.254` cloud-metadata address correctly blocked in the UI with a clear "Blocked (unsafe target)" message.

### Notes / deviations encountered
- **Multipart body is text-fields-only** in this phase (no real file/binary upload) — uses httpx's `files={key: (None, value)}` trick to force genuine `multipart/form-data` encoding rather than silently falling back to urlencoded. Real file attachments are a documented future improvement.
- **Redirects preserve the original method and body on every hop** (not just 307/308) rather than implementing RFC-exact 301/302-downgrades-to-GET browser semantics — simpler and more predictable for an API testing tool, at the cost of not matching browser redirect behavior exactly.
- Response `headers` collapse duplicate header names (e.g. repeated `Set-Cookie`) to the last value — full multi-value fidelity is a possible future improvement, not needed yet.
- No other deviations from the approved plan.

---

## Phase 3 — Response viewer

### Planned
- [ ] Status/time/size bar, headers table, JSON tree + raw view, distinct error states (timeout/DNS/connection/invalid URL)

### Implemented
- [x] `JsonTree` (`components/response-viewer/json-tree.tsx`): dependency-free recursive collapsible JSON viewer — click any `{`/`[` to collapse (shows a key/item count when collapsed), type-colored leaf values (strings/numbers/booleans/null).
- [x] `ResponseBodyViewer`: Pretty/Raw toggle for JSON bodies (Pretty = `JsonTree`, Raw = formatted `JSON.stringify`), plain `<pre>` for non-JSON bodies, Copy-to-clipboard button with a "Copied" confirmation state.
- [x] `ResponseHeadersTable`: response headers as a simple table, under a `Headers (n)` tab next to `Body`.
- [x] `ResponseStatusBar`: status code + reason phrase (colored by status class: 2xx green / 3xx blue / 4xx amber / 5xx red), elapsed time, size — extracted `formatBytes`/`statusColorClass` into `lib/utils/format.ts` for reuse.
- [x] `ResponseErrorState`: a distinct icon + heading + message per `error_type` (timeout, DNS failure, connection error, invalid URL, SSRF-blocked, too-many-redirects, response-too-large, etc.), so failure modes are visually distinguishable at a glance rather than one generic "error" box.
- [x] Live end-to-end verification (scripted headless Chrome): a real JSON response from httpbin.org rendered as a collapsible tree, expand/collapse both directions, Pretty/Raw toggle, Headers tab showing real response headers, Copy button confirmed to actually populate the clipboard (with clipboard permissions granted to the headless context — Playwright denies clipboard access by default, which is a test-harness detail, not an app bug); DNS-failure, invalid-URL, and blocked-loopback (`http://localhost:9`) error states all rendered with their distinct icon/heading/message. Screenshots confirm styling.

### Notes / deviations encountered
- No backend changes this phase — Phase 3 was frontend-only, reusing Phase 2's `/api/execute/` response shape as-is.
- No deviations from the approved plan.

---

## Phase 4 — Collections + saved requests

### Planned
- [ ] CRUD, save/load into builder, move/rename/delete, isolation tests

### Implemented
- [x] `Collection` model/API (`apps/collections`): CRUD, owner-scoped, `request_count` annotation for the list view.
- [x] `SavedRequest` model/API (`apps/saved_requests`): `collection` FK with `related_name="requests"`, `extract_rules` field present now (default `[]`) so the schema won't need a Phase 7 migration. Ownership is transitive (`SavedRequest.owner` is a property returning `self.collection.owner`) — this exposed a bug in Phase 1's `IsOwner` permission, which assumed a real `owner_id` column; fixed to compare `obj.owner == request.user` so it works for both a direct FK (Collection) and a computed property (SavedRequest).
- [x] Endpoints: `GET/POST /api/collections/`, `GET/PATCH/DELETE /api/collections/{id}/`, `GET/POST /api/collections/{id}/requests/`, `GET/PATCH/DELETE /api/requests/{id}/`, `POST /api/requests/{id}/move/`. `collection` and `order` are **read-only** on the main serializer — never settable from a PATCH body, only via the dedicated move endpoint (each re-validated against the *caller's* collections) — closes an obvious "reparent into someone else's collection" hole.
- [x] Frontend Collections page: expandable collection rows (lazy-loaded requests), create/rename/delete collections, and per-request rename/move/delete, all via small reusable dialogs (`Dialog`, `ConfirmDialog` — new, dependency-free, used here for the first time since Phase 1's plan called for them).
- [x] Workspace integration: a "Save" button next to Send — on `/workspace` it opens a name+collection dialog, creates the `SavedRequest`, and redirects to `/workspace/[requestId]`; on `/workspace/[requestId]` it silently updates the already-loaded request. Loading a saved request hydrates the full builder (method/url/params/headers/body/auth) via a new `loadFromSavedRequest` store action.
- [x] Backend tests: 25 new tests across both apps — full CRUD, cross-user isolation (404, not 403) for every endpoint including the collection-scoped requests list/create, ordering (`order` auto-increments), the "can't reparent via PATCH" security case, and move-endpoint isolation (can't move into or move a request out of another user's collection).
- [x] Fixed a React 19 `set-state-in-effect` lint error surfaced by the new dialogs: rather than `useEffect`-resetting local form state when a dialog reopens for a different record, each dialog's stateful form now lives in a child only mounted while the dialog is open (`Dialog` already returns `null` when closed), so `useState(initial ...)` naturally re-initializes fresh on every open — no effect needed. Applied the same reasoning to the workspace's saved-request hydration: "is this request's data loaded yet" is now tracked as `loadedRequestId` inside the Zustand store itself (set synchronously inside `loadFromSavedRequest`), not as separate local React state, avoiding both the lint issue and a one-frame flash of stale fields when switching between saved requests.
- [x] Live end-to-end verification (scripted headless Chrome): created two collections, saved a live request from the workspace into one, confirmed it listed correctly, renamed it, moved it to the other collection, confirmed the request counts updated on both sides, deleted the request, then deleted both collections back to the empty state. Screenshots confirm styling throughout.

### Notes / deviations encountered
- Renaming a saved request is done via the Collections list's inline rename action (or by using "Save" from an already-loaded request, which does not change its name) — there is no rename field inside the workspace itself, keeping the two flows unambiguous.
- No deviations from the approved plan.

---

## Phase 5 — History

### Planned
- [ ] Auto-logged on every execute (redacted), list/restore/clear/delete

### Implemented
- [x] `RequestHistory` model (`apps/history`): owner-scoped, `saved_request` FK (`SET_NULL` — a deleted saved request doesn't take its history with it), status/timing/size as their own columns, `request_snapshot`/`response_snapshot` JSON. Deliberately does **not** store the response body (only its size) — history exists to let you *restore a request*, not replay an old response, so the extra storage wasn't worth it.
- [x] `record_history()` service, wired into `ExecuteView` so **every** `/api/execute/` call is logged — success or failure — matching how a real API client always leaves a trail on Send. Redacts known secret-bearing fields before they're ever written to the database: `Authorization`/`Proxy-Authorization`/`X-Api-Key`/`Cookie` header values, and `token`/`password`/`key_value` in `auth_config`, all replaced with `••••`. Deliberately does **not** attempt to guess at secrets inside a JSON/raw request body (e.g. a login payload's `password` field) — a documented limitation, since a heuristic there would be unreliable in both directions.
- [x] Endpoints: `GET /api/history/` (paginated, filterable by `?method=` and `?success=`), `GET/DELETE /api/history/{id}/`, `DELETE /api/history/clear/` (own entries only).
- [x] Frontend History page: All/Success/Failed filter tabs, per-entry restore/delete, Clear All (with confirmation). Restoring loads the (redacted) snapshot into the workspace builder and — new store action `loadFromSnapshot`, which `loadFromSavedRequest` now also delegates to, so both code paths share one implementation — surfaces a toast telling the user secrets were redacted and need re-entering when a restored entry actually had any.
- [x] Fixed a real bug found while wiring this up: `/workspace/page.tsx` was unconditionally resetting the draft on mount (added in Phase 4 to stop a loaded saved request's fields from leaking into a fresh session) — which would have silently wiped out a history restore the instant it navigated there. Moved the reset to the actual "start fresh" action points (Dashboard's New Request button, the sidebar's Workspace link) instead of the destination page, so intent lives where the user expressed it.
- [x] Backend tests: 19 new tests — redaction (each sensitive header/auth-config field, confirming non-sensitive ones are left alone), success/failure outcome storage, list/detail/delete/clear isolation, method/success filtering, plus two integration tests confirming `/api/execute/` actually logs history on both outcomes.
- [x] Live end-to-end verification (scripted headless Chrome): sent a real bearer-authenticated request and a real DNS-failure request, confirmed both appear in history with correct status/timing, confirmed the Success/Failed filters isolate them correctly, restored the bearer-token request and **confirmed the restored token field shows `••••`, not the real secret**, deleted one entry, cleared the rest back to the empty state.

### Notes / deviations encountered
- No live production deployment implications — purely additive to the existing execute path.
- No deviations from the approved plan.
