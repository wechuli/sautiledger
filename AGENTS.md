# SautiLedger Agent Guide

This file is the starting context for AI coding agents working in this repository.

## Product Summary

SautiLedger is a PeaceTech civic accountability platform for Kenya-first public participation. It helps communities convert informal concerns into anonymized, structured, and verifiable Community Mandates that institutions can acknowledge, track, and resolve.

One-sentence pitch:

> SautiLedger turns informal community concerns into anonymized, verifiable civic mandates that institutions can acknowledge, track, and resolve.

Read the full product brief before making large product or architecture decisions:

- `docs/sautiledger_project_brief.md`

## Current Repository State

The MVP demo path has shipped. Treat the project brief as long-term product context, but use this file and `docs/ai/*` for the current implementation reality.

Actual stack (May 2026):

- Frontend: Vite, React 18, TypeScript, Tailwind, in-repo shadcn-style components, lucide-react, Recharts, react-router-dom 6.
- Backend: Express 4, TypeScript, REST API under `/api`, TypeORM 0.3.x, Zod for validation.
- **Database: SQLite** via `better-sqlite3` at `apps/api/data/sautiledger.db`. Schema is managed by TypeORM `synchronize: true` — there is no migrations directory. PostgreSQL is the future target.
- Citizen auth: phone + bcrypt password → JWT. Anonymous submissions still work without an account.
- Institution console: gated by a shared `INSTITUTION_DEMO_KEY` header (demo-grade, not RBAC).
- AI: behind `processSubmissionWithAi` / `matchSubmissionToMandate` with `mock` (default) and `openai` providers selected via `AI_PROVIDER`.
- Runtime: `npm run dev:api` + `npm run dev:web` for local; `docker compose up --build` for the production-like single-container build (Express serves the built React app).
- Deployment: container is the deployable unit today. Kubernetes manifests are not yet committed.

Shipped pages: `/`, `/submit`, `/mandates` (cascading scope filters + in-page Recharts stats), `/mandates/:id`, `/tracking`, `/me`, `/auth/...`, `/institution`.

Not yet shipped: evidence uploads, audit-hash entity, moderation queue UI, mandate export (Markdown/PDF), Responsiveness Index dashboards, real institution accounts.

## Operating Principles

- Build for a Kenya-focused MVP first, while keeping jurisdiction-specific data configurable.
- Privacy and safety are core product requirements, not polish.
- Public views should show aggregate mandate data, not raw personally identifying submissions.
- Use nonpartisan, institution-focused language. Avoid framing that targets individuals or political actors.
- Keep AI outputs reviewable, editable, and marked as generated where appropriate.
- Prefer simple, explicit code over clever abstractions until the product surface stabilizes.
- Keep low-bandwidth users in mind: mobile-first UI, small payloads, resilient flows, clear language.
- Make the frontend dashboard rich and data-forward, with useful graphs, strong visual hierarchy, and clear iconography.
- Use Tailwind + the in-repo shadcn-style components (`apps/web/src/components/ui.tsx`), lucide-react icons, and Recharts.
- Use TypeORM entities for persistence. Do **not** add a migrations directory while the schema is still managed by `synchronize: true` against SQLite — instead, when an entity changes during dev, delete `apps/api/data/sautiledger.db` and re-seed.
- Do **not** introduce an `Authority` or `Location` table. Use the existing `scopeLevel` enum + `responsibleOffice(...)` helper, and `KENYA_COUNTIES` / `findCounty` / `findConstituency` from `@sautiledger/shared`.

## Domain Language

Use these terms consistently:

- `Submission`: an individual raw concern from a citizen or organizer.
- `Community Mandate` (entity name: `Mandate`): an anonymized cluster of related submissions that describes a shared priority.
- `ScopeLevel`: `national | county | constituency | ward` — carried by every submission and mandate. **Replaces** the `Authority` entity from the original brief.
- `Responsible office`: derived display string from `responsibleOffice(scopeLevel, location)` in `@sautiledger/shared` (e.g. `"Nairobi County Government"`, `"Westlands Ward Administration"`).
- `Institution Response`: a public acknowledgement, update, dispute, or resolution note posted via the institution console.
- `Citizen`: a registered phone+password account; can upvote mandates and view their own submissions.
- `Mandate Upvote`: one citizen → one mandate, toggleable; `Mandate.upvoteCount` is kept in sync.
- `Responsiveness Index`: a planned measure of response behavior, not a ranking of problem-heavy areas.
- `Evidence Strength`: a signal based on submission count, consistency, diversity, duplicate risk, and review status.

