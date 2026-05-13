# MVP Implementation Plan

This plan turns the project brief into an implementation sequence that AI agents can follow.

## Architecture Decision

SautiLedger MVP is a single deployable web application:

```text
Browser
  |
  v
Express app
  |-- serves built React frontend
  |-- exposes REST API under /api
  |-- runs AI processing, clustering, privacy, and routing services
  |
  v
PostgreSQL
```

No SMS, USSD, or voice integration is in the MVP. Low-bandwidth access is represented through a mobile-first web submission flow.

## Technical Stack

Frontend:

- Vite
- React
- TypeScript
- shadcn/ui
- lucide-react
- Recharts

Backend:

- Express.js
- TypeScript
- TypeORM
- PostgreSQL
- OpenAI API behind a service interface

Runtime and deployment:

- Local: Docker Compose for the app/backend container and PostgreSQL.
- Production/staging: Kubernetes.
- Express serves the built React frontend in production-like runs.

## Phase 0: Repository Foundation

Goals:

- Choose and document the project layout.
- Add setup instructions.
- Add environment examples.
- Add seed fixture strategy.
- Add Docker Compose for local app + database.
- Add a Dockerfile that builds the frontend and backend into one deployable app image.
- Add initial Kubernetes manifests once the container starts cleanly.

Recommended layout:

```text
apps/
  web/        React + Vite + shadcn/ui + lucide-react + Recharts
  api/        Express + TypeScript + TypeORM backend
packages/
  shared/     Shared domain types and validation schemas
infra/
  docker/     Dockerfile and container support files if needed
  k8s/        Kubernetes manifests
docs/
  ai/         AI collaboration docs
```

Production serving shape:

```text
apps/api
  builds API TypeScript
  serves apps/web/dist as static frontend assets
  falls back to index.html for frontend routes
  exposes API routes under /api
```

## Phase 1: Submission and Mock AI Processing

Goals:

- Build a mobile-first submission form.
- Use shadcn/ui form controls and clear lucide-react visual cues.
- Accept concern text, optional language, issue category, and Kenya location fields.
- Return an anonymous tracking code.
- Run a mock AI processor that produces deterministic structured output.
- Persist submissions with TypeORM.

Acceptance criteria:

- A citizen can submit a concern without creating an account.
- Original text is preserved internally.
- Public response contains no personal identity.
- The app works without an OpenAI API key.
- `docker compose up` starts the app and PostgreSQL.

## Phase 2: Mandate Creation and Dashboard

Goals:

- Group related submissions into Community Mandates.
- Display public mandates by category, location, urgency, status, and responsible authority.
- Add mandate detail pages with timeline and evidence strength.
- Build dashboard analytics with Recharts.
- Use lucide-react icons for issue categories, statuses, authority types, and dashboard actions.

Acceptance criteria:

- Similar sample submissions cluster into one mandate.
- Dashboard shows submission counts and status distribution.
- Dashboard includes graphs for category breakdown, urgency mix, status breakdown, trends over time, and responsiveness.
- Raw submissions are not public by default.

## Phase 3: Institution Response Portal

Goals:

- Add institution/admin authentication.
- Show mandates assigned to an authority.
- Allow acknowledgement, progress updates, disputes, and resolution notes.
- Track response time.
- Show institution responsiveness using dashboard cards and charts.

Acceptance criteria:

- Institution user can update mandate status.
- Public mandate page shows response timeline.
- Responsiveness Index changes after acknowledgement or resolution.

## Phase 4: Privacy, Integrity, and Moderation

Goals:

- Add submitter hashing where identifiers are collected.
- Add rate limiting and abuse checks.
- Add moderation queue for risky or sensitive content.
- Add audit hashes for proof of submission existence.

Acceptance criteria:

- Identifier hashing uses `SUBMISSION_HASH_SALT`.
- Moderation state blocks unsafe mandate publication.
- Audit hash can be generated without exposing identity.

## Phase 5: Demo Polish

Goals:

- Add Kenya seed data.
- Add exportable mandate reports.
- Add charts for trends and Responsiveness Index.
- Add a concise demo script.
- Polish shadcn/ui dashboard surfaces and icon usage.
- Add Kubernetes manifests for app deployment, service, ingress, config, and secrets.

Acceptance criteria:

- A fresh local setup can run the full demo flow.
- Demo data includes water, health, roads, sanitation, and education scenarios.
- Exports avoid raw personal data.
- Kubernetes manifests are usable for a staging deployment with an external or managed PostgreSQL connection.

## First Build Recommendation

Start with mock services, TypeORM entities, migrations, and deterministic seed data. Wire the real OpenAI API after the core domain flow works end to end.

## First Technical Milestone

The first implementation milestone should deliver:

- `apps/web` scaffolded with Vite, React, TypeScript, shadcn/ui, lucide-react, and Recharts.
- `apps/api` scaffolded with Express, TypeScript, TypeORM, and PostgreSQL connection handling.
- Express serving the built React app.
- Docker Compose running app + PostgreSQL.
- Initial TypeORM entities and migrations for locations, issue categories, authorities, submissions, mandate clusters, responses, and status history.
- Seed data for Kenya MVP demo scenarios.
