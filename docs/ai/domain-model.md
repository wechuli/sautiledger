# Domain Model

This document summarizes the core entities AI agents should use when designing code, schemas, API routes, and UI state.

The backend implements these entities with TypeORM. As of May 2026 the MVP runs on **SQLite** with `synchronize: true` (no migrations). Entities are written to be portable so a Postgres switch is a configuration change later.

Recommended TypeORM conventions:

- Use UUID primary keys for domain entities.
- Use `createdAt` and `updatedAt` timestamp columns where records can change.
- Use string-literal enums for stable status, urgency, and scope values; mirror them as `as const` arrays in `@sautiledger/shared` so the API and frontend stay in sync.
- Keep entity relations explicit, but avoid loading large relation graphs by default.
- Store generated AI output in structured JSON columns only when the shape is validated.
- Issue categories and Kenya locations live as data in `@sautiledger/shared` (`MANDATE_CATEGORIES`, `KENYA_COUNTIES`), not as DB tables.

## Submission

An individual raw concern from a citizen or organizer.

Key fields (current):

- `id`
- `anonymousTrackingCode`
- `submitterHash` (nullable; salted SHA-256 of the phone when an account exists)
- `originalText`
- `normalizedText` (AI-produced)
- `detectedLanguage`
- `country`, `county`, `constituency`, `ward` (string columns; no `Location` table)
- `category` (enum string)
- `urgency` (enum string)
- `scopeLevel` (`national | county | constituency | ward`)
- `mandateId` (nullable FK to `Mandate`)
- `submissionHash`
- `processingStatus`
- `aiProcessingResult` (JSON; includes `safetyFlags`, confidences, etc.)
- `createdAt`, `updatedAt`

Notes:

- Original text is preserved internally and never shown publicly.
- Submissions are not exposed individually on public surfaces; the public API serves Mandate aggregates.

## Mandate (Community Mandate)

An anonymized cluster of related submissions representing a shared community priority. Implemented as the `Mandate` entity (the brief sometimes calls this a "mandate cluster").

Key fields (current):

- `id`
- `title`
- `summary`
- `formalMandateText`
- `category` (enum string)
- `scopeLevel` (`national | county | constituency | ward`)
- `country`, `county`, `constituency`, `ward` (string columns)
- `responsibleOffice` (cached display string; can also be re-derived from `responsibleOffice(scopeLevel, location)` in `@sautiledger/shared`)
- `urgency`
- `status`
- `submissionCount`
- `evidenceStrength`
- `upvoteCount` (denormalized counter; source of truth is the `MandateUpvote` table)
- `firstReportedAt`, `lastActivityAt`
- `createdAt`, `updatedAt`

Statuses:

- `new`
- `under_review`
- `acknowledged`
- `in_progress`
- `resolved`
- `disputed`
- `escalated`

## Scope and responsible office (no `Authority` table)

The MVP does **not** have a separate `Authority` entity. Instead, every submission and mandate carries a `scopeLevel`:

- `national`
- `county`
- `constituency`
- `ward`

The responsible office is derived from the scope plus the citizen-supplied location via `responsibleOffice(scopeLevel, location)` in `@sautiledger/shared`. Examples:

- `national` → `Office of the President`
- `county` + `Nairobi` → `Nairobi County Government`
- `ward` + `Westlands` → `Westlands Ward Administration`

When the platform onboards real institutions later, this can be replaced by an `Authority` table without changing public URLs.

## Institution Response

A public response by a responsible institution. In the MVP, institution users authenticate via the shared `INSTITUTION_DEMO_KEY` header.

Key fields (current):

- `id`
- `mandateId`
- `responseText`
- `statusUpdate` (optional new mandate status)
- `expectedResolutionDate`
- `createdAt`

Response types are conventions on the `responseText`/`statusUpdate` payload:

- Acknowledgement.
- Request for more information.
- Action timeline.
- Progress update.
- Resolution report.
- Dispute with explanation.

## Status History

Timeline of mandate state changes.

Key fields:

- `id`
- `mandateId`
- `oldStatus`
- `newStatus`
- `note`
- `createdAt`

## Citizen

A registered citizen account used for tracking-code recovery, "My submissions", and upvoting. Anonymous submissions still work without an account.

Key fields:

- `id`
- `phoneE164` (Kenyan E.164)
- `phoneHash` (salted SHA-256 of `phoneE164` using `SUBMISSION_HASH_SALT`)
- `passwordHash` (bcrypt)
- `displayName` (optional, never shown publicly)
- `createdAt`, `updatedAt`

Authentication: phone + password → JWT bearer token signed with `SESSION_SECRET`.

## Mandate Upvote

A citizen's endorsement of a mandate. Unique on `(mandateId, citizenId)`; the `Mandate.upvoteCount` column is kept in sync as votes toggle.

Key fields:

- `id`
- `mandateId`
- `citizenId`
- `createdAt`

## Issue Category

Issue categories are an enum in `@sautiledger/shared` (`MANDATE_CATEGORIES`), not a database table. Adding a new category means updating the shared constant.

Current categories:

- Water
- Roads
- Health
- Education
- Security
- Land
- Sanitation
- Markets
- Aid distribution
- Public finance
- Resource exploitation
- Other

## Location

There is no `Location` table. Each submission and mandate stores `country`, `county`, `constituency`, and `ward` as plain string columns. Valid Kenyan administrative names live in `@sautiledger/shared` as `KENYA_COUNTIES`, with helpers `findCounty(name)` and `findConstituency(county, constituency)` used by the cascading dropdowns on both the submit page and the mandates list page.

Design note:

Future jurisdiction expansion can introduce a real `Location` table or pluggable boundary catalogs.

## Aspirational entities (not yet in the schema)

These are referenced in the brief but have not yet been implemented. Add them in Phase 4 / production hardening:

- **Evidence Attachment** — optional photo/audio/document linked to a submission. Will require metadata stripping, a moderation review state, and consent copy on upload.
- **Audit Hash** — tamper-evident proof that a submission existed at a point in time without revealing the submitter.
- **Authority / Institution Account** — replaces the shared `INSTITUTION_DEMO_KEY` with per-institution accounts and RBAC.
- **Moderator / Admin User** — full role-based access for moderation queues.

## Dashboard Read Models

The frontend should be dashboard-rich, so the API should expose aggregate read models rather than forcing the React app to compute everything from raw rows.

Recommended read models (current + planned):

- Mandates by issue category — **shipped** (`/api/dashboard`, `/api/mandates/stats`).
- Mandates by urgency — **shipped**.
- Mandates by status — **shipped**.
- Mandates by scope level (national / county / constituency / ward) — **shipped**.
- Mandates by county / constituency / ward (top-N within current filters) — **shipped** on `/api/mandates/stats`.
- Submission trends over time (30-day) — **shipped** on `/api/dashboard`.
- Top upvoted mandates within a filter slice — **shipped**.
- Responsiveness Index by scope — **planned**.
- Evidence strength distribution — **planned**.
- Recent mandate activity — partially via `lastActivityAt` sort.

These are implemented as service-layer aggregate queries using TypeORM query builders. Cached aggregates can come later if needed.
