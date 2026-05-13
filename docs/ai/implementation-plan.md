# MVP Implementation Plan

This plan turns the project brief into an implementation sequence that AI agents can follow. As of May 2026, **Phases 0–3 are substantially shipped**; Phase 4 (privacy/integrity hardening) and Phase 5 (demo polish + Kubernetes) are partial. Treat earlier phases as historical context.

## Architecture Decision

SautiLedger MVP is a single deployable web application:

```text
Browser
  |
  v
Express app
  |-- serves built React frontend (production-like)
  |-- exposes REST API under /api
  |-- runs AI processing, clustering, privacy, citizen-auth, and routing services
  |
  v
SQLite file (apps/api/data/sautiledger.db)
```

No SMS, USSD, or voice integration is in the MVP. Low-bandwidth access is represented through a mobile-first web submission flow.

SQLite was chosen over PostgreSQL for the MVP to minimize operational overhead during the demo phase. The schema is managed by TypeORM `synchronize: true` (no migrations directory). Moving to PostgreSQL later is a configuration + migration task — entities are written to be portable.

## Technical Stack

Frontend:

- Vite
- React 18
- TypeScript
- shadcn-style UI components (local in `apps/web/src/components/ui.tsx`)
- lucide-react
- Recharts
- react-router-dom 6
- Tailwind CSS

Backend:

- Express.js 4
- TypeScript
- TypeORM 0.3.x
- **SQLite** via `better-sqlite3` (file-based, `synchronize: true`)
- Zod for request validation
- jsonwebtoken for citizen sessions
- AI behind a service interface with two providers: `mock` (default) and `openai`

Runtime and deployment:

- Local: `npm run dev:api` + `npm run dev:web` (no Docker required for the dev loop).
- Production-like: `docker compose up --build` runs a single container that builds the web app and serves it from Express.
- Kubernetes manifests are not yet committed; container image is the deployable unit today.

## Phase 0: Repository Foundation

Goals:

- Choose and document the project layout.
- Add setup instructions.
- Add environment examples.
- Add seed fixture strategy.
- Add Docker Compose for local app + database.
- Add a Dockerfile that builds the frontend and backend into one deployable app image.
- Add initial Kubernetes manifests once the container starts cleanly.

Recommended layout (current):

```text
apps/
  web/        Vite + React + TS + Tailwind + shadcn-style UI
  api/        Express + TS + TypeORM (SQLite) + AI services
packages/
  shared/     Shared domain types, enums, Kenya geo data, helpers
docs/
  ai/         AI collaboration docs
```

`infra/` is not yet present. Container build is defined by the root `Dockerfile` and `docker-compose.yml`.

Production serving shape:

```text
apps/api
  builds API TypeScript
  serves apps/web/dist as static frontend assets
  falls back to index.html for frontend routes
  exposes API routes under /api
```

## Phase 1: Submission and Mock AI Processing — **shipped**

Goals:

- Build a mobile-first submission form.
- Accept concern text, optional language, scope level, issue category, and Kenya location fields (cascading county → constituency → ward).
- Return an anonymous tracking code.
- Run a mock AI processor that produces deterministic structured output.
- Persist submissions with TypeORM.

Acceptance criteria (met):

- A citizen can submit a concern without creating an account.
- Original text is preserved internally.
- Public response contains no personal identity.
- The app works without an OpenAI API key (`AI_PROVIDER=mock`).
- `docker compose up` starts the single-container app.

## Phase 2: Mandate Creation and Dashboard — **shipped**

Goals:

- Group related submissions into Community Mandates (`mandate-clustering.ts`).
- Display public mandates by category, location, urgency, status, and scope.
- Add mandate detail pages with timeline and evidence strength.
- Build dashboard analytics with Recharts.
- Add the mandates list page with cascading scope filters and an in-page stats panel that re-aggregates to the active filter slice.

Acceptance criteria (met):

- Similar sample submissions cluster into one mandate.
- Dashboard shows submission counts, status distribution, urgency mix, category breakdown, and 30-day trend.
- Mandates list charts (category / urgency / status / top wards / top upvoted) reflect the active filters.
- Raw submissions are not public.

## Phase 3: Institution Response Portal — **shipped (demo-grade)**

Goals:

- Show mandates and allow acknowledgement, progress updates, disputes, and resolution notes.
- Track response time.

Current shape:

- Auth is a shared `INSTITUTION_DEMO_KEY` header (not full RBAC). Acceptable for the demo; production would need real institution accounts.
- Public mandate page shows the response timeline + status history.
- Logged-in citizens can upvote mandates; counts surface on the list, detail page, and stats.

## Phase 4: Privacy, Integrity, and Moderation — **partial**

Shipped:

- Submitter phone numbers are hashed with a server-side salt (`SUBMISSION_HASH_SALT`).
- Anonymous tracking codes generated for every submission.
- Public surfaces never expose phone, email, or exact GPS.

Not yet shipped:

- Rate limiting and automated abuse checks.
- Moderation queue UI for risky or sensitive content.
- Audit-hash entity for tamper-evident proof of submission existence.

## Phase 5: Demo Polish — **partial**

Shipped:

- Kenya seed data (`npm run seed:demo --workspace @sautiledger/api`): three demo citizens and three demo mandates.
- Recharts panels on the dashboard and mandates page.
- Single-container Docker build serving the React app from Express.

Not yet shipped:

- Mandate export (Markdown / PDF).
- Kubernetes manifests.
- Demo script document.

## Future Hardening

When the schema stabilizes, plan to:

- Switch persistence from SQLite to PostgreSQL and introduce a real migrations directory (drop `synchronize: true`).
- Replace the shared institution key with per-institution accounts and RBAC.
- Add Kubernetes manifests, ingress, and managed-Postgres connection settings.
- Wire moderation, audit hashes, and evidence attachments.

## First Build Recommendation (historical)

Start with mock services, TypeORM entities, and deterministic seed data. Wire the real OpenAI API after the core domain flow works end to end. (This was followed; both providers now exist behind `AI_PROVIDER`.)

## First Technical Milestone (historical — complete)

The first implementation milestone delivered:

- `apps/web` scaffolded with Vite, React, TypeScript, Tailwind, shadcn-style components, lucide-react, and Recharts.
- `apps/api` scaffolded with Express, TypeScript, TypeORM, and SQLite via `better-sqlite3`.
- Express serving the built React app in production-like runs.
- Docker Compose running the single-container app.
- Initial TypeORM entities: `Submission`, `Mandate`, `InstitutionResponse`, `StatusHistory`, `Citizen`, `MandateUpvote`. (No `Authority`, `IssueCategory`, or `Location` tables — categories and locations live in `@sautiledger/shared`; scope is an enum on the mandate.)
- Seed data for Kenya MVP demo scenarios.
