# SautiLedger Project Brief

## 1. Project Name

**SautiLedger**  
Domain: **sautiledger.org**

### Tagline Options

- **Public participation with receipts.**
- **Turning community voice into civic evidence.**
- **Anonymous voices. Verified priorities. Accountable power.**
- **From scattered grievances to undeniable mandates.**

### Preferred Short Description

**SautiLedger is a PeaceTech platform that helps communities safely transform informal concerns into anonymized, structured, and verifiable civic mandates that institutions can track, acknowledge, and resolve.**

---

## 1a. Implementation Status (May 2026)

This brief was written before the build started. The MVP has now shipped its core demo path. The sections below are kept for product context, but the **current implementation** differs from the original sketch in a few important ways:

- **Database is SQLite**, not PostgreSQL. The DB lives at `apps/api/data/sautiledger.db` and the schema is auto-created by TypeORM `synchronize: true` (no migrations directory yet). Postgres is the planned next step once the schema stabilizes.
- **No `Authority` entity.** Every submission and mandate carries a `scopeLevel` (`national | county | constituency | ward`). The responsible office (e.g. "Nairobi County Government", "Westlands Ward Administration") is derived from `scopeLevel` + the citizen's location via `responsibleOffice(...)` in `@sautiledger/shared`.
- **No `Location` or `IssueCategory` tables.** Categories are an enum constant (`MANDATE_CATEGORIES`); Kenyan counties / constituencies / wards are static data (`KENYA_COUNTIES`) used by cascading dropdowns on the submit and mandates pages.
- **Citizen accounts** (phone + bcrypt password → JWT) are implemented for tracking-code recovery, "My submissions", and **upvoting** mandates. Anonymous submissions still work without an account.
- **Institution console** is gated by a shared `INSTITUTION_DEMO_KEY` header (demo-grade), not full RBAC.
- **AI** runs behind a single typed service interface with two providers selected via `AI_PROVIDER`: `mock` (deterministic keyword rules, default) and `openai` (Chat Completions with strict JSON schema).
- **Mandates page** has cascading scope filters and an in-page Recharts stats panel (category / urgency / status / top wards / most upvoted) that re-aggregates to the active filter slice.
- **Kubernetes manifests** are not yet committed. The deployable unit today is the single container produced by the root `Dockerfile` / `docker-compose.yml`.
- **Not yet shipped:** evidence uploads, audit-hash entity, moderation queue UI, mandate export (Markdown/PDF), Responsiveness Index dashboards, real institution accounts.

The sections below describe the long-term product vision. Where they conflict with this status note, the status note wins.

---

## 2. Capstone Theme Alignment

The capstone theme is **PeaceTech**, with a focus on people-centric technology that helps communities live more peacefully. SautiLedger aligns strongly with the theme because it addresses one of the root causes of civic tension: communities feeling unheard, ignored, or excluded from decision-making.

Public frustration often builds when people raise concerns repeatedly but see no meaningful response. This can lead to distrust, disengagement, protests, conflict, or exploitation by political actors. SautiLedger creates a peaceful mechanism for communities to organize their voice, document their priorities, and hold institutions accountable without exposing individual participants to unnecessary risk.

### Primary Track: Voice & Accountability

SautiLedger strengthens civic participation by converting scattered community feedback into structured public mandates. It helps bridge the gap between citizens and the institutions responsible for serving them.

### Secondary Track: Peace & Community

The platform can act as an early-warning layer for unresolved grievances, especially around issues such as water access, land disputes, public services, policing, aid distribution, and local resource allocation. By surfacing rising concerns early, SautiLedger helps communities pursue peaceful escalation before issues become flashpoints.

### Supporting Track: Dignity & Opportunity

SautiLedger can also help marginalized groups surface issues related to livelihoods, access to services, displacement, resource exploitation, and exclusion from economic opportunities.

---

## 3. Problem Statement

