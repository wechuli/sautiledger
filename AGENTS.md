# SautiLedger Agent Guide

This file is the starting context for AI coding agents working in this repository.

## Product Summary

SautiLedger is a PeaceTech civic accountability platform for Kenya-first public participation. It helps communities convert informal concerns into anonymized, structured, and verifiable Community Mandates that institutions can acknowledge, track, and resolve.

One-sentence pitch:

> SautiLedger turns informal community concerns into anonymized, verifiable civic mandates that institutions can acknowledge, track, and resolve.

Read the full product brief before making large product or architecture decisions:

- `docs/sautiledger_project_brief.md`

## Current Repository State

The repository is intentionally early-stage. Treat existing docs as product source of truth and keep implementation choices simple enough for an MVP.

Expected stack from the brief:

- Frontend: Vite, React, TypeScript, shadcn/ui, lucide-react, Recharts
- Backend: Express.js, TypeScript, REST API, TypeORM
- Runtime shape: Express serves the built React frontend and exposes API routes under `/api`
- Local development: Docker Compose for PostgreSQL and the backend/app container
- Deployment: Kubernetes
- Database: PostgreSQL
- AI: OpenAI API
- Optional later: pgvector, background jobs, PWA/offline mode, PDF exports

## Operating Principles

- Build for a Kenya-focused MVP first, while keeping jurisdiction-specific data configurable.
- Privacy and safety are core product requirements, not polish.
- Public views should show aggregate mandate data, not raw personally identifying submissions.
- Use nonpartisan, institution-focused language. Avoid framing that targets individuals or political actors.
- Keep AI outputs reviewable, editable, and marked as generated where appropriate.
- Prefer simple, explicit code over clever abstractions until the product surface stabilizes.
- Keep low-bandwidth users in mind: mobile-first UI, small payloads, resilient flows, clear language.
- Make the frontend dashboard rich and data-forward, with useful graphs, strong visual hierarchy, and clear iconography.
- Use shadcn/ui components, lucide-react icons, and Recharts for frontend UI and charts.
- Use TypeORM entities and migrations for persistence. Avoid ad hoc SQL unless a query is materially clearer or more efficient.

## Domain Language

Use these terms consistently:

- `Submission`: an individual raw concern from a citizen or organizer.
- `Community Mandate`: an anonymized cluster of related submissions that describes a shared priority.
- `Authority`: the institution, office, or level of government likely responsible for a mandate.
- `Institution Response`: a public acknowledgement, update, dispute, or resolution note.
- `Responsiveness Index`: a measure of response behavior, not a ranking of problem-heavy areas.
- `Evidence Strength`: a signal based on submission count, consistency, diversity, duplicate risk, and review status.

## MVP Workflow

The core demo path should stay coherent:

1. A citizen submits an informal concern in English, Swahili, Sheng, or mixed language.
2. The backend stores the original text safely and creates an anonymous tracking code.
3. AI detects language, normalizes or translates, classifies the issue, detects urgency, suggests an authority, and drafts a formal mandate.
4. Similar submissions are clustered into a Community Mandate.
5. The public dashboard shows aggregated mandates by location, category, urgency, authority, and status.
6. An institution user can acknowledge, respond, update status, or mark a mandate resolved.
7. The Responsiveness Index reflects acknowledgement and resolution behavior.

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

1. Scaffold a TypeScript monorepo or two-app layout with `apps/web` and `apps/api`.
2. Add shared domain types in `packages/shared` if the project needs shared validation/types.
3. Configure the API build so Express serves `apps/web/dist` in production.
4. Add Docker Compose for the app container and PostgreSQL.
5. Add TypeORM data source, entities, migrations, and seeds.
6. Build the low-bandwidth submission form.
7. Build an API endpoint that accepts submissions and returns an anonymous tracking code.
8. Add a mock AI processing service before wiring the OpenAI API.
9. Build dashboard views with shadcn/ui, lucide-react, and Recharts.
10. Add Kubernetes manifests after the local container path is stable.

## Testing Expectations

- Add unit tests around privacy, hashing, AI output parsing, routing rules, and status transitions.
- Add integration tests for submission creation and mandate clustering.
- Add lightweight UI tests for the submission form and public dashboard.
- Keep fixtures realistic: English, Swahili, Sheng, and mixed-language examples.

## Environment Variables To Expect

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `SUBMISSION_HASH_SALT`
- `SESSION_SECRET`
- `CORS_ORIGIN`
- `AI_PROVIDER`
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
