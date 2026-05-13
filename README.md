# SautiLedger

> _Sauti_ (Swahili: voice) + _Ledger_ — a public, verifiable record of community voice.

**SautiLedger is a Kenya-first PeaceTech platform that turns informal, scattered community concerns into anonymized, structured, and verifiable Community Mandates that institutions can acknowledge, track, and resolve in public.**

It is designed for the gap between two things that already exist:

1. **Communities have a lot to say.** Concerns about water, health, education, security, infrastructure, and corruption are constantly raised — in WhatsApp groups, on the radio, in *baraza*s, in market conversations, and to chiefs and ward administrators. Most of it never reaches the institutions that could act on it, and what does reach them rarely lands as evidence.
2. **Institutions struggle to respond systematically.** County governments, constituency offices, ward administrations, and national agencies have legitimate accountability obligations under Kenya's public participation framework (Constitution Art. 10 & 174, County Governments Act, Public Participation guidelines) but lack a structured, low-friction channel to receive citizen input and demonstrate response over time.

SautiLedger sits in that gap.

## What the platform does

1. **A citizen submits a concern** — in English, Swahili, Sheng, or mixed language — from a mobile-first, low-bandwidth interface. No login required. They pick the responsible scope (national, county, constituency, or ward) and the relevant Kenyan boundary via cascading dropdowns.
2. **The backend stores the original text safely** under a salted hash and issues an **anonymous tracking code** the citizen can use to follow the issue later, without revealing who submitted it.
3. **AI normalizes the message** — detects language, translates as needed, classifies the issue (e.g. water, health, education, infrastructure, security, governance), scores urgency, derives the responsible office from scope + location, and drafts a formal mandate. All AI output is marked as generated, is reviewable, and is editable.
4. **Similar submissions are clustered** into a single **Community Mandate** — an anonymized, plain-language statement of a shared community priority backed by a count of supporting submissions and an evidence-strength signal.
5. **A public dashboard surfaces the mandates** by scope, county, constituency, ward, category, urgency, and status — graph-rich and easy to scan. Individual personal data is never exposed; only aggregates.
6. **Registered citizens can upvote mandates** they care about, strengthening the public signal without exposing identity.
7. **Institutions respond in public.** Authorized institution users acknowledge mandates, post updates, dispute claims with reasoning, and mark issues resolved. Every state change is recorded.
8. **A Responsiveness Index** measures _response behavior_ — acknowledgement speed, update frequency, resolution rate — so accountability is about how institutions act, not which areas have the most problems.

## Why this is useful

- **For citizens:** a safe, anonymous, low-bandwidth way to be heard without retaliation risk, and a way to _track_ whether their concern was acknowledged and acted on.
- **For institutions:** a structured, auditable inbox of community priorities with clear scope routing, plus a public record of their own responsiveness they can point to during budget cycles, performance reviews, and reporting under the County Governments Act.
- **For civil society, journalists, and researchers:** a transparent, machine-readable feed of aggregated civic priorities and institutional response patterns over time — without exposing the individuals behind the submissions.
- **For peacebuilding:** by routing grievances into a calm, nonpartisan, institution-focused channel and showing measurable response, SautiLedger reduces the friction that turns unaddressed concerns into mistrust, rumor, and unrest.

## Design principles

- **Privacy by default.** Public views show aggregated mandates; raw submissions, names, phone numbers, and exact GPS never appear publicly. Identifiers are hashed with a server-side salt.
- **Nonpartisan, institution-focused.** Language targets responsible offices, not individuals or political actors.
- **Reviewable AI.** Every AI-generated category, urgency, routing, and mandate draft is editable, marked as generated, and overridable.
- **Mobile-first, low-bandwidth.** Small payloads, resilient flows, clear copy in everyday language.
- **Kenya-first, but configurable.** Counties, constituencies, and wards are data, not hard-coded UI.

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

The MVP is Kenya-focused and uses:

- Vite, React, TypeScript, shadcn/ui, lucide-react, and Recharts for the frontend.
- Express.js, TypeScript, and TypeORM for the backend.
- **SQLite (file-based)** for persistence — zero ops, perfect for the demo. The DB lives at `apps/api/data/sautiledger.db` and the schema is auto-created via TypeORM `synchronize: true`.
- Docker Compose for a single-container local run.
- Kubernetes for deployment.
- OpenAI APIs for language detection, translation, classification, summarization, and mandate generation.