In Kenya, public participation is a constitutional and civic ideal, but in practice it is often treated as a box-ticking exercise. Communities raise concerns in barazas, WhatsApp groups, SMS threads, local radio discussions, protests, civil society meetings, and informal conversations. However, these concerns often remain fragmented and informal.

Because community feedback is not always structured, traceable, or formally presented, leaders and institutions can dismiss it as anecdotal, disorganized, politically motivated, or never officially received.

This creates an **accountability gap** between citizens and the institutions meant to serve them.

Common challenges include:

- Citizens may not know how to express concerns in formal civic or legal language.
- Feedback may be scattered across informal channels.
- Institutions may ignore concerns because there is no organized evidence.
- Marginalized communities may fear retaliation if they speak openly.
- Public participation records may not reflect what communities actually said.
- Citizens often cannot track whether leaders acknowledged or acted on their concerns.
- Grievances may escalate into conflict when communities feel ignored.

SautiLedger addresses this by turning informal community voice into structured, anonymized, and verifiable civic evidence.

---

## 4. Solution Overview

**SautiLedger** is a low-bandwidth civic accountability platform designed to convert raw community feedback into organized public mandates.

Citizens can submit concerns through simple channels such as a lightweight web form, SMS-style input, USSD-style flow, or voice-note transcription. The platform then uses AI to translate, classify, summarize, deduplicate, and formalize these submissions.

Instead of exposing individual complainants, SautiLedger groups submissions into anonymized issue clusters called **Community Mandates**.

A Community Mandate represents a recurring community priority, such as:

> Residents of a ward are reporting prolonged water shortages caused by a non-functional borehole and lack of clear communication from the responsible county office.

Each mandate can include:

- Issue category
- Location scope
- Number of related submissions
- Urgency level
- Responsible authority
- AI-generated formal summary
- Public status
- Evidence strength
- Institution response
- Timeline of updates

The result is a public accountability layer that makes it harder for institutions to ignore community priorities.

---

## 5. Core Product Promise

SautiLedger turns this:

> “People are complaining about water.”

Into this:

> “2,418 anonymized residents across 12 locations submitted water-related concerns over 21 days. Reports consistently mention dry taps, broken boreholes, long walking distances, and lack of county response. The responsible authority has not yet acknowledged the issue.”

The platform does not replace government, civil society, journalism, or community organizing. Instead, it gives these actors a shared evidence layer for peaceful civic accountability.

---

## 6. MVP Scope

For the MVP, SautiLedger will focus on **Kenya** to keep the scope practical, locally grounded, and easy to demonstrate.

Kenya is a strong initial context because:

- Public participation is already a recognized governance requirement.
- County and national responsibilities can be modeled clearly.
- There are familiar civic units such as county, constituency, sub-county, ward, and polling area.
- Common service delivery concerns are easy to demonstrate, such as water, roads, health, education, sanitation, land, and security.
- Swahili, English, and Sheng provide a useful multilingual starting point.

The MVP should not attempt to support every jurisdiction immediately. Instead, it should be designed so the underlying model can later be adapted to other countries or contexts.

### MVP Geographic Scope

Initial supported context:

- Country: Kenya
- Levels: National, County, Constituency, Ward
- Example responsibilities:
  - County: water, local roads, sanitation, health facilities, markets
  - National: security, IDs, national roads, police, immigration, national education policy
  - Constituency/NG-CDF: school infrastructure and local development projects
  - Ward/MCA: ward-level representation and county assembly escalation

### MVP Language Scope

Initial supported languages/input styles:

- English
- Swahili
- Sheng / mixed informal language

Future expansion can add:

- Arabic
- French
- Portuguese
- Somali
- Amharic
- Hausa
- Yoruba
- Lingala
- Local Kenyan languages
- Refugee-community languages

---

## 7. MVP User Personas

### 1. Citizen / Community Member

A resident who wants to report a problem safely and simply without needing to understand formal civic processes.

