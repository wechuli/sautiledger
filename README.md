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

- Vite, React, TypeScript, shadcn/ui, lucide-react, and Recharts for the frontend.
- Express.js, TypeScript, and TypeORM for the backend.
- PostgreSQL for persistence.
- Docker Compose for local app + database development.
- Kubernetes for deployment.
- OpenAI APIs for language detection, translation, classification, summarization, mandate generation, and duplicate support.

The React frontend should be served by the Express app in production-like runs. The first build should keep the full demo path simple: submit concern, process with mock AI, create or update a Community Mandate, show it on a graph-rich public dashboard, and allow an institution response. SMS integration is out of scope for the MVP.

## Environment

Copy `.env.example` when app scaffolding exists and fill in local values. Do not commit real secrets.

## Repository Layout

- `apps/web`: Vite + React + TypeScript frontend.
- `apps/api`: Express + TypeScript REST API with TypeORM wiring.
- `packages/shared`: shared domain types used by the API and frontend.
- `docker-compose.yml`: local production-like app and PostgreSQL stack.

## Local Development

Install dependencies:

```bash
npm install
```

Run the API and Vite frontend in separate terminals:

```bash
npm run dev:api
npm run dev:web
```

The frontend runs on `http://localhost:5173` and proxies `/api` requests to `http://localhost:3000`.

Run the production-like container stack:

```bash
docker compose up --build
```

The app is served from `http://localhost:3000`.
