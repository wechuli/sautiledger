import OpenAI from "openai";
import { z } from "zod";
import {
  MANDATE_CATEGORIES,
  MODERATION_RECOMMENDATIONS,
  SAFETY_FLAGS,
  SCOPE_LEVELS,
  URGENCY_LEVELS,
  responsibleOffice,
  type AiProcessingResult,
  type MandateMatchDecision,
} from "@sautiledger/shared";
import { env } from "../config/env.js";
import type { MatchInput, ProcessInput } from "./ai-processing.js";

// ---------------------------------------------------------------------
// Strict Zod schema mirrored as JSON Schema for OpenAI structured outputs.
// The citizen declares the scope on submit, so we DO NOT ask the model to
// reroute: we tell it the scope and only ask it to draft civic content.
// ---------------------------------------------------------------------

const aiResultSchema = z.object({
  detected_language: z.string(),
  normalized_text: z.string(),
  issue_category: z.enum(MANDATE_CATEGORIES),
  issue_category_confidence: z.number().min(0).max(1),
  urgency: z.enum(URGENCY_LEVELS),
  urgency_confidence: z.number().min(0).max(1),
  summary: z.string(),
  recommended_mandate: z.object({
    title: z.string(),
    body: z.string(),
  }),
  safety_flags: z.array(z.enum(SAFETY_FLAGS)),
  moderation_recommendation: z.enum(MODERATION_RECOMMENDATIONS),
  possible_duplicate_signals: z.array(z.string()),
});

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "detected_language",
    "normalized_text",
    "issue_category",
    "issue_category_confidence",
    "urgency",
    "urgency_confidence",
    "summary",
    "recommended_mandate",
    "safety_flags",
    "moderation_recommendation",
    "possible_duplicate_signals",
  ],
  properties: {
    detected_language: { type: "string" },
    normalized_text: { type: "string" },
    issue_category: { type: "string", enum: [...MANDATE_CATEGORIES] },
    issue_category_confidence: { type: "number", minimum: 0, maximum: 1 },
    urgency: { type: "string", enum: [...URGENCY_LEVELS] },
    urgency_confidence: { type: "number", minimum: 0, maximum: 1 },
    summary: { type: "string" },
    recommended_mandate: {
      type: "object",
      additionalProperties: false,
      required: ["title", "body"],
      properties: {
        title: { type: "string" },
        body: { type: "string" },
      },
    },
    safety_flags: {
      type: "array",
      items: { type: "string", enum: [...SAFETY_FLAGS] },
    },
    moderation_recommendation: {
      type: "string",
      enum: [...MODERATION_RECOMMENDATIONS],
    },
    possible_duplicate_signals: { type: "array", items: { type: "string" } },
  },
} as const;

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) {
    if (!env.openaiApiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    _client = new OpenAI({ apiKey: env.openaiApiKey });
  }
  return _client;
}

const SYSTEM_PROMPT = `You are SautiLedger's civic-submission analyzer for Kenya.

Your job is to convert a single informal citizen submission (written in English, Swahili, Sheng, or a mix) into a structured, anonymized JSON object suitable for civic accountability tracking.

Rules — follow strictly:
- Preserve meaning across languages. Do NOT invent facts.
- Translate "normalized_text" into calm, formal English. Keep the meaning, drop slang and emotion.
- Preserve concrete specifics from the submission — street/road names, place names, facility names, what is broken, how long it has been broken, observable consequences. These details are what make the mandate actionable. Do NOT generalise them away.
- Only redact direct personal identifiers: full names of private individuals, phone numbers, email addresses, ID numbers, exact GPS coordinates, and home addresses. Place names (e.g. "Ngong Road", "Mathare Ward", "Kenyatta Market") are NOT personal data and must be kept.
- Choose exactly one "issue_category" from the allowed list. Use "other" only if nothing fits.
- Choose exactly one "urgency" from low/medium/high/critical. Use "critical" only for immediate safety risk, active violence, urgent medical risk, or rapidly escalating conflict.
- The citizen has already declared the administrative scope (national / county / constituency / ward) and the responsible office. Do NOT contradict their routing; draft civic content that addresses that office directly.
- "recommended_mandate.title" is a short formal civic title (max ~80 chars) that references the concrete issue (e.g. "Repair the Ngong Road potholes between X and Y").
- "recommended_mandate.body" is several short paragraphs:
   1. What is happening, including the specific details from the submission.
   2. Where it is happening (use the place names from the submission).
   3. Who is responsible (the declared office).
   4. What is being asked of that office, and the expected response window.
  Do NOT add a generic disclaimer such as "This draft is generated from anonymized community submissions..." — the platform displays its own provenance label separately. Just write the mandate content.
- Add "safety_flags" for any of: personal data, exact location (GPS), mention of a child, threats, violence, named private persons, sensitive evidence, possible incitement, possible spam.
- Set "moderation_recommendation" to:
  - "publish" only if clearly safe to aggregate publicly,
  - "publish_after_review" by default,
  - "hold_for_review" when sensitive,
  - "reject" only for clear spam/abuse.
- "possible_duplicate_signals" are 2-5 short phrases describing the underlying concern, useful for matching similar submissions.
- Avoid partisan framing. Never name political actors as responsible.
`;

