import {
  responsibleOffice,
  type AiProcessingResult,
  type CivicLocation,
  type MandateCategory,
  type MandateMatchDecision,
  type ScopeLevel,
  type Urgency,
} from "@sautiledger/shared";
import { env } from "../config/env.js";

// ---------------------------------------------------------------------
// Public service surface.
// The MVP scopes a submission to one of: national, county, constituency,
// ward. The "responsible office" is derived from that scope + location;
// there is no Authority table.
// ---------------------------------------------------------------------

export type ProcessInput = {
  originalText: string;
  languageHint?: string;
  location: CivicLocation;
  scopeLevel: ScopeLevel;
};

export type MatchCandidate = {
  id: string;
  title: string;
  summary: string;
};

export type MatchInput = {
  submissionSummary: string;
  submissionCategory: MandateCategory;
  candidates: MatchCandidate[];
};

export async function processSubmissionWithAi(
  input: ProcessInput,
): Promise<AiProcessingResult> {
  if (env.aiProvider === "openai" && env.openaiApiKey) {
    const { processSubmissionWithOpenAi } = await import(
      "./ai-processing.openai.js"
    );
    return processSubmissionWithOpenAi(input);
  }
  return mockProcess(input);
}

export async function matchSubmissionToMandate(
  input: MatchInput,
): Promise<MandateMatchDecision> {
  if (input.candidates.length === 0) {
    return { matched_mandate_id: null, confidence: 0, reason: "no candidates" };
  }
  if (env.aiProvider === "openai" && env.openaiApiKey) {
    const { matchSubmissionToMandateWithOpenAi } = await import(
      "./ai-processing.openai.js"
    );
    return matchSubmissionToMandateWithOpenAi(input);
  }
  return mockMatch(input);
}

// ---------------------------------------------------------------------
// Deterministic mock — keyword-based category & urgency detection.
// ---------------------------------------------------------------------

const CATEGORY_KEYWORDS: Record<MandateCategory, string[]> = {
  water: ["water", "maji", "borehole", "tap", "dry", "kavu"],
  health: ["hospital", "clinic", "dispensary", "medicine", "dawa", "ambulance"],
  roads: ["road", "barabara", "bridge", "mud", "impassable"],
  education: ["school", "shule", "classroom", "teacher", "desk", "mwalimu"],
  security: ["police", "theft", "wizi", "harassment", "unsafe"],
  sanitation: ["waste", "garbage", "sewer", "choo", "toilet", "taka"],
  land: ["land", "boundary", "shamba", "ardhi"],
  markets: ["market", "soko", "vendor", "stall"],
  aid: ["aid", "relief", "msaada", "food", "njaa"],
  public_finance: ["budget", "cdf", "ward fund", "audit"],
  resource_exploitation: ["mining", "logging", "pollution"],
  other: [],
};

function pickCategory(text: string): {
  category: MandateCategory;
  confidence: number;
} {
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) {
      return { category: cat as MandateCategory, confidence: 0.7 };
    }
  }
  return { category: "other", confidence: 0.4 };
}

function pickUrgency(text: string): { urgency: Urgency; confidence: number } {
  const lower = text.toLowerCase();
  if (/(danger|emergency|dying|attack|violen|hatari)/i.test(lower)) {
    return { urgency: "critical", confidence: 0.75 };
  }
  if (/(urgent|haraka|emergency|weeks|months)/i.test(lower)) {
    return { urgency: "high", confidence: 0.6 };
  }
  return { urgency: "medium", confidence: 0.5 };
}

function detectLanguage(
  text: string,
  hint?: string,
): { lang: string; confidence: number } {
  if (hint) return { lang: hint, confidence: 0.7 };
  const swahili =
    /(maji|barabara|wizi|haraka|kavu|dawa|shamba|taka|njaa|hatari|imekuwa|ngoja)/i.test(
      text,
    );
  const english = /[a-z]{4,}/i.test(text);
  if (swahili && english)
    return { lang: "mixed (Swahili/Sheng/English)", confidence: 0.7 };
  if (swahili) return { lang: "Swahili", confidence: 0.7 };
  if (english) return { lang: "English", confidence: 0.7 };
  return { lang: "unknown", confidence: 0.3 };
}

async function mockProcess(input: ProcessInput): Promise<AiProcessingResult> {
  const { category, confidence: catConf } = pickCategory(input.originalText);
  const { urgency, confidence: urgConf } = pickUrgency(input.originalText);
  const { lang } = detectLanguage(input.originalText, input.languageHint);
  const office = responsibleOffice(input.scopeLevel, input.location);

  const draft = draftFormalMandate({
    category,
    urgency,
    location: input.location,
    office,
    scopeLevel: input.scopeLevel,
    originalText: input.originalText,
  });

  return {
    detected_language: lang,
    normalized_text: input.originalText.trim(),
    issue_category: category,
    issue_category_confidence: catConf,
    urgency,
    urgency_confidence: urgConf,
    responsible_scope: input.scopeLevel,
    responsible_office: office,
    responsible_scope_confidence: 0.9, // citizen-declared, so high confidence
    summary: draft.summary,
    recommended_mandate: {
      title: draft.title,
      body: draft.body,
    },
    safety_flags: [],
    moderation_recommendation: "publish_after_review",
    possible_duplicate_signals: [],
    generated: true,
  };
}

// ---------------------------------------------------------------------
// Drafts a civic-toned Community Mandate for the mock path.
// ---------------------------------------------------------------------