Needs:

- Low-bandwidth access
- Simple submission process
- Anonymous or pseudonymous participation
- Ability to use informal language
- Confidence that their concern contributes to something visible

### 2. Community Organizer / Civil Society Actor

A person or organization helping collect and organize community concerns.

Needs:

- Ability to submit many concerns from field engagements
- Offline-friendly collection flow
- Exportable reports
- Mandate summaries
- Evidence strength indicators

### 3. Journalist / Researcher

A person investigating public interest issues.

Needs:

- Aggregated public trends
- Issue timelines
- Regional comparisons
- Evidence summaries
- Public response records

### 4. Public Institution / Leader / Office

A government office, elected leader, or public agency that needs to view, acknowledge, and respond to community priorities.

Needs:

- Clear issue routing
- Ability to acknowledge and update mandates
- Public response mechanism
- Resolution tracking
- Fair measurement of responsiveness

### 5. Admin / Platform Moderator

A trusted operator who manages issue categories, reviews flagged content, and ensures platform integrity.

Needs:

- Moderation tools
- Abuse detection
- Duplicate review
- Category management
- Authority mapping
- Mandate quality review

---

## 8. Core MVP Features

### 8.1 Low-Bandwidth Submission Flow

A simple submission interface that mimics the constraints of SMS or USSD.

MVP implementation:

- Lightweight web form
- Mobile-first design
- Minimal JavaScript payload where possible
- Plain language instructions
- Optional language selection
- Location selection using county, constituency, and ward
- Free-text concern submission
- Optional issue category
- Anonymous tracking code after submission

Example submission:

> “Huku maji imekuwa shida for weeks. Borehole iko dead na chief anasema tu ngoja.”

### 8.2 AI-Powered Mandate Builder

The backend uses OpenAI APIs to process informal submissions.

AI processing tasks:

- Detect language or mixed-language input
- Translate to English where useful
- Preserve original text
- Classify issue category
- Detect urgency
- Identify likely responsible authority
- Generate a formal civic summary
- Suggest a possible community mandate
- Detect whether the submission is similar to existing mandate clusters

Example structured output:

```json
{
  "issue_category": "Water Access",
  "urgency": "High",
  "responsible_level": "County Government",
  "responsible_office": "County Water Department",
  "summary": "Residents report a prolonged water shortage caused by a non-functional borehole and lack of clear response from local administration.",
  "recommended_mandate": "Residents request urgent repair of the non-functional borehole and a public communication timeline from the responsible county water office."
}
```

### 8.3 Community Mandate Clustering

Related submissions are grouped into Community Mandates.

A mandate cluster should include:

- Title
- Summary
- Issue category
- Location scope
- Submission count
- First reported date
- Latest activity date
- Urgency level
- Responsible authority
- Status
- Evidence strength

Example mandate:

> **Urgent repair of non-functional borehole in Ward X**  
> Residents report persistent water shortages, long walking distances, and lack of response from local administration.

### 8.4 Anonymous Submission Integrity

The MVP should protect user identity while preventing obvious abuse.

Possible approach:

- Do not expose user identity publicly.
- Store original submitter contact only if necessary for testing, or avoid storing it completely.
- Hash phone number or user identifier when available.
- Use a salt for hashing.
- Store coarse location rather than precise GPS.
- Generate anonymous tracking code.
- Log submission hash to prove the submission existed without revealing the person.

Important note:

For the MVP, this is a proof of concept, not a complete security system. The pitch should be honest: SautiLedger demonstrates a privacy-first approach, but production use would require a full security audit, threat modeling, and careful deployment practices.

### 8.5 Public Mandate Dashboard

A public dashboard displays aggregated community priorities.

Dashboard views:

- Top mandates by submission count
- Top mandates by urgency
- Mandates by county or ward
- Mandates by category
- Mandates by responsible authority
- Status breakdown
- Trends over time
- Institution response status

