# Product Context for AI Agents

## What We Are Building

SautiLedger is a PeaceTech platform for public participation with receipts. It helps communities safely turn scattered informal feedback into anonymized, structured civic mandates that institutions can acknowledge, track, and resolve.

The MVP is Kenya-focused and should support English, Swahili, Sheng, and mixed-language submissions.

## MVP Technical Boundaries

- No SMS, USSD, or voice-note integration in the MVP.
- Low-bandwidth participation is handled through a mobile-first web form.
- The React frontend is served by the Express app for production-like runs.
- Local development runs the API and the Vite dev server in two terminals; Docker Compose runs the single-container production-like build.
- Deployment target: containerized (Docker today; Kubernetes later).
- The frontend uses shadcn-style components, lucide-react, Recharts, and react-router-dom.
- The backend uses Express, TypeScript, TypeORM, and **SQLite** (file at `apps/api/data/sautiledger.db`, schema auto-created via `synchronize: true`). PostgreSQL is a future option once the schema stabilizes.
- There is **no separate `Authority` entity**. Each mandate carries a `scopeLevel` (`national | county | constituency | ward`) plus the citizen's location; `responsibleOffice(scope, location)` in `@sautiledger/shared` derives the display label.
- AI is split behind a service interface with two providers: a deterministic **mock** (default for local/demo) and a real **OpenAI** provider, selected via `AI_PROVIDER`.
- Citizen accounts use phone + password with JWT sessions. Anonymous tracking codes still work without an account.
- The institution console is gated by a shared `INSTITUTION_DEMO_KEY` header — not full RBAC.
- Logged-in citizens can **upvote** mandates (one vote per citizen per mandate, toggleable).

## Core Problem

Community concerns are often raised through barazas, WhatsApp groups, SMS, local radio, civil society meetings, and protests. Because this feedback stays fragmented, institutions can dismiss it as anecdotal, disorganized, political, or never formally received.

SautiLedger closes that accountability gap by creating structured civic evidence while reducing individual exposure.

## Product Promise

Turn this:

> People are complaining about water.

Into this:

> 2,418 anonymized residents across 12 locations submitted water-related concerns over 21 days. Reports consistently mention dry taps, broken boreholes, long walking distances, and lack of county response. The responsible authority has not yet acknowledged the issue.

## Primary MVP Users

- Citizen or community member: submits a concern safely and simply.
- Community organizer or civil society actor: collects many concerns and exports reports.
- Journalist or researcher: explores public trends and response timelines.
- Institution user: acknowledges and responds to mandates.
- Admin or moderator: manages categories, reviews flagged content, and protects integrity.

## Core MVP Features

- Low-bandwidth submission flow (web).
- AI-powered mandate builder (mock by default, OpenAI when configured).
- Community mandate clustering.
- Anonymous submission integrity (anonymous tracking codes; salted SHA-256 phone hash for accounts).
- Public mandate dashboard with charts, visual summaries, and clear icons.
- Mandates list page with cascading scope filters (national / county / constituency / ward) and an in-page stats panel that re-aggregates to the active filter slice.
- Citizen upvotes on mandates (one per citizen per mandate).
- Institution response portal (acknowledgement, status updates, public response timeline).
- Anonymous tracking page that resolves a tracking code to status and timeline.
- Responsiveness Index (planned alongside dashboard analytics).
- Mandate export (planned: Markdown/PDF).

## Kenya MVP Scope

Administrative levels:

- National
- County
- Constituency
- Ward

Common issue categories:

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

## Product Values

- Safety before visibility.
- Aggregation before exposure.
- Accountability without partisan escalation.
- Human review where AI may be wrong or risky.
- Simple enough for a hackathon MVP, honest about production limitations.