const CATEGORY_LABEL: Record<MandateCategory, string> = {
  water: "water access",
  health: "health services",
  roads: "road infrastructure",
  education: "education services",
  security: "community safety",
  sanitation: "sanitation services",
  land: "land administration",
  markets: "market infrastructure",
  aid: "humanitarian relief",
  public_finance: "public finance accountability",
  resource_exploitation: "natural resource protection",
  other: "community welfare",
};

const CATEGORY_CONCERN: Record<MandateCategory, string> = {
  water:
    "residents are reporting unreliable or unsafe water supply, including broken boreholes, dry taps, and prolonged outages that disrupt households, schools, and small businesses",
  health:
    "residents are reporting stock-outs of essential medicine, understaffed facilities, or limited access to emergency care",
  roads:
    "residents are reporting damaged or impassable roads that prevent the movement of people, goods, and emergency vehicles",
  education:
    "residents are reporting gaps in classroom space, teacher availability, learning materials, or basic school infrastructure",
  security:
    "residents are reporting unresolved safety incidents, slow response times, or fear of harassment in public spaces",
  sanitation:
    "residents are reporting uncollected waste, blocked drains, or inadequate sanitation facilities affecting public health",
  land: "residents are reporting unresolved land disputes, unclear boundaries, or delayed administrative processes",
  markets:
    "residents are reporting unsafe market structures, poor lighting, or restricted access for vendors and customers",
  aid: "residents are reporting unmet humanitarian needs, including food insecurity and lack of relief support",
  public_finance:
    "residents are requesting public reporting on the use of devolved funds and ward-level budgets",
  resource_exploitation:
    "residents are reporting environmental harm or unregulated extractive activity affecting their community",
  other:
    "residents are reporting an unresolved community concern that requires institutional attention",
};

const URGENCY_FRAMING: Record<Urgency, string> = {
  critical:
    "Residents describe an immediate risk to life, livelihoods, or essential services. This mandate requires urgent acknowledgement within 48 hours and a documented response plan within one week.",
  high: "The concern has persisted long enough to affect daily life across the community. A formal acknowledgement is requested within one week and an initial response within two weeks.",
  medium:
    "The concern is ongoing and would benefit from a scheduled response. A formal acknowledgement is requested within two weeks.",
  low: "The concern is documented for institutional awareness and tracking. A response is requested within thirty days.",
};

function locationPhrase(loc: CivicLocation): string {
  const parts = [loc.ward, loc.constituency, loc.county].filter(
    (p): p is string => !!p && p.length > 0,
  );
  if (parts.length === 0) return "the affected community";
  if (parts.length === 1) return parts[0];
  return parts.join(", ");
}

// Light cleanup of the citizen's words so we can quote them in the formal
// draft without leaking obvious PII. We strip phone-number-like and email-like
// tokens but DO keep specifics such as street names, places, dates, and
// concrete details about what is broken — those are exactly what makes a
// mandate actionable.
function cleanQuote(text: string, maxLen = 320): string {
  const cleaned = text
    .replace(/\b\+?\d[\d\s().-]{7,}\b/g, "[contact removed]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[contact removed]")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
}

function draftFormalMandate(args: {
  category: MandateCategory;
  urgency: Urgency;
  location: CivicLocation;
  office: string;
  scopeLevel: ScopeLevel;
  originalText: string;
}): { title: string; summary: string; body: string } {
  const where = locationPhrase(args.location);
  const label = CATEGORY_LABEL[args.category];
  const concern = CATEGORY_CONCERN[args.category];
  const framing = URGENCY_FRAMING[args.urgency];
  const quote = cleanQuote(args.originalText);

  const title =
    args.category === "water"
      ? `Restore reliable water access in ${where}`
      : args.category === "roads"
        ? `Repair impassable road infrastructure in ${where}`
        : args.category === "health"
          ? `Restore essential health services in ${where}`
          : `Address ${label} concerns in ${where}`;

  const summary = `Community Mandate concerning ${label} in ${where}. ${framing.split(".")[0]}.`;

  const body = [
    `Community Mandate: ${title}.`,
    `Location: ${where}. Issue area: ${label}. Urgency: ${args.urgency}. Scope: ${args.scopeLevel}.`,
    `Background: ${concern}.`,
    `Reported details:\n— “${quote}”`,
    `Responsible body: ${args.office}. The community requests that this office acknowledge the mandate, publish an initial assessment, and share a clear plan with timelines.`,
    `Expected response: ${framing}`,
  ].join("\n\n");

  return { title, summary, body };
}

// ---------------------------------------------------------------------
// Mock clustering matcher: token-overlap scoring against candidate summaries.
// ---------------------------------------------------------------------

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 3),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function mockMatch(input: MatchInput): MandateMatchDecision {
  const subTokens = tokenize(input.submissionSummary);
  let best: { id: string; score: number } | null = null;
  for (const c of input.candidates) {
    const score = jaccard(subTokens, tokenize(`${c.title} ${c.summary}`));
    if (!best || score > best.score) best = { id: c.id, score };
  }
  if (!best || best.score < 0.2) {
    return {
      matched_mandate_id: null,
      confidence: best?.score ?? 0,
      reason: "low token overlap",
    };
  }
  return {
    matched_mandate_id: best.id,
    confidence: Math.min(0.95, 0.5 + best.score),
    reason: `token-overlap jaccard=${best.score.toFixed(2)}`,
  };
}
