import { Router } from "express";
import { z } from "zod";
import { AppDataSource } from "../data-source.js";
import { Mandate } from "../entities/mandate.entity.js";
import { Submission } from "../entities/submission.entity.js";

export const trackingRouter = Router();

// Public lookup by anonymous tracking code. No PII; only the citizen
// who saved their code can use it.
trackingRouter.get("/:code", async (req, res, next) => {
  try {
    const code = z.string().min(6).max(64).parse(req.params.code);
    const submission = await AppDataSource.getRepository(Submission).findOne({
      where: { trackingCode: code },
    });
    if (!submission) {
      res.status(404).json({ error: "Tracking code not found" });
      return;
    }

    let mandate: Mandate | null = null;
    if (submission.mandateId) {
      mandate = await AppDataSource.getRepository(Mandate).findOne({
        where: { id: submission.mandateId },
      });
    }

    res.json({
      trackingCode: submission.trackingCode,
      createdAt: submission.createdAt.toISOString(),
      processingStatus: submission.processingStatus,
      category: submission.category ?? null,
      urgency: submission.urgency ?? null,
      mandate: mandate
        ? {
            id: mandate.id,
            title: mandate.title,
            status: mandate.status,
            submissionCount: mandate.submissionCount,
            lastActivityAt: mandate.lastActivityAt.toISOString(),
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});
