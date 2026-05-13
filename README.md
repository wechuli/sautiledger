# SautiLedger

SautiLedger is a PeaceTech platform that helps communities safely transform informal concerns into anonymized, structured, and verifiable civic mandates that institutions can track, acknowledge, and resolve.

## Project Context

The full product brief lives at `docs/sautiledger_project_brief.md`.

AI coding agents should start with:

- `AGENTS.md`
- `docs/ai/product-context.md`
- `docs/ai/implementation-plan.md`
- `docs/ai/domain-model.md`
- `docs/ai/ai-processing-contract.md`
- `docs/ai/agent-roles.md`

## MVP Direction

The MVP is Kenya-focused and will likely use:

- Vite, React, and TypeScript for the frontend.
- Express.js and TypeScript for the backend.
- PostgreSQL for persistence.
- OpenAI APIs for language detection, translation, classification, summarization, mandate generation, and duplicate support.

The first build should keep the full demo path simple: submit concern, process with mock AI, create or update a Community Mandate, show it on a public dashboard, and allow an institution response.

## Environment

Copy `.env.example` when app scaffolding exists and fill in local values. Do not commit real secrets.
