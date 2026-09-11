# API Forge — Backend

Django + Django REST Framework API for API Forge.

## Stack

- Django 5 / Django REST Framework
- PostgreSQL
- JWT auth (`djangorestframework-simplejwt`) with an httpOnly rotating refresh cookie
- Redis-backed cache in Docker/prod (falls back to an in-process cache for native dev — see `config/settings/base.py`)

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
pytest
```

## Project layout

- `config/` — Django project settings (`base.py` / `dev.py` / `prod.py`), root URLconf, WSGI/ASGI.
- `apps/accounts` — custom email-based `User`, JWT register/login/refresh/logout/me.
- `apps/core` — shared exception handling, pagination, permissions; the HTTP-execution service lands here in Phase 2.
- `apps/collections`, `apps/saved_requests`, `apps/environments`, `apps/history`, `apps/testing` — scaffolded, implemented in later phases (see `../progress.md`).
