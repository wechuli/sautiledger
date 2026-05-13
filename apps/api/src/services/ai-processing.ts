import type { AiProcessingResult, SubmissionInput } from "@sautiledger/shared";

export async function processSubmissionWithAi(input: SubmissionInput): Promise<AiProcessingResult> {
  const text = input.originalText.toLowerCase();
  const category = text.includes("water") || text.includes("maji") ? "water" : "other";
  const urgency = text.includes("danger") || text.includes("emergency") ? "high" : "medium";

  return {
    detectedLanguage: input.languageHint ?? "mixed",
    normalizedText: input.originalText.trim(),
    category,
    urgency,
    suggestedAuthority: "Relevant county department",
    draftMandateTitle: category === "water" ? "Improve local water access" : "Review reported community concern",
    draftMandateSummary:
      "Generated draft for human review. Multiple community submissions should be clustered before public display.",
    confidence: {
      language: 0.55,
      category: 0.6,
      urgency: 0.5,
      authority: 0.45
    },
    generated: true
  };
}