There is no separate "Authority" table in the MVP. When citizens submit a concern, they pick the responsible scope themselves:

- **National** — Office of the President
- **County** — the relevant county government
- **Constituency** — the relevant constituency office
- **Ward** — the relevant ward administration

The responsible office string is derived from the chosen scope plus the citizen's location.

The React frontend is served by the Express app in production-like runs.

## Environment

Copy `.env.example` when app scaffolding exists and fill in local values. Do not commit real secrets.

## Repository Layout

- `apps/web`: Vite + React + TypeScript frontend.
- `apps/api`: Express + TypeScript REST API with TypeORM wiring (SQLite).
- `packages/shared`: shared domain types used by the API and frontend.
- `docker-compose.yml`: single-container production-like app stack.

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
| `DATABASE_PATH`                   | Path to the SQLite file (default `data/sautiledger.db`).              |
| `AI_PROVIDER`                     | `mock` for offline demos, `openai` for real LLM calls.                |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | Required only when `AI_PROVIDER=openai`.                              |
| `SUBMISSION_HASH_SALT`            | Server-side salt for SHA-256 hashing of phone numbers.                |
| `SESSION_SECRET`                  | JWT signing secret for citizen sessions.                              |
| `INSTITUTION_DEMO_KEY`            | Shared key required by the institution console (`X-Institution-Key`). |
| `CORS_ORIGIN`                     | Allowed origin for the Vite dev server.                               |

Do not commit real secrets.

### 3. Seed demo data (optional)

```bash
npm run seed:demo --workspace @sautiledger/api
```

Populates the SQLite DB with a small set of clustered demo mandates and submissions so the dashboard and mandates list have something to render on first run. The phones and password used by the seed script live in [apps/api/src/scripts/seed-demo.ts](apps/api/src/scripts/seed-demo.ts) — change them before sharing the instance publicly. The seed is idempotent — safe to re-run. The SQLite file and parent directory are created automatically on first run.

### 4. Run the API and frontend

In two terminals:

```bash
npm run dev:api
npm run dev:web
```

- Frontend: <http://localhost:5173>
- API: <http://localhost:3000/api>

The Vite dev server proxies `/api` requests to the API.

### 5. Sign in / institution console

Register a citizen account from `/auth/register` (phone + password). Anonymous submissions also work without an account.

To use the institution console at `/institution`, paste the value of
`INSTITUTION_DEMO_KEY` from your `.env` (default: `demo-institution-key`).

### 6. Production-like container stack

```bash
docker compose up --build
```

The app is served from <http://localhost:3000> (Express serves the built React frontend).

## Demo Walkthrough

1. Visit <http://localhost:5173> — the public dashboard renders charts powered by any seeded or submitted mandates.
2. Register a citizen account from `/auth/register`, or submit anonymously.
3. Open **Submit a concern** and post a new informal report. The API generates a tracking code and either joins an existing Community Mandate or creates a new one (mock AI by default).
4. Open **My submissions** to see your recent tracking codes (requires signing in).
5. Browse `/mandates` to filter by scope, county, constituency, ward, category, and urgency.
6. Visit `/tracking` and paste a tracking code to see anonymous status updates.
7. Open `/institution`, enter the institution key from your `.env`, then acknowledge or update one of the mandates.

## Using real OpenAI

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5   # or another chat-completions model
```

Both processing (`processSubmissionWithAi`) and clustering (`matchSubmissionToMandate`) call the OpenAI API with strict JSON Schema responses. The original submission text is always preserved separately from AI-generated summaries, and every AI-produced field is marked `generated: true`.

## Tests

```bash
npm run test --workspace @sautiledger/api          # unit tests (mock AI, no DB)
INTEGRATION=1 npm run test --workspace @sautiledger/api  # adds register→submit→track integration tests (uses the SQLite file DB)
```

## Privacy Notes

- Submissions never expose raw names, phone numbers, exact GPS, or identifiers on public surfaces.
- Phone numbers are normalized to Kenyan E.164 and stored only as a salted SHA-256 hash (`SUBMISSION_HASH_SALT`).
- Public dashboards show aggregated Community Mandates, not individual submissions.
- AI-generated summaries are stored separately from the original submission text and flagged as generated.
