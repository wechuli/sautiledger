// =====================================================================
// SautiLedger shared domain contracts
// Used by both apps/api (Express + TypeORM) and apps/web (React).
// =====================================================================

// ---------------------------------------------------------------------
// Geographic / civic primitives
// ---------------------------------------------------------------------

export type CivicLocation = {
  country: "Kenya";
  county?: string;
  constituency?: string;
  ward?: string;
};

// ---------------------------------------------------------------------
// Issue categories & urgency
// ---------------------------------------------------------------------

export const MANDATE_CATEGORIES = [
  "water",
  "health",
  "roads",
  "education",
  "security",
  "land",
  "sanitation",
  "markets",
  "aid",
  "public_finance",
  "resource_exploitation",
  "other",
] as const;

export type MandateCategory = (typeof MANDATE_CATEGORIES)[number];

export const URGENCY_LEVELS = ["low", "medium", "high", "critical"] as const;
export type Urgency = (typeof URGENCY_LEVELS)[number];

// ---------------------------------------------------------------------
// Mandate lifecycle
// ---------------------------------------------------------------------

export const MANDATE_STATUSES = [
  "new",
  "under_review",
  "acknowledged",
  "in_progress",
  "resolved",
  "disputed",
  "escalated",
] as const;

export type MandateStatus = (typeof MANDATE_STATUSES)[number];

// ---------------------------------------------------------------------
// Authority
// ---------------------------------------------------------------------

export const AUTHORITY_LEVELS = [
  "national",
  "county",
  "constituency",
  "ward",
] as const;
export type AuthorityLevel = (typeof AUTHORITY_LEVELS)[number];

export type AuthoritySummary = {
  id: string;
  name: string;
  level: AuthorityLevel;
  county?: string | null;
  constituency?: string | null;
  ward?: string | null;
  verified: boolean;
};

// ---------------------------------------------------------------------
// Citizen-facing types
// ---------------------------------------------------------------------

export type CitizenProfile = {
  citizenId: string;
  countyHint?: string | null;
  lastLoginAt?: string | null;
};

export type RegisterCitizenInput = {
  phone: string;
  password: string;
  countyHint?: string;
};

export type LoginCitizenInput = {
  phone: string;
  password: string;
};

export type AuthTokenResponse = {
  token: string;
  citizen: CitizenProfile;
};

// ---------------------------------------------------------------------
// Submission input / receipt
// ---------------------------------------------------------------------

export type SubmissionInput = {
  originalText: string;
  languageHint?: string;
  location: CivicLocation;
  targetAuthorityId: string;
  consentToProcess: boolean;
};

export type SubmissionProcessingStatus =
  | "pending"
  | "processing"
  | "processed"
  | "failed";

export type SubmissionReceipt = {
  trackingCode: string;
  processingStatus: SubmissionProcessingStatus;
  mandateId?: string | null;
  mandateTitle?: string | null;
  mandateStatus?: MandateStatus | null;
};

export type CitizenSubmissionView = {
  trackingCode: string;
  createdAt: string;
  processingStatus: SubmissionProcessingStatus;
  category?: MandateCategory | null;
  urgency?: Urgency | null;
  targetAuthority?: AuthoritySummary | null;
  mandateId?: string | null;
  mandateTitle?: string | null;
  mandateStatus?: MandateStatus | null;
};

// ---------------------------------------------------------------------
// AI processing contract
// Mirrors docs/ai/ai-processing-contract.md (snake_case for parity with
// the OpenAI structured-output JSON schema).
// ---------------------------------------------------------------------

export const MODERATION_RECOMMENDATIONS = [
  "publish",
  "publish_after_review",
  "hold_for_review",
  "reject",
] as const;
export type ModerationRecommendation =
  (typeof MODERATION_RECOMMENDATIONS)[number];

export const SAFETY_FLAGS = [
  "contains_personal_data",
  "contains_exact_location",
  "mentions_child",
  "mentions_threat",
  "mentions_violence",
  "names_private_person",
  "sensitive_evidence",
  "possible_incitement",
  "possible_spam",
] as const;
export type SafetyFlag = (typeof SAFETY_FLAGS)[number];

export type AiProcessingResult = {
  detected_language: string;
  normalized_text: string;
  issue_category: MandateCategory;
  issue_category_confidence: number;
  urgency: Urgency;
  urgency_confidence: number;
  responsible_level: AuthorityLevel;
  responsible_office: string;
  suggested_authority_id: string | null;
  responsible_authority_confidence: number;
  summary: string;
  recommended_mandate: {
    title: string;
    body: string;
  };
  safety_flags: SafetyFlag[];
  moderation_recommendation: ModerationRecommendation;
  possible_duplicate_signals: string[];
  generated: true;
};

// ---------------------------------------------------------------------
// Mandate clustering decision (returned by the AI matcher)
// ---------------------------------------------------------------------

export type MandateMatchDecision = {
  matched_mandate_id: string | null;
  confidence: number;
  reason: string;
};

// ---------------------------------------------------------------------
// Public mandate views
// ---------------------------------------------------------------------

export type MandateSummary = {
  id: string;
  title: string;
  summary: string;
  category: MandateCategory;
  urgency: Urgency;
  status: MandateStatus;
  county?: string | null;
  constituency?: string | null;
  ward?: string | null;
  authority?: AuthoritySummary | null;
  submissionCount: number;
  evidenceStrength: number;
  firstReportedAt: string;
  lastActivityAt: string;
};

export type InstitutionResponseView = {
  id: string;
  responderLabel: string;
  responseText: string;
  newStatus?: MandateStatus | null;
  expectedResolutionDate?: string | null;
  createdAt: string;
};

export type StatusHistoryEntry = {
  id: string;
  oldStatus: MandateStatus | null;
  newStatus: MandateStatus;
  changedByLabel: string;
  note?: string | null;
  createdAt: string;
};

export type MandateDetail = MandateSummary & {
  formalMandateText: string;
  responses: InstitutionResponseView[];
  statusHistory: StatusHistoryEntry[];
};

// ---------------------------------------------------------------------
// Dashboard aggregates
// ---------------------------------------------------------------------

export type DashboardStats = {
  totals: {
    mandates: number;
    authorities: number;
    acknowledgedPct: number;
    resolvedPct: number;
  };
  byCategory: Array<{ category: MandateCategory; count: number }>;
  byUrgency: Array<{ urgency: Urgency; count: number }>;
  byStatus: Array<{ status: MandateStatus; count: number }>;
  byCounty: Array<{ county: string; count: number }>;
  trend30d: Array<{ date: string; count: number }>;
  topResponsiveness: Array<{
    authority: AuthoritySummary;
    responsivenessIndex: number;
    assigned: number;
    acknowledged: number;
    resolved: number;
  }>;
};
