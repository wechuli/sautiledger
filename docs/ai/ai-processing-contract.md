# AI Processing Contract

This document defines how SautiLedger should transform raw informal submissions into structured civic data.

## Implementation today

The API exposes a single typed entry point — `processSubmissionWithAi(input)` in `apps/api/src/services/ai-processing.ts` — backed by two providers selected via `AI_PROVIDER`:

- `mock` (default) — a deterministic keyword-based processor used for local development, tests, and the demo. Covered by `ai-processing.test.ts`.
- `openai` — calls the OpenAI Chat Completions API with a strict JSON-schema response format and low temperature (`apps/api/src/services/ai-processing.openai.ts`). Requires `OPENAI_API_KEY` and `OPENAI_MODEL`.

Clustering uses the same split: `matchSubmissionToMandate(...)` in `mandate-clustering.ts` calls the configured provider to decide whether a new submission belongs to an existing Community Mandate.

Both providers must return the same JSON shape described below. The original submission text is always preserved separately from AI-generated fields.

## Input

```json
{
  "submission_id": "sub_123",
  "original_text": "Huku maji imekuwa shida for weeks. Borehole iko dead na chief anasema tu ngoja.",
  "declared_language": null,
  "location": {
    "country": "Kenya",
    "county": "Example County",
    "constituency": "Example Constituency",
    "ward": "Example Ward"
  },
  "optional_category": null
}
```

## Required Output

AI processors should return typed JSON that can be validated before storage.

```json
{
  "detected_language": "Swahili/Sheng/English mixed",
  "normalized_text": "Residents report that water has been a problem for weeks. The borehole is not working and the local administrator has only asked them to wait.",
  "issue_category": "Water",
  "issue_category_confidence": 0.94,
  "urgency": "High",
  "urgency_confidence": 0.82,
  "responsible_level": "County",
  "responsible_office": "County Water Department",
  "responsible_authority_confidence": 0.76,
  "summary": "Residents report a prolonged water shortage caused by a non-functional borehole and lack of clear response from local administration.",
  "recommended_mandate": "Residents request urgent repair of the non-functional borehole and a public communication timeline from the responsible county water office.",
  "safety_flags": [],
  "moderation_recommendation": "publish_after_review",
  "possible_duplicate_signals": [
    "non-functional borehole",
    "water shortage",
    "lack of response"
  ]
}
```

## Allowed Urgency Values

- `Low`
- `Medium`
- `High`
- `Critical`

Use `Critical` sparingly for immediate safety risks, active violence, urgent medical risk, or rapidly escalating conflict.

## Moderation Recommendations

- `publish`
- `publish_after_review`
- `hold_for_review`
- `reject`

Use `hold_for_review` when a submission includes personally identifying details, accusations against named private individuals, threats, sensitive evidence, or possible incitement.

## Safety Flags

Examples:

- `contains_personal_data`
- `contains_exact_location`
- `mentions_child`
- `mentions_threat`
- `mentions_violence`
- `names_private_person`
- `sensitive_evidence`
- `possible_incitement`
- `possible_spam`

## Prompting Guidance

The AI processor should:

- Preserve meaning across English, Swahili, Sheng, and mixed informal language.
- Avoid adding facts not present in the submission.
- Avoid naming a responsible authority as certain unless supported by routing rules.
- Mark responsibility as inferred when based on category and location only.
- Produce calm, formal civic language.
- Avoid partisan or inflammatory framing.
- Recommend review when the text is sensitive or uncertain.

## Mock Processor Guidance

The deterministic mock processor (default for local/demo) uses keyword/rule matching and returns the same shape as the OpenAI provider so callers do not need to branch.

Minimum mock categories:

- Water: `maji`, `water`, `borehole`, `tap`, `dry`
- Roads: `road`, `barabara`, `bridge`, `mud`, `impassable`
- Health: `hospital`, `clinic`, `dispensary`, `medicine`, `dawa`
- Education: `school`, `classroom`, `teacher`, `desk`
- Security: `police`, `theft`, `harassment`, `unsafe`
- Sanitation: `waste`, `garbage`, `sewer`, `choo`, `toilet`

The mock processor is the source of truth for tests; if the OpenAI provider drifts from the contract, the mock contract wins.
