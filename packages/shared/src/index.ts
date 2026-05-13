export type CivicLocation = {
  country: "Kenya";
  county?: string;
  constituency?: string;
  ward?: string;
};

export type MandateCategory =
  | "water"
  | "health"
  | "roads"
  | "education"
  | "security"
  | "sanitation"
  | "other";

export type Urgency = "low" | "medium" | "high";

export type SubmissionInput = {
  originalText: string;
  languageHint?: string;
  location: CivicLocation;
  consentToProcess: boolean;
  contact?: string;
};

export type AiProcessingResult = {
  detectedLanguage: string;
  normalizedText: string;
  category: MandateCategory;
  urgency: Urgency;
  suggestedAuthority: string;
  draftMandateTitle: string;
  draftMandateSummary: string;
  confidence: {
    language: number;
    category: number;
    urgency: number;
    authority: number;
  };
  generated: true;
};

export type SubmissionReceipt = {
  trackingCode: string;
  mandateDraft: AiProcessingResult;
};