Mandate statuses:

- New
- Under Review
- Acknowledged
- In Progress
- Resolved
- Disputed
- Escalated

### 8.6 Institution Response Portal

Public offices or responsible actors can respond to mandates.

MVP features:

- View mandates assigned to an authority
- Acknowledge a mandate
- Add public response
- Mark status as in progress or resolved
- Provide resolution note
- Add expected timeline

This is important because SautiLedger should not only accuse institutions. It should create a structured loop between communities and institutions.

### 8.7 Responsiveness Index

The Responsiveness Index measures how institutions respond to community mandates.

Instead of ranking leaders by how many complaints exist in their area, the score should focus on response behavior.

Possible factors:

- Percentage of mandates acknowledged
- Average response time
- Percentage resolved
- Number of high-urgency issues ignored
- Quality or completeness of response
- Repeated unresolved mandates

This avoids punishing leaders simply because their areas have many problems. It measures whether responsible actors respond.

### 8.8 Mandate Export

Users should be able to export a Community Mandate as:

- PDF report
- Markdown summary
- Civic petition draft
- CSV data export
- Public share link

For the MVP, a simple PDF or Markdown export is enough.

---

## 9. Additional Enhancements

These enhancements are useful but should be treated as stretch goals unless time allows.

### 9.1 Conflict Early-Warning Signals

SautiLedger can detect when certain issues are rising quickly or include language that suggests possible escalation.

Examples:

- Water disputes
- Land conflict
- Aid exclusion
- Ethnic tension
- Police harassment
- Election intimidation
- Resource exploitation
- Displacement-related grievances

An early warning card could show:

> Water-related grievances in Area X increased by 240% this week and include repeated mentions of protests, road blockage, and conflict with neighboring communities.

### 9.2 Mandate-to-Petition Generator

The platform can generate a formal petition or public participation memo from a mandate cluster.

Generated documents could include:

- Petition title
- Background
- Community concern
- Evidence summary
- Responsible authority
- Requested action
- Timeline requested
- Signature or endorsement section

### 9.3 Offline Collector Mode

A community organizer can collect submissions offline during a baraza, IDP camp visit, local meeting, or field visit. The data syncs when internet access returns.

MVP version:

- PWA-style form
- Local browser storage
- Manual sync button
- Sync status indicator

### 9.4 Evidence Uploads

Users may optionally upload evidence such as photos, audio, or documents.

Safety considerations:

- Strip image metadata
- Warn users not to upload identifying faces unless necessary
- Blur sensitive content in future versions
- Store evidence separately from identity data

### 9.5 Trust and Verification Score

Each mandate can have an evidence strength indicator based on:

- Number of submissions
- Location diversity
- Consistency of reports
- Duplicate risk
- Validator review
- Supporting evidence
- Institution response

Example:

```text
Evidence Strength: High
Submission Diversity: Medium
Duplicate Risk: Low
Validator Reviewed: Yes
Institution Response: None
```

### 9.6 Responsible Authority Routing

A key feature is helping citizens understand who is responsible.

Examples:

- Water supply issue → County Government / County Water Department
- Local market sanitation → County Government
- National ID delays → National Government
- Police abuse → National Police Service / oversight body
- School infrastructure → NG-CDF or relevant education authority, depending on context
- County health facility medicine shortage → County Department of Health

This can start as a rules table and later become more sophisticated.

### 9.7 Public Right of Reply

Institutions should be able to respond publicly.

Response types:

- Acknowledgement
- Request for more information
- Action timeline
- Progress update
- Resolution report
- Dispute with explanation

This makes the platform more balanced and peace-oriented.

---

## 10. Technology Stack

> Status note: this section describes the long-term target. The current MVP implementation is summarized in **§1a. Implementation Status (May 2026)**. The biggest deltas are SQLite instead of PostgreSQL, no `Authority` entity, and no Kubernetes manifests yet.

