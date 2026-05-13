# MVP Implementation Plan

This plan turns the project brief into an implementation sequence that AI agents can follow.

## Phase 0: Repository Foundation

Goals:

- Choose and document the project layout.
- Add setup instructions.
- Add environment examples.
- Add seed fixture strategy.

Recommended layout:

```text
apps/
  web/        React + Vite frontend
  api/        Express + TypeScript backend
packages/
  shared/     Shared domain types and validation schemas
docs/
  ai/         AI collaboration docs
```

## Phase 1: Submission and Mock AI Processing

Goals:

- Build a mobile-first submission form.
- Accept concern text, optional language, issue category, and Kenya location fields.
- Return an anonymous tracking code.
- Run a mock AI processor that produces deterministic structured output.

Acceptance criteria:

- A citizen can submit a concern without creating an account.
- Original text is preserved internally.
- Public response contains no personal identity.
- The app works without an OpenAI API key.

## Phase 2: Mandate Creation and Dashboard

Goals:

- Group related submissions into Community Mandates.
- Display public mandates by category, location, urgency, status, and responsible authority.
- Add mandate detail pages with timeline and evidence strength.

Acceptance criteria:

- Similar sample submissions cluster into one mandate.
- Dashboard shows submission counts and status distribution.
- Raw submissions are not public by default.

## Phase 3: Institution Response Portal

Goals:

- Add institution/admin authentication.
- Show mandates assigned to an authority.
- Allow acknowledgement, progress updates, disputes, and resolution notes.
- Track response time.

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

Acceptance criteria:

- A fresh local setup can run the full demo flow.
- Demo data includes water, health, roads, sanitation, and education scenarios.
- Exports avoid raw personal data.

## First Build Recommendation

Start with mock services and deterministic seed data. Wire the real OpenAI API after the core domain flow works end to end.