function buildUserPrompt(input: ProcessInput): string {
  const loc = input.location ?? { country: "Kenya" };
  const office = responsibleOffice(input.scopeLevel, loc);
  return `Submission:
"""
${input.originalText}
"""

Declared language hint: ${input.languageHint ?? "(none)"}

Location:
- county: ${loc.county ?? "(unknown)"}
- constituency: ${loc.constituency ?? "(unknown)"}
- ward: ${loc.ward ?? "(unknown)"}

Citizen-declared scope: ${input.scopeLevel}
Responsible office (derived): ${office}

Return JSON matching the required schema.`;
}

export async function processSubmissionWithOpenAi(
  input: ProcessInput,
): Promise<AiProcessingResult> {
  const response = await client().chat.completions.create({
    model: env.openaiModel,
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(input) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "sautiledger_submission_analysis",
        strict: true,
        schema: responseSchema,
      },
    },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("OpenAI returned empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(
      `OpenAI returned non-JSON content: ${(err as Error).message}`,
    );
  }

  const validated = aiResultSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(
      `OpenAI response failed schema validation: ${validated.error.message}`,
    );
  }

  return {
    ...validated.data,
    responsible_scope: input.scopeLevel,
    responsible_office: responsibleOffice(input.scopeLevel, input.location),
    responsible_scope_confidence: 0.95,
    generated: true,
  };
}

// ---------------------------------------------------------------------
// Clustering matcher — unchanged structurally, but no authority context.
// ---------------------------------------------------------------------

const matchSchema = z.object({
  matched_mandate_id: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

const matchJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["matched_mandate_id", "confidence", "reason"],
  properties: {
    matched_mandate_id: { type: ["string", "null"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    reason: { type: "string" },
  },
} as const;

const MATCH_SYSTEM_PROMPT = `You decide whether a new civic submission describes the same underlying community concern as one of a small list of existing Community Mandates.

Rules:
- Match only when the submissions describe the SAME concrete concern in the SAME location context.
- Do not match merely because the category is the same.
- If no candidate is a clear match, return matched_mandate_id=null with a low confidence.
- confidence is a 0..1 float. Use >=0.7 only when you are clearly confident.
- "reason" is a short single sentence explaining the decision.`;

export async function matchSubmissionToMandateWithOpenAi(
  input: MatchInput,
): Promise<MandateMatchDecision> {
  const candidatesText = input.candidates
    .map(
      (c, i) =>
        `${i + 1}. id=${c.id}\n   title: ${c.title}\n   summary: ${c.summary}`,
    )
    .join("\n");

  const user = `New submission category: ${input.submissionCategory}
New submission summary: ${input.submissionSummary}

Existing candidate mandates:
${candidatesText}

Return JSON matching the required schema. If matched_mandate_id is non-null, it MUST be one of the candidate ids listed above.`;

  const response = await client().chat.completions.create({
    model: env.openaiModel,
    temperature: 0.1,
    messages: [
      { role: "system", content: MATCH_SYSTEM_PROMPT },
      { role: "user", content: user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "sautiledger_mandate_match",
        strict: true,
        schema: matchJsonSchema,
      },
    },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("OpenAI returned empty match response");

  const parsed = matchSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(
      `OpenAI match response failed schema validation: ${parsed.error.message}`,
    );
  }

  const validIds = new Set(input.candidates.map((c) => c.id));
  const matched_mandate_id =
    parsed.data.matched_mandate_id &&
    validIds.has(parsed.data.matched_mandate_id)
      ? parsed.data.matched_mandate_id
      : null;

  return {
    matched_mandate_id,
    confidence: matched_mandate_id ? parsed.data.confidence : 0,
    reason: parsed.data.reason,
  };
}

// Silence unused-import warnings when only types are used at runtime.
export const __SCOPE_LEVELS_RUNTIME = SCOPE_LEVELS;