### Frontend

- **Vite**
- **React 18**
- **TypeScript**
- **Tailwind CSS** with a small in-repo shadcn-style component set (`apps/web/src/components/ui.tsx`)
- **lucide-react**
- **Recharts**
- **react-router-dom 6**
- Mobile-first responsive UI
- Optional PWA support for offline collection (future)

Frontend pages currently shipped:

- Public landing dashboard (`/`)
- Submit a concern (`/submit`)
- Mandates list with cascading scope filters and in-page stats (`/mandates`)
- Mandate detail with timeline and upvote (`/mandates/:id`)
- Anonymous tracking lookup (`/tracking`)
- Citizen "My submissions" (`/me`)
- Citizen sign in / register (`/auth/...`)
- Institution console gated by shared key (`/institution`)

### Backend

- **Express.js 4**
- **TypeScript**
- REST API under `/api`
- **TypeORM 0.3.x**
- **Zod** for request validation
- **jsonwebtoken** for citizen sessions; **bcrypt** for password hashing
- AI processing service layer with `mock` + `openai` providers
- Mandate clustering service
- Privacy / hashing service
- Citizen authentication middleware + shared-key institution middleware

### Database

- **SQLite** (`better-sqlite3`) for the MVP, with TypeORM `synchronize: true`. File path is configurable via `DATABASE_PATH` (default `apps/api/data/sautiledger.db`).
- **PostgreSQL** is the planned production target once the schema stabilizes. Entities are written to be portable.

Key database entities (current):

- `Submission`
- `Mandate` (the "mandate cluster" from the brief)
- `InstitutionResponse`
- `StatusHistory`
- `Citizen`
- `MandateUpvote`

Intentionally **not** in the schema today (data lives in `@sautiledger/shared` instead):

- Issue categories (enum)
- Kenyan administrative boundaries (static data)
- Authorities / responsible offices (derived from `scopeLevel` + location)

Aspirational entities (Phase 4+):

- Evidence Attachments
- Audit Hashes
- Authority / Institution Accounts (real RBAC)
- Moderator / Admin Users

### AI Layer

- **OpenAI API**

Use cases:

- Language detection
- Translation
- Issue classification
- Urgency detection
- Summary generation
- Formal mandate generation
- Responsible authority suggestion
- Duplicate/similarity support

### Optional AI/Search Enhancements

- Embeddings for semantic clustering
- pgvector extension in PostgreSQL
- Background jobs for re-clustering
- Moderation checks for abuse, threats, or personally identifying information

### Authentication

For MVP (current):

- **Citizen accounts**: phone + bcrypt password → JWT bearer token signed with `SESSION_SECRET`. Used for tracking-code recovery, "My submissions", and upvoting.
- **Institution console**: shared `INSTITUTION_DEMO_KEY` sent as `X-Institution-Key`. Demo-grade only.
- Public submission and tracking-code lookup remain anonymous and require no account.

Future:

- Per-institution accounts and full role-based access control (`institution`, `admin`, `moderator`).
- Magic link login.
- Multi-factor authentication.
- Stronger identity verification for official institutions.

### Deployment

Current (MVP):

- Single container built by the root `Dockerfile`. `docker compose up --build` serves both the API and the built React app from Express on port `3000`.
- SQLite file persisted in a mounted volume at `/app/data` inside the container.

Future:

- Migrate persistence to managed PostgreSQL.
- Add Kubernetes manifests (deployment, service, ingress, config, secrets).
- Domain: **sautiledger.org**

---

## 11. Suggested High-Level Architecture

