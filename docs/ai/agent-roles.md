# Suggested AI Agent Roles

These roles help future AI agents divide work without losing the product thread. They are guidance, not a runtime framework.

## Product Steward Agent

Owns product coherence.

Responsibilities:

- Keep work aligned with `docs/sautiledger_project_brief.md`.
- Preserve the Kenya-first MVP scope.
- Keep language nonpartisan and peace-oriented.
- Watch for scope creep.
- Translate feature requests into user stories and acceptance criteria.

Useful outputs:

- Feature briefs.
- Demo scripts.
- Acceptance criteria.
- README and docs updates.

## Architecture Agent

Owns technical shape.

Responsibilities:

- Keep the stack simple: Vite, React, TypeScript, shadcn/ui, lucide-react, Recharts, Express, TypeORM, PostgreSQL.
- Maintain the single deployable app shape where Express serves the built React frontend and exposes API routes under `/api`.
- Keep Docker Compose as the local app + database runtime and Kubernetes as the deployment target.
- Protect boundaries between web UI, API, AI services, domain logic, and persistence.
- Design jurisdiction-specific data as configuration.
- Keep OpenAI calls behind typed service interfaces.

Useful outputs:

- Architecture notes.
- Directory structure proposals.
- API route contracts.
- Migration plans.

## Privacy and Safety Agent

Owns participant protection.

Responsibilities:

- Check whether public surfaces expose individual identities.
- Review hashing, coarse location handling, evidence upload risks, moderation states, and retention choices.
- Add warnings and consent copy where users might disclose sensitive details.
- Flag features that require production threat modeling.

Useful outputs:

- Privacy reviews.
- Risk registers.
- Safety checklist updates.
- Abuse and moderation workflows.

## AI Processing Agent

Owns AI-assisted transformation from raw concern to structured civic record.

Responsibilities:

- Maintain structured AI output schemas.
- Design prompts that preserve uncertainty and avoid overclaiming.
- Validate AI output before storage.
- Keep confidence scores and human override paths.
- Create realistic multilingual fixtures.

Useful outputs:

- Prompt templates.
- JSON schemas.
- Evaluation fixtures.
- Mock AI processor behavior.

## Frontend Agent

Owns user-facing flows.

Responsibilities:

- Build low-bandwidth, mobile-first interfaces.
- Use shadcn/ui components and lucide-react icons.
- Use Recharts for category, urgency, status, trend, and responsiveness charts.
- Make dashboards rich, visual, and easy to scan without exposing individual submissions.
- Keep submission flow simple and clear.
- Build public dashboard and mandate detail views for scanning.
- Build institution response and admin review surfaces.

Useful outputs:

- React components.
- shadcn/ui composition patterns.
- Recharts dashboard panels.
- Route structure.
- Responsive layouts.
- UI test notes.

## Backend Agent

Owns API, persistence, and business rules.

Responsibilities:

- Build REST endpoints.
- Use TypeORM entities, repositories, migrations, and query builders.
- Implement validation, rate limiting, auth, and role checks.
- Store submissions, mandates, authorities, responses, status history, and audit hashes.
- Implement clustering and routing services.
- Provide aggregate dashboard read models for the frontend.

Useful outputs:

- Express routes.
- TypeORM entities and migrations.
- Service tests.
- Seed data.

## Demo Agent

Owns hackathon/pitch readiness.

Responsibilities:

- Keep the demo path sharp from citizen submission to institution response.
- Create sample Kenya data and realistic scenarios.
- Make sure the app can run locally with mock services.
- Make sure `docker compose up` runs the app and PostgreSQL.
- Maintain demo scripts and seed commands.

Useful outputs:

- Demo data.
- Walkthrough scripts.
- Screenshots.
- Export examples.
