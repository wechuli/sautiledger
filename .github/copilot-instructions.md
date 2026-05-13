# GitHub Copilot Instructions for SautiLedger

SautiLedger is a Kenya-first PeaceTech MVP that turns informal community concerns into anonymized Community Mandates with public response tracking.

Use `docs/sautiledger_project_brief.md` as the source of truth for product intent. Use `AGENTS.md` and `docs/ai/*` for implementation context.

## Coding Priorities

- Prefer TypeScript throughout the app.
- Keep domain names consistent: Submission, Community Mandate, Authority, Institution Response, Responsiveness Index, Evidence Strength.
- Build mobile-first, low-bandwidth interfaces.
- Use shadcn/ui for frontend components.
- Use lucide-react for icons.
- Use Recharts for dashboard charts and analytics visualizations.
- Make the dashboard graph-rich, polished, and easy to scan.
- Use TypeORM entities, repositories, and migrations for PostgreSQL persistence.
- Express should serve the built React frontend and expose API routes under `/api`.
- Docker Compose is the local app + PostgreSQL runtime; Kubernetes is the deployment target.
- Keep privacy and safety behavior explicit in code.
- Keep AI integration behind service functions with typed, validated inputs and outputs.
- Use mock AI processors for local/demo flows until real OpenAI configuration exists.
- Make Kenya-specific civic data configurable rather than hard-coded deep inside components.

## Privacy Rules

- Do not expose raw individual submissions in public dashboards by default.
- Do not display names, phone numbers, exact GPS data, or raw identifiers publicly.
- Hash identifiers using a server-side salt when identifiers must be stored.
- Use aggregate mandate summaries for public views.
- Include review/moderation states for sensitive AI-generated output.

## UI Tone

- Calm, civic, trustworthy, and practical.
- Avoid partisan language and sensational labels.
- Prioritize dashboard clarity and submission simplicity over marketing polish.

## Useful Fixtures

Use realistic examples such as:

- `Huku maji imekuwa shida for weeks. Borehole iko dead na chief anasema tu ngoja.`
- `The dispensary has had no medicine for two months.`
- `Barabara ya ward yetu imeharibika na magari ya wagonjwa yanakwama.`