```text
Citizen / Organizer
        |
        v
Submission Interface
(Web form today; SMS/USSD/voice planned)
        |
        v
Express API (single container; serves built React frontend in production-like runs)
        |
        +--> Privacy & Hashing Service
        |
        +--> AI Processing Service (mock | openai, selected by AI_PROVIDER)
        |       - language detection
        |       - normalization / translation
        |       - classification + urgency
        |       - mandate text generation
        |
        +--> Mandate Clustering Service
        |       - match submission to existing mandate (LLM-assisted)
        |       - create new mandate if no match
        |
        +--> Citizen Auth (JWT) + Institution shared-key middleware
        |
        v
SQLite (apps/api/data/sautiledger.db)
        |
        v
Public Dashboard / Mandates Page (with filter-aware stats) / Mandate Detail / Tracking / Institution Console
```

---

## 12. Suggested Data Model

> Status note: this section is the original sketch. See **§1a** and `docs/ai/domain-model.md` for the entities that actually exist in code today. The shipped schema is intentionally smaller — no `authorities`, `issue_categories`, or `locations` tables (those live in `@sautiledger/shared`).

### submissions

Stores individual raw submissions.

Fields:

- id
- anonymous_tracking_code
- submitter_hash
- original_text
- normalized_text
- detected_language
- country, county, constituency, ward (string columns; no `Location` table)
- category (enum string)
- urgency
- scope_level (`national | county | constituency | ward`)
- mandate_id
- submission_hash
- ai_processing_result (JSON)
- processing_status
- created_at, updated_at

### mandates (community mandates)

Stores grouped community mandates. Implemented as the `Mandate` entity.

Fields:

- id
- title
- summary
- formal_mandate_text
- category (enum string)
- scope_level
- country, county, constituency, ward
- responsible_office (cached display string; can be re-derived)
- urgency
- status
- submission_count
- evidence_strength
- upvote_count
- first_reported_at
- last_activity_at
- created_at, updated_at

### institution_responses

Stores public responses from institutions.

Fields:

- id
- mandate_id
- response_text
- status_update (optional new mandate status)
- expected_resolution_date
- created_at

### status_history

Stores the timeline of mandate updates.

Fields:

- id
- mandate_id
- old_status
- new_status
- note
- created_at

### citizens

Registered citizen accounts (used for tracking-code recovery, "My submissions", and upvoting).

Fields:

- id
- phone_e164
- phone_hash (salted SHA-256 of phone using `SUBMISSION_HASH_SALT`)
- password_hash (bcrypt)
- display_name (optional, never shown publicly)
- created_at, updated_at

### mandate_upvotes

Unique on `(mandate_id, citizen_id)`. `mandates.upvote_count` is kept in sync as votes toggle.

Fields:

- id
- mandate_id
- citizen_id
- created_at

### Issue categories (no DB table)

Live in `@sautiledger/shared` as the `MANDATE_CATEGORIES` constant:

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

### Locations (no DB table)

Kenyan counties → constituencies → wards live as static data in `@sautiledger/shared` (`KENYA_COUNTIES`), with helpers `findCounty(name)` and `findConstituency(county, constituency)` driving the cascading dropdowns on the submit and mandates pages.

### Aspirational tables (Phase 4+)

Not yet implemented:

- `evidence_attachments`
- `audit_hashes`
- `authorities` / institution accounts (real RBAC)
- `users` (admin / moderator roles)

---

## 13. Privacy and Safety Considerations

SautiLedger operates in contexts where participation can expose people to risk. Privacy and safety must therefore be treated as core product features, not optional add-ons.

MVP privacy principles:

- Do not publicly expose individual submissions by default.
- Show aggregated data instead of raw personal reports.
- Use anonymous tracking codes.
- Hash identifiers where identifiers are necessary.
- Store coarse location rather than exact GPS.
- Allow users to submit without names.
- Avoid collecting unnecessary personal information.
- Add warnings before users submit sensitive details.
- Separate identity-related data from grievance content where possible.

Production considerations:

- Security audit
- Threat modeling
- Encryption at rest
- Stronger access controls
- Abuse prevention
- Metadata stripping
- Human rights impact review
- Data retention policies
- Clear consent and privacy notices

