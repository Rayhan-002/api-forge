# API Forge — Backend

Django + Django REST Framework API for API Forge. See the [root README](../README.md) for the full architecture writeup, security notes, and API summary.

## Stack

- Django 5 / Django REST Framework
- PostgreSQL
- JWT auth (`djangorestframework-simplejwt`) with an httpOnly rotating refresh cookie
- Redis-backed cache in Docker/prod (falls back to an in-process cache for native dev — see `config/settings/base.py`)
- `drf-spectacular` for OpenAPI schema + Swagger UI (`/api/docs/`)

## Local setup (native, without Docker)

1. Create a virtualenv and install dependencies:

   ```bash
   python -m venv .venv
   .venv/Scripts/activate        # .venv/bin/activate on macOS/Linux
   pip install -r requirements/dev.txt
   ```

2. Copy `.env.example` to `.env` and fill in a real `SECRET_KEY` and your local `DATABASE_URL`.

3. Create the database (adjust to your local Postgres superuser):

   ```sql
   CREATE ROLE api_forge WITH LOGIN PASSWORD 'api_forge' CREATEDB;
   CREATE DATABASE api_forge OWNER api_forge;
   ```

4. Run migrations and start the dev server:

   ```bash
   python manage.py migrate
   python manage.py runserver
   ```

## Local setup (Docker)

From the repo root: `docker compose up --build`. The `backend` service runs migrations automatically before starting.

## Tests

```bash
pytest        # 203 tests
ruff check .  # lint
ruff format . # format
```

## API docs

With the dev server running: Swagger UI at `/api/docs/`, raw OpenAPI schema at `/api/schema/`.

## Project layout

- `config/` — Django project settings (`base.py` / `dev.py` / `prod.py`), root URLconf, WSGI/ASGI.
- `apps/accounts` — custom email-based `User`, JWT register/login/refresh/logout/me, refresh-rotation reuse detection.
- `apps/core` — SSRF-safe `httpx` execution service, `{{variable}}` resolution, the shared `IsOwner` permission, exception handling, pagination, the ad-hoc execute endpoint, and the dashboard summary endpoint.
- `apps/collections` — nestable collections (self-referential `parent`, cycle-checked).
- `apps/saved_requests` — saved requests, move/execute endpoints, extraction rules.
- `apps/environments` — environments + variables, one active per owner, secret masking.
- `apps/history` — auto-logged execution history with secret redaction.
- `apps/testing` — structured, `eval()`-free test assertions and their per-execution results.

See [`../progress.md`](../progress.md) for the phase-by-phase build log.
