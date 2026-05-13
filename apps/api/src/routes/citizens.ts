import { Router } from "express";
import { z } from "zod";
import { AppDataSource } from "../data-source.js";
import { Submission } from "../entities/submission.entity.js";
import { Citizen } from "../entities/citizen.entity.js";
import {
  AuthError,
  loginCitizen,
  registerCitizen,
} from "../services/citizen-auth.js";
import { requireCitizen } from "../middleware/auth.js";

const registerSchema = z.object({
  phone: z.string().min(7).max(20),
  password: z.string().min(8).max(200),
  countyHint: z.string().optional(),
});

const loginSchema = z.object({
  phone: z.string().min(7).max(20),
  password: z.string().min(8).max(200),
});

export const citizensRouter = Router();

citizensRouter.post("/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const { citizen, token } = await registerCitizen(input);
    res.status(201).json({
      token,
      citizen: {
        citizenId: citizen.id,
        countyHint: citizen.countyHint ?? null,
        lastLoginAt: citizen.lastLoginAt?.toISOString() ?? null,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    next(err);
  }
});

citizensRouter.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const { citizen, token } = await loginCitizen(input);
    res.json({
      token,
      citizen: {
        citizenId: citizen.id,
        countyHint: citizen.countyHint ?? null,
        lastLoginAt: citizen.lastLoginAt?.toISOString() ?? null,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    next(err);
  }
});

citizensRouter.get("/me", requireCitizen, async (req, res, next) => {
  try {
    const repo = AppDataSource.getRepository(Citizen);
    const citizen = await repo.findOne({ where: { id: req.citizenId } });
    if (!citizen) {
      res.status(404).json({ error: "Citizen not found" });
      return;
    }
    res.json({
      citizenId: citizen.id,
      countyHint: citizen.countyHint ?? null,
      lastLoginAt: citizen.lastLoginAt?.toISOString() ?? null,
    });
  } catch (err) {
    next(err);
  }
});

citizensRouter.get(
  "/me/submissions",
  requireCitizen,
  async (req, res, next) => {
    try {
      const repo = AppDataSource.getRepository(Submission);
      const submissions = await repo.find({
        where: { citizenId: req.citizenId },
        relations: { mandate: true, targetAuthority: true },
        order: { createdAt: "DESC" },
      });

      res.json(
        submissions.map((s) => ({
          trackingCode: s.trackingCode,
          createdAt: s.createdAt.toISOString(),
          processingStatus: s.processingStatus,
          category: s.category ?? null,
          urgency: s.urgency ?? null,
          targetAuthority: s.targetAuthority
            ? {
                id: s.targetAuthority.id,
                name: s.targetAuthority.name,
                level: s.targetAuthority.level,
                county: s.targetAuthority.county ?? null,
                constituency: s.targetAuthority.constituency ?? null,
                ward: s.targetAuthority.ward ?? null,
                verified: s.targetAuthority.verified,
              }
            : null,
          mandateId: s.mandateId ?? null,
          mandateTitle: s.mandate?.title ?? null,
          mandateStatus: s.mandate?.status ?? null,
        })),
      );
    } catch (err) {
      next(err);
    }
  },
);
