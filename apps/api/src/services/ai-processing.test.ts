import { describe, expect, it } from "vitest";
import {
  MANDATE_CATEGORIES,
  MODERATION_RECOMMENDATIONS,
  URGENCY_LEVELS,
} from "@sautiledger/shared";
import {
  matchSubmissionToMandate,
  processSubmissionWithAi,
} from "./ai-processing.js";

// These tests exercise the mock path (no OPENAI_API_KEY in test env).

describe("processSubmissionWithAi (mock)", () => {
  it("returns a contract-compliant result", async () => {
    const result = await processSubmissionWithAi({
      originalText:
        "Maji haitoki kwa wiki mbili. The community borehole is dead.",
      location: { country: "Kenya", county: "Nairobi", ward: "Mathare" },
      scopeLevel: "ward",
    });
    expect(MANDATE_CATEGORIES).toContain(result.issue_category);
    expect(URGENCY_LEVELS).toContain(result.urgency);
    expect(MODERATION_RECOMMENDATIONS).toContain(
      result.moderation_recommendation,
    );
    expect(result.generated).toBe(true);
    expect(result.recommended_mandate.title).toBeTruthy();
    expect(result.summary).toBeTruthy();
    expect(result.responsible_scope).toBe("ward");
    expect(result.responsible_office).toContain("Mathare");
  });

  it("classifies a water concern as 'water'", async () => {
    const result = await processSubmissionWithAi({
      originalText:
        "Water shortage in our ward. Borehole stopped working two weeks ago.",
      location: { country: "Kenya" },
      scopeLevel: "county",
    });
    expect(result.issue_category).toBe("water");
  });
});

describe("matchSubmissionToMandate (mock)", () => {
  it("returns null match when no candidates", async () => {
    const decision = await matchSubmissionToMandate({
      submissionSummary: "Water shortage in Mathare ward",
      submissionCategory: "water",
      candidates: [],
    });
    expect(decision.matched_mandate_id).toBeNull();
    expect(decision.confidence).toBe(0);
  });

  it("matches highly-overlapping summaries above threshold", async () => {
    const decision = await matchSubmissionToMandate({
      submissionSummary:
        "Water shortage in Mathare ward due to broken borehole",
      submissionCategory: "water",
      candidates: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          title: "Restore water access in Mathare ward",
          summary:
            "Mathare ward water shortage from broken borehole reported by residents",
        },
        {
          id: "22222222-2222-2222-2222-222222222222",
          title: "Repair impassable road in Kibra",
          summary: "Damaged road blocking ambulances in Kibra constituency",
        },
      ],
    });
    expect(decision.matched_mandate_id).toBe(
      "11111111-1111-1111-1111-111111111111",
    );
    expect(decision.confidence).toBeGreaterThan(0.5);
  });

  it("returns null when no candidate overlaps", async () => {
    const decision = await matchSubmissionToMandate({
      submissionSummary: "Water shortage in Mathare ward",
      submissionCategory: "water",
      candidates: [
        {
          id: "33333333-3333-3333-3333-333333333333",
          title: "School fence repairs",
          summary: "Schoolyard fencing damaged after storms",
        },
      ],
    });
    expect(decision.matched_mandate_id).toBeNull();
  });
});
