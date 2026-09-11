# API Forge

A lightweight, Postman-inspired API development and testing platform. Build, save, organize, and test HTTP requests from a fast, keyboard-friendly, dark developer UI.

> **Status:** under active development. See [`progress.md`](./progress.md) for what's implemented so far vs. planned.

## Tech Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, TanStack Query, Zustand
- **Backend:** Django, Django REST Framework, PostgreSQL, `httpx`
- **Auth:** JWT (short-lived access token + rotating httpOnly-cookie refresh token)
- **Infra:** Docker Compose (frontend, backend, PostgreSQL, Redis)

## Running locally

Full setup instructions (Docker and native) will be documented here as each part of the stack lands — see `backend/README.md` and `frontend/README.md` for what's currently runnable.

## Documentation

- [`progress.md`](./progress.md) — phase-by-phase build log
- Architecture, API reference, security considerations, and CV summary will be written up in full once the core feature set is complete (final phase).