---

## 14. Demo Flow

A strong hackathon demo can follow this story:

### Step 1: Citizen submits informal concern

A resident submits:

> “Huku maji imekuwa shida for weeks. Borehole iko dead na chief anasema tu ngoja.”

### Step 2: AI processes submission

SautiLedger detects mixed Swahili/Sheng, classifies the issue as water access, marks urgency as high, and identifies the likely responsible authority as the county water department.

### Step 3: Mandate is generated

The system generates:

> Residents request urgent repair of the non-functional borehole and a public communication timeline from the responsible county water office.

### Step 4: Similar submissions are clustered

Several related submissions are grouped into one Community Mandate.

### Step 5: Public dashboard updates

The mandate appears on the public dashboard with:

- Issue: Water access
- Location: Ward X
- Submission count: 127
- Urgency: High
- Responsible authority: County Water Department
- Status: New

### Step 6: Institution responds

A county official logs in and marks the issue as acknowledged, then adds a public response with a repair timeline.

### Step 7: Responsiveness Index updates

The dashboard reflects that the institution acknowledged the issue, improving its response score.

---

## 15. MVP Success Criteria

The MVP is successful if it demonstrates that SautiLedger can:

- Accept informal community feedback.
- Process multilingual or mixed-language input.
- Convert informal concerns into formal mandates.
- Cluster similar submissions.
- Protect individual identity in the public view.
- Display community priorities on a dashboard.
- Route issues to likely responsible authorities.
- Allow institutions to respond.
- Track acknowledgement and resolution status.

The MVP does not need to be production-ready. It needs to prove the core concept is viable and worth pursuing.

---

## 16. Future Expansion Beyond Kenya

Although the MVP focuses on Kenya, SautiLedger should be designed to expand to other jurisdictions.

### Expansion Requirements

To support other countries or regions, the platform should eventually make the following configurable:

- Administrative boundaries
- Government responsibility mappings
- Supported languages
- Institution types
- Issue categories
- Civic process templates
- Petition formats
- Data protection requirements
- Risk and safety settings

### Future Regional Use Cases

Possible expansion contexts:

- Refugee settlements
- Cross-border communities
- IDP camps
- Informal settlements
- Counties or municipalities
- Civil society monitoring programs
- Participatory budgeting programs
- Resource governance initiatives
- Election-period early warning projects

### Jurisdiction-Agnostic Design Principle

The core SautiLedger model should remain the same:

```text
Raw community voice
        -> structured issue
        -> anonymized mandate
        -> responsible authority
        -> public response tracking
        -> accountability record
```

Only the local configuration should change.

---

## 17. Suggested Build Phases

> Status note: as of May 2026, **Phases 1–3 are shipped**, Phase 4 is partial (hashing + tracking codes done; rate limiting, moderation queue, and audit hashes pending), and Phase 5 is partial (seed data + Recharts done; export and Kubernetes pending). See `docs/ai/implementation-plan.md` for the up-to-date phase status.

### Phase 1: Core Submission and AI Processing — **shipped**

- Frontend submission form with cascading Kenya geography dropdowns.
- Express API persisting submissions via TypeORM.
- Mock AI processor (default) + OpenAI processor behind `AI_PROVIDER`.
- Structured AI output stored alongside the original text.
- Anonymous tracking codes returned to the citizen.

### Phase 2: Mandate Clustering and Dashboard — **shipped**

- `matchSubmissionToMandate` clusters similar submissions into a Community Mandate.
- Public dashboard with category / urgency / status / scope / county breakdowns and a 30-day trend.
- Mandates list page with cascading scope filters and an in-page Recharts stats panel that re-aggregates to the active slice.
- Mandate detail page with timeline.

### Phase 3: Institution Portal — **shipped (demo-grade)**

- Institution console gated by shared `INSTITUTION_DEMO_KEY`.
- Acknowledge / update status / post public response.
- Status history timeline visible on the public mandate page.
- Citizen upvotes on mandates.

