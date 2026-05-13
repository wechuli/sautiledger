import { MoreThanOrEqual, Not, In } from "typeorm";
import type { EntityManager } from "typeorm";
import {
  responsibleOffice,
  type AiProcessingResult,
} from "@sautiledger/shared";
import { Mandate } from "../entities/mandate.entity.js";
import { StatusHistory } from "../entities/status-history.entity.js";
import { Submission } from "../entities/submission.entity.js";
import { matchSubmissionToMandate } from "./ai-processing.js";

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

export async function findOrCreateMandateForSubmission(
  em: EntityManager,
  submission: Submission,
  ai: AiProcessingResult,
): Promise<ClusteringOutcome> {
  const mandateRepo = em.getRepository(Mandate);
  const historyRepo = em.getRepository(StatusHistory);

  const since = new Date(
    Date.now() - CANDIDATE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
  );
  const loc = submission.location ?? {};
  const candidates = await mandateRepo.find({
    where: {
      category: ai.issue_category,
      status: Not(In([...RESOLVED_STATUSES])),
      lastActivityAt: MoreThanOrEqual(since),
      scopeLevel: submission.scopeLevel,
      ...(loc.ward
        ? { ward: loc.ward }
        : loc.county
          ? { county: loc.county }
          : {}),
    },
    order: { lastActivityAt: "DESC" },
    take: CANDIDATE_LIMIT,
  });

  if (candidates.length > 0) {
    const decision = await matchSubmissionToMandate({
      submissionSummary: ai.summary,
      submissionCategory: ai.issue_category,
      candidates: candidates.map((c) => ({
        id: c.id,
        title: c.title,
        summary: c.summary,
      })),
    });

    if (
      decision.matched_mandate_id &&
      decision.confidence >= MATCH_CONFIDENCE_THRESHOLD
    ) {
      const matched = candidates.find(
        (c) => c.id === decision.matched_mandate_id,
      );
      if (matched) {
        return joinExistingMandate(
          em,
          submission,
          matched,
          decision.confidence,
          decision.reason,
        );
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
  reason: string,
): Promise<ClusteringOutcome> {
  const now = new Date();
  mandate.submissionCount = (mandate.submissionCount ?? 0) + 1;
  mandate.lastActivityAt = now;
  mandate.evidenceStrength = computeEvidenceStrength(
    mandate.submissionCount,
    confidence,
  );

  if (rankUrgency(submission.urgency) > rankUrgency(mandate.urgency)) {
    mandate.urgency = submission.urgency!;
  }

  // Preserve the specific details of every new report by appending a
  // cleaned, quoted snippet to the formal mandate body under an
  // "Additional reports" log. This keeps concrete facts (street names,
  // facilities, durations) visible to reviewers without dropping context.
  const snippet = appendableSnippet(submission);
  if (snippet) {
    mandate.formalMandateText = appendAdditionalReport(
      mandate.formalMandateText,
      snippet,
    );
  }

  await em.getRepository(Mandate).save(mandate);
  submission.mandateId = mandate.id;

  return {
    mandateId: mandate.id,
    created: false,
    matchConfidence: confidence,
    reason,
  };
}

async function createNewMandate(
  em: EntityManager,
  submission: Submission,
  ai: AiProcessingResult,
): Promise<ClusteringOutcome> {
  const mandateRepo = em.getRepository(Mandate);
  const historyRepo = em.getRepository(StatusHistory);

  const now = new Date();
  const loc = submission.location ?? {};
  const office = responsibleOffice(submission.scopeLevel, loc);
  const mandate = mandateRepo.create({
    title: ai.recommended_mandate.title,
    summary: ai.summary,
    formalMandateText: ai.recommended_mandate.body,
    category: ai.issue_category,
    urgency: ai.urgency,
    status: "new",
    scopeLevel: submission.scopeLevel,
    responsibleOffice: office,
    county: loc.county ?? null,
    constituency: loc.constituency ?? null,
    ward: loc.ward ?? null,
    submissionCount: 1,
    evidenceStrength: computeEvidenceStrength(1, ai.issue_category_confidence),
    firstReportedAt: now,
    lastActivityAt: now,
  });

  const saved = await mandateRepo.save(mandate);
  submission.mandateId = saved.id;

  await historyRepo.save(
    historyRepo.create({
      mandateId: saved.id,
      oldStatus: null,
      newStatus: "new",
      changedByLabel: "system:auto-create",
      note: "Mandate created from clustered submission",
    }),
  );

  return {
    mandateId: saved.id,
    created: true,
    matchConfidence: 1,
    reason: "no matching candidate; created new mandate",
  };
}

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

function computeEvidenceStrength(count: number, confidence: number): number {
  const countFactor = Math.min(1, Math.log10(Math.max(1, count)) / 2);
  const confFactor = Math.max(0, Math.min(1, confidence));
  return Math.round((0.6 * countFactor + 0.4 * confFactor) * 1000) / 1000;
}

function appendableSnippet(submission: Submission): string | null {
  const source = submission.normalizedText || submission.originalText;
  if (!source) return null;
  const cleaned = source
    .replace(/\b\+?\d[\d\s().-]{7,}\b/g, "[contact removed]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[contact removed]")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  const max = 280;
  return cleaned.length <= max
    ? cleaned
    : cleaned.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

const ADDITIONAL_REPORTS_HEADING = "Additional reports:";

function appendAdditionalReport(body: string, snippet: string): string {
  const bullet = `— “${snippet}”`;
  if (body.includes(ADDITIONAL_REPORTS_HEADING)) {
    return `${body}\n${bullet}`;
  }
  return `${body}\n\n${ADDITIONAL_REPORTS_HEADING}\n${bullet}`;
}
