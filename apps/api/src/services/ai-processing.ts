import type {
  AiProcessingResult,
  AuthoritySummary,
  MandateCategory,
  MandateMatchDecision,
  Urgency,
} from "@sautiledger/shared";
import { env } from "../config/env.js";

// ---------------------------------------------------------------------
// Public service surface.
// Phase 1: contract-compliant mock only. Phase 3 swaps in the OpenAI
// implementation when AI_PROVIDER=openai.
// ---------------------------------------------------------------------

export type ProcessInput = {
  originalText: string;
  languageHint?: string;
  location: { county?: string; constituency?: string; ward?: string };
  availableAuthorities: AuthoritySummary[];
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
    const { processSubmissionWithOpenAi } =
      await import("./ai-processing.openai.js");
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
    const { matchSubmissionToMandateWithOpenAi } =
      await import("./ai-processing.openai.js");
    return matchSubmissionToMandateWithOpenAi(input);
  }
  return mockMatch(input);
}

// ---------------------------------------------------------------------
// Deterministic mock — keyword-based category & urgency detection.
// Returns the same shape as the real processor.
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

function pickAuthority(
  category: MandateCategory,
  location: ProcessInput["location"],
  authorities: AuthoritySummary[],
): {
  authority: AuthoritySummary | null;
  confidence: number;
  office: string;
  level: AuthoritySummary["level"];
} {
  // Prefer county-level authority whose name contains the category, in the same county.
  const sameCounty = authorities.filter(
    (a) =>
      !location.county ||
      a.county === location.county ||
      a.level === "national",
  );
  const byCategoryHint = sameCounty.find((a) =>
    a.name.toLowerCase().includes(category),
  );
  if (byCategoryHint) {
    return {
      authority: byCategoryHint,
      confidence: 0.6,
      office: byCategoryHint.name,
      level: byCategoryHint.level,
    };
  }
  // Fall back to any county authority, then national.
  const county = sameCounty.find((a) => a.level === "county");
  if (county) {
    return {
      authority: county,
      confidence: 0.4,
      office: county.name,
      level: "county",
    };
  }
  const national = authorities.find((a) => a.level === "national");
  if (national) {
    return {
      authority: national,
      confidence: 0.3,
      office: national.name,
      level: "national",
    };
  }
  return {
    authority: null,
    confidence: 0.2,
    office: "Responsible county department",
    level: "county",
  };
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
  const {
    authority,
    confidence: authConf,
    office,
    level,
  } = pickAuthority(category, input.location, input.availableAuthorities);
  const { lang } = detectLanguage(input.originalText, input.languageHint);

  return {
    detected_language: lang,
    normalized_text: input.originalText.trim(),
    issue_category: category,
    issue_category_confidence: catConf,
    urgency,
    urgency_confidence: urgConf,
    responsible_level: level,
    responsible_office: office,
    suggested_authority_id: authority?.id ?? null,
    responsible_authority_confidence: authConf,
    summary: `Community concern in ${input.location.county ?? "Kenya"} relating to ${category}.`,
    recommended_mandate: {
      title:
        category === "water"
          ? "Restore reliable water access in the affected ward"
          : `Address reported community concern (${category})`,
      body: "Generated draft for human review. Multiple submissions should be clustered before public display.",
    },
    safety_flags: [],
    moderation_recommendation: "publish_after_review",
    possible_duplicate_signals: [],
    generated: true,
  };
}

// ---------------------------------------------------------------------
// Mock clustering matcher: simple token-overlap scoring against the
// candidate mandate summaries. Deterministic, no network.
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
    // Stretch jaccard to a more usable 0..1 range; cap at 0.95.
    confidence: Math.min(0.95, 0.5 + best.score),
    reason: `token-overlap jaccard=${best.score.toFixed(2)}`,
  };
}