### Phase 4: Privacy and Integrity Enhancements — **partial**

Shipped:

- Salted SHA-256 hashing of phone numbers (`SUBMISSION_HASH_SALT`).
- Anonymous tracking codes for every submission.
- Aggregate-only public surfaces (no raw submissions exposed).

Pending:

- Rate limiting and abuse checks.
- Moderation queue for risky/sensitive content.
- Audit-hash entity for tamper-evident proof of submission existence.
- Real institution accounts and RBAC (replacing the shared key).

### Phase 5: Demo Polish — **partial**

Shipped:

- Kenya seed data (`npm run seed:demo --workspace @sautiledger/api`): 3 demo citizens + 3 demo mandates.
- Dashboard + mandates-page Recharts panels.
- Single-container Docker build.

Pending:

- Mandate export (Markdown / PDF).
- Responsiveness Index dashboards.
- Demo script document.
- Kubernetes manifests.

---

## 18. Risks and Mitigations

### Risk: Retaliation against participants

Mitigation:

- Anonymous submissions
- Aggregated public display
- No public personal data
- Coarse location handling
- Privacy warnings

### Risk: False or coordinated submissions

Mitigation:

- Duplicate detection
- Submitter hashing
- Rate limiting
- Evidence strength scoring
- Moderator review

### Risk: AI misclassification

Mitigation:

- Human review for sensitive mandates
- Transparent AI-generated labels
- Editable mandate summaries
- Confidence scores

### Risk: Political misuse

Mitigation:

- Public response right-of-reply
- Evidence confidence indicators
- Nonpartisan language
- Focus on institutions and issues, not political attacks

### Risk: Scope creep

Mitigation:

- Kenya-only MVP
- Limited issue categories
- Web-based demo before real SMS/USSD integration
- Simulated low-bandwidth channel for hackathon

---

## 19. One-Sentence Pitch

**SautiLedger turns informal community concerns into anonymized, verifiable civic mandates that institutions can acknowledge, track, and resolve.**

---

## 20. Thirty-Second Pitch

**SautiLedger is a PeaceTech platform for public participation with receipts. In Kenya and across many African communities, people raise urgent concerns through informal channels, but those concerns are often dismissed as scattered or unofficial. SautiLedger lets citizens submit concerns safely through low-bandwidth channels, then uses AI to translate, classify, cluster, and convert them into formal Community Mandates. Each mandate is anonymized, mapped to the responsible authority, displayed on a public dashboard, and tracked until institutions acknowledge or resolve it. The goal is to help communities be heard before frustration becomes conflict.**

---

## 21. Two-Minute Pitch

Across Kenya, public participation is often treated as a formality. Communities speak through barazas, WhatsApp groups, local meetings, SMS threads, and protests, but their concerns rarely become structured civic evidence. This allows institutions to dismiss real grievances as informal, disorganized, or never officially received.

SautiLedger closes that gap.

It is a low-bandwidth PeaceTech platform that turns raw community feedback into anonymized, verifiable Community Mandates. A resident can submit a concern in English, Swahili, Sheng, or mixed informal language. The platform uses AI to translate, classify, summarize, identify urgency, and map the concern to the likely responsible authority. Similar submissions are clustered together so that individual voices become a collective public record.

On the public dashboard, communities can see their top priorities, where issues are escalating, which institution is responsible, and whether that institution has acknowledged or acted. Institutions get a right of reply, allowing them to respond, update progress, or mark issues as resolved.

For the MVP, we are focusing on Kenya to keep the scope grounded. But the architecture is designed to expand to other jurisdictions by changing administrative boundaries, languages, responsibility mappings, and civic templates.

SautiLedger is not just a complaint box. It is public participation with receipts: a safer, structured way for communities to turn voice into accountability before unresolved grievances become conflict.