## MVP Workflow

The core demo path is now live and should stay coherent:

1. A citizen submits an informal concern in English, Swahili, Sheng, or mixed language. They pick the responsible scope (national / county / constituency / ward) and the relevant Kenyan boundaries via cascading dropdowns.
2. The backend stores the original text safely and creates an anonymous tracking code.
3. AI (mock by default, OpenAI when configured) detects language, normalizes/translates, classifies the issue, detects urgency, derives the responsible office from scope+location, and drafts a formal mandate.
4. Similar submissions are clustered into a Community Mandate (LLM-assisted match).
5. The public dashboard shows aggregated mandates; the mandates page lets users filter by scope, county, constituency, ward, category, urgency, and status, with an in-page Recharts stats panel that re-aggregates to the active filter slice.
6. Logged-in citizens can upvote mandates.
7. An institution user (with `INSTITUTION_DEMO_KEY`) can acknowledge, post a response, update status, or mark a mandate resolved.
8. The Responsiveness Index reflects acknowledgement and resolution behavior (planned for the dashboard).

## Recommended Documentation Map

- `docs/ai/product-context.md`: compact product context for agents.
- `docs/ai/agent-roles.md`: suggested AI agent responsibilities.
- `docs/ai/implementation-plan.md`: MVP phases and first build sequence.
- `docs/ai/domain-model.md`: core entities and relationships.
- `docs/ai/ai-processing-contract.md`: structured AI processing expectations.

## Safety Requirements

When implementing features that touch submissions, identity, evidence, or public display:

- Do not expose names, phone numbers, exact GPS, or raw identifiers in public surfaces.
- Hash contact identifiers if collected. Use a server-side salt from environment variables.
- Store coarse civic locations for the MVP: country, county, constituency, ward.
- Preserve original text internally, but default public displays to aggregated mandate summaries.
- Add consent and safety copy before evidence uploads or sensitive details.
- Treat moderation and abuse prevention as part of the core workflow.

## AI Integration Guidelines

- Keep AI calls behind a service layer.
- Ask models for structured JSON where possible and validate the result.
- Store the original submission separately from generated summaries.
- Include confidence fields for classification, urgency, authority routing, and duplicate matching.
- Design for human override of AI-generated category, urgency, authority, and mandate text.
- Avoid making legal, factual, or institutional claims without marking them as inferred or requiring review.

## Suggested First Implementation Path

The original scaffolding sequence below is **historical** — the repository now has a working API, web app, shared package, Docker build, TypeORM entities, mock + OpenAI processors, and Kenya seed data. New work should extend this rather than re-scaffold.

For reference, the original sequence was:

1. Scaffold a TypeScript monorepo with `apps/web`, `apps/api`, and `packages/shared`. ✅
2. Configure the API build so Express serves `apps/web/dist` in production. ✅
3. Add Docker Compose for the single container. ✅ (no separate DB container — SQLite is in a mounted volume)
4. Add TypeORM data source, entities, and seed data. ✅ (no migrations — `synchronize: true`)
5. Build the low-bandwidth submission form. ✅
6. Add an API endpoint that accepts submissions and returns an anonymous tracking code. ✅
7. Add a mock AI processing service before wiring the OpenAI API. ✅ (both providers exist)
8. Build dashboard views with shadcn-style components, lucide-react, and Recharts. ✅
9. Add Kubernetes manifests. ⏳ pending.

## Testing Expectations

- Add unit tests around privacy, hashing, AI output parsing, routing rules, and status transitions.
- Add integration tests for submission creation and mandate clustering.
- Add lightweight UI tests for the submission form and public dashboard.
- Keep fixtures realistic: English, Swahili, Sheng, and mixed-language examples.

## Environment Variables To Expect

- `DATABASE_PATH` (SQLite file path; default `data/sautiledger.db`)
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `AI_PROVIDER` (`mock` | `openai`)
- `SUBMISSION_HASH_SALT`
- `SESSION_SECRET` (JWT signing for citizen sessions)
- `INSTITUTION_DEMO_KEY` (shared key for the institution console)
- `CORS_ORIGIN`
- `PORT`
- `NODE_ENV`

Do not commit real secrets.

## Done Means

For code changes, a task is not done until:

- The core user flow still matches the project brief.
- Public surfaces preserve anonymity.
- New domain behavior is documented or discoverable in code.
- Tests or a clear manual verification path cover the change.
- The README or docs are updated when setup, architecture, or workflows change.
