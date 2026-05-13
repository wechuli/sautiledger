import { MoreThanOrEqual, Not, In } from "typeorm";
import type { EntityManager } from "typeorm";
import type { AiProcessingResult } from "@sautiledger/shared";
import { Mandate } from "../entities/mandate.entity.js";
import { StatusHistory } from "../entities/status-history.entity.js";
import { Submission } from "../entities/submission.entity.js";
import { matchSubmissionToMandate } from "./ai-processing.js";

// ---------------------------------------------------------------------
// Clustering thresholds and windows
// ---------------------------------------------------------------------

const MATCH_CONFIDENCE_THRESHOLD = 0.7;
const CANDIDATE_LOOKBACK_DAYS = 60;
const CANDIDATE_LIMIT = 10;
const RESOLVED_STATUSES = ["resolved"] as const;

export type ClusteringOutcome = {
  mandateId: string;
  created: boolean;
  matchConfidence: number;
  reason: string;
};

/**
 * Find an existing Mandate that matches this submission, or create a new one.
 * Mutates the submission's mandateId and persists mandate stats.
 *
 * MUST be called inside a TypeORM transaction so submissionCount / lastActivityAt
 * stay consistent under concurrent submissions.
 */
export async function findOrCreateMandateForSubmission(
  em: EntityManager,
  submission: Submission,
  ai: AiProcessingResult
): Promise<ClusteringOutcome> {
  const mandateRepo = em.getRepository(Mandate);
  const historyRepo = em.getRepository(StatusHistory);

  // Deterministic prefilter: same category, same coarse location, not resolved,
  // active within the lookback window.
  const since = new Date(Date.now() - CANDIDATE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const loc = submission.location ?? {};
  const candidates = await mandateRepo.find({
    where: {
      category: ai.issue_category,
      status: Not(In([...RESOLVED_STATUSES])),
      lastActivityAt: MoreThanOrEqual(since),
      // Filter by ward when known, else fall back to county.
      ...(loc.ward
        ? { ward: loc.ward }
        : loc.county
          ? { county: loc.county }
          : {})
    },
    order: { lastActivityAt: "DESC" },
    take: CANDIDATE_LIMIT
  });

  if (candidates.length > 0) {
    const decision = await matchSubmissionToMandate({
      submissionSummary: ai.summary,
      submissionCategory: ai.issue_category,
      candidates: candidates.map((c) => ({
        id: c.id,
        title: c.title,
        summary: c.summary
      }))
    });

    if (
      decision.matched_mandate_id &&
      decision.confidence >= MATCH_CONFIDENCE_THRESHOLD
    ) {
      const matched = candidates.find((c) => c.id === decision.matched_mandate_id);
      if (matched) {
        return joinExistingMandate(em, submission, matched, decision.confidence, decision.reason);
      }
    }
  }

  return createNewMandate(em, submission, ai);
}

async function joinExistingMandate(
  em: EntityManager,
  submission: Submission,
  mandate: Mandate,
  confidence: number,
  reason: string
): Promise<ClusteringOutcome> {
  const now = new Date();
  mandate.submissionCount = (mandate.submissionCount ?? 0) + 1;
  mandate.lastActivityAt = now;
  mandate.evidenceStrength = computeEvidenceStrength(mandate.submissionCount, confidence);

  // Bump urgency if the new submission is more urgent.
  // (Stored urgency on Submission is set by the caller after AI.)
  if (rankUrgency(submission.urgency) > rankUrgency(mandate.urgency)) {
    mandate.urgency = submission.urgency!;
  }

  await em.getRepository(Mandate).save(mandate);
  submission.mandateId = mandate.id;

  return {
    mandateId: mandate.id,
    created: false,
    matchConfidence: confidence,
    reason
  };
}

async function createNewMandate(
  em: EntityManager,
  submission: Submission,
  ai: AiProcessingResult
): Promise<ClusteringOutcome> {
  const mandateRepo = em.getRepository(Mandate);
  const historyRepo = em.getRepository(StatusHistory);

  const now = new Date();
  const loc = submission.location ?? {};
  const mandate = mandateRepo.create({
    title: ai.recommended_mandate.title,
    summary: ai.summary,
    formalMandateText: ai.recommended_mandate.body,
    category: ai.issue_category,
    urgency: ai.urgency,
    status: "new",
    authorityId: submission.targetAuthorityId ?? ai.suggested_authority_id ?? null,
    county: loc.county ?? null,
    constituency: loc.constituency ?? null,
    ward: loc.ward ?? null,
    submissionCount: 1,
    evidenceStrength: computeEvidenceStrength(1, ai.issue_category_confidence),
    firstReportedAt: now,
    lastActivityAt: now
  });

  const saved = await mandateRepo.save(mandate);
  submission.mandateId = saved.id;

  await historyRepo.save(
    historyRepo.create({
      mandateId: saved.id,
      oldStatus: null,
      newStatus: "new",
      changedByLabel: "system:auto-create",
      note: "Mandate created from clustered submission"
    })
  );

  return {
    mandateId: saved.id,
    created: true,
    matchConfidence: 1,
    reason: "no matching candidate; created new mandate"
  };
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function rankUrgency(u: string | null | undefined): number {
  switch (u) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

/**
 * Evidence strength is a 0..1 score that grows with the number of
 * corroborating submissions and the confidence we have in the category.
 * Log-scaled so 1 submission ≈ 0, 10 ≈ ~0.7, 100 ≈ ~0.9.
 */
function computeEvidenceStrength(count: number, confidence: number): number {
  const countFactor = Math.min(1, Math.log10(Math.max(1, count)) / 2);
  const confFactor = Math.max(0, Math.min(1, confidence));
  return Math.round((0.6 * countFactor + 0.4 * confFactor) * 1000) / 1000;
}
