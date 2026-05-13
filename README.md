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

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in local values:

```bash
cp .env.example .env
```

Key variables:

| Variable                          | Purpose                                                               |
| --------------------------------- | --------------------------------------------------------------------- |
| `DATABASE_URL`                    | Postgres connection string (defaults to the Compose db).              |
| `AI_PROVIDER`                     | `mock` for offline demos, `openai` for real LLM calls.                |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | Required only when `AI_PROVIDER=openai`.                              |
| `SUBMISSION_HASH_SALT`            | Server-side salt for SHA-256 hashing of phone numbers.                |
| `SESSION_SECRET`                  | JWT signing secret for citizen sessions.                              |
| `INSTITUTION_DEMO_KEY`            | Shared key required by the institution console (`X-Institution-Key`). |
| `CORS_ORIGIN`                     | Allowed origin for the Vite dev server.                               |

Do not commit real secrets.

### 3. Start PostgreSQL

```bash
docker compose up -d db
```

### 4. Run migrations and seed data

```bash
npm run migration:run --workspace @sautiledger/api
npm run seed --workspace @sautiledger/api        # base authority + reference data
npm run seed:demo --workspace @sautiledger/api   # 3 demo citizens + 3 demo mandates
```

The demo seed is idempotent — safe to re-run.

### 5. Run the API and frontend

In two terminals:

```bash
npm run dev:api
npm run dev:web
```

- Frontend: <http://localhost:5173>
- API: <http://localhost:3000/api>

The Vite dev server proxies `/api` requests to the API.

### 6. Demo credentials

| Role      | Phone           | Password            |
| --------- | --------------- | ------------------- |
| Citizen A | `+254700000001` | `demo-password-123` |
| Citizen B | `+254700000002` | `demo-password-123` |
| Citizen C | `+254700000003` | `demo-password-123` |

To use the institution console at `/institution`, paste the value of
`INSTITUTION_DEMO_KEY` from your `.env` (default: `demo-institution-key`).

### 7. Production-like container stack

```bash
docker compose up --build
```

The app is served from <http://localhost:3000> (Express serves the built React frontend).

## Demo Walkthrough

1. Visit <http://localhost:5173> — the public dashboard renders charts powered by the seeded mandates.
2. Sign in as `+254700000001` / `demo-password-123`.
3. Open **Submit a concern** and post a new informal report. The API generates a tracking code and either joins an existing Community Mandate or creates a new one (mock AI by default).
4. Open **My submissions** to see your recent tracking codes.
5. Browse `/mandates` to filter by county, urgency, and category.
6. Visit `/tracking` and paste a tracking code to see anonymous status updates.
7. Open `/institution`, enter the demo institution key, then acknowledge or update one of the seeded mandates.

## Using real OpenAI

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini   # or another chat-completions model
```

Both processing (`processSubmissionWithAi`) and clustering (`matchSubmissionToMandate`) call the OpenAI API with strict JSON Schema responses and a low temperature. The original submission text is always preserved separately from AI-generated summaries, and every AI-produced field is marked `generated: true`.

## Tests

```bash
npm run test --workspace @sautiledger/api          # unit tests (mock AI, no DB)
INTEGRATION=1 npm run test --workspace @sautiledger/api  # adds register→submit→track integration tests (needs Postgres + migrations)
```

## Privacy Notes

- Submissions never expose raw names, phone numbers, exact GPS, or identifiers on public surfaces.
- Phone numbers are normalized to Kenyan E.164 and stored only as a salted SHA-256 hash (`SUBMISSION_HASH_SALT`).
- Public dashboards show aggregated Community Mandates, not individual submissions.
- AI-generated summaries are stored separately from the original submission text and flagged as generated.
