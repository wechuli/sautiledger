import { Router } from "express";
import { z } from "zod";
import {
  SCOPE_LEVELS,
  responsibleOffice,
} from "@sautiledger/shared";
import { AppDataSource } from "../data-source.js";
import { Mandate } from "../entities/mandate.entity.js";
import { Submission } from "../entities/submission.entity.js";
import { processSubmissionWithAi } from "../services/ai-processing.js";
import { findOrCreateMandateForSubmission } from "../services/mandate-clustering.js";
import { createTrackingCode } from "../services/privacy.js";
import { requireCitizen } from "../middleware/auth.js";

const submissionSchema = z.object({
  originalText: z.string().min(10).max(5000),
  languageHint: z.string().optional(),
  location: z.object({
    country: z.literal("Kenya").default("Kenya"),
    county: z.string().optional(),
    constituency: z.string().optional(),
    ward: z.string().optional(),
  }),
  scopeLevel: z.enum(SCOPE_LEVELS),
  consentToProcess: z.literal(true),
});

export const submissionsRouter = Router();

submissionsRouter.post("/", requireCitizen, async (req, res, next) => {
  try {
    const input = submissionSchema.parse(req.body);
    const trackingCode = createTrackingCode();

    if (!AppDataSource.isInitialized) {
      res.status(503).json({ error: "Database unavailable" });
      return;
    }

    let aiResult: Awaited<ReturnType<typeof processSubmissionWithAi>> | null =
      null;
    let processingStatus: "processed" | "failed" = "processed";
    try {
      aiResult = await processSubmissionWithAi({
        originalText: input.originalText,
        languageHint: input.languageHint,
        location: input.location,
        scopeLevel: input.scopeLevel,
      });
    } catch (aiErr) {
      console.error("AI processing failed:", aiErr);
      processingStatus = "failed";
    }

    const repository = AppDataSource.getRepository(Submission);
    const submission = repository.create({
      trackingCode,
      citizenId: req.citizenId ?? null,
      scopeLevel: input.scopeLevel,
      originalText: input.originalText,
      normalizedText: aiResult?.normalized_text ?? null,
      detectedLanguage: aiResult?.detected_language ?? null,
      category: aiResult?.issue_category ?? null,
      urgency: aiResult?.urgency ?? null,
      processingStatus,
      location: input.location,
      aiResult,
    });

    let mandateTitle: string | null = null;
    let mandateStatus: string | null = null;
    const saved = await AppDataSource.transaction(async (em) => {
      const persisted = await em.getRepository(Submission).save(submission);

      if (aiResult && processingStatus === "processed") {
        try {
          const outcome = await findOrCreateMandateForSubmission(
            em,
            persisted,
            aiResult,
          );
          await em.getRepository(Submission).update(persisted.id, {
            mandateId: outcome.mandateId,
          });
          persisted.mandateId = outcome.mandateId;
          const mandate = await em.getRepository(Mandate).findOne({
            where: { id: outcome.mandateId },
          });
          mandateTitle = mandate?.title ?? null;
          mandateStatus = mandate?.status ?? null;
        } catch (clusterErr) {
          console.error("Mandate clustering failed:", clusterErr);
        }
      }

      return persisted;
    });

    res.status(201).json({
      trackingCode: saved.trackingCode,
      processingStatus: saved.processingStatus,
      mandateId: saved.mandateId ?? null,
      mandateTitle,
      mandateStatus,
      responsibleOffice: responsibleOffice(input.scopeLevel, input.location),
    });
  } catch (error) {
    next(error);
  }
});
