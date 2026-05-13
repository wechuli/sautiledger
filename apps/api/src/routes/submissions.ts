import { Router } from "express";
import { z } from "zod";
import { AppDataSource } from "../data-source.js";
import { Submission } from "../entities/submission.entity.js";
import { processSubmissionWithAi } from "../services/ai-processing.js";
import { createTrackingCode, hashContactIdentifier } from "../services/privacy.js";

const submissionSchema = z.object({
  originalText: z.string().min(10).max(5000),
  languageHint: z.string().optional(),
  location: z.object({
    country: z.literal("Kenya").default("Kenya"),
    county: z.string().optional(),
    constituency: z.string().optional(),
    ward: z.string().optional()
  }),
  consentToProcess: z.literal(true),
  contact: z.string().optional()
});

export const submissionsRouter = Router();

submissionsRouter.post("/", async (req, res, next) => {
  try {
    const input = submissionSchema.parse(req.body);
    const aiResult = await processSubmissionWithAi(input);
    const trackingCode = createTrackingCode();

    if (!AppDataSource.isInitialized) {
      res.status(202).json({ trackingCode, mandateDraft: aiResult, persisted: false });
      return;
    }

    const repository = AppDataSource.getRepository(Submission);
    await repository.save({
      trackingCode,
      originalText: input.originalText,
      contactHash: hashContactIdentifier(input.contact),
      location: input.location,
      aiResult
    });

    res.status(201).json({ trackingCode, mandateDraft: aiResult, persisted: true });
  } catch (error) {
    next(error);
  }
});
