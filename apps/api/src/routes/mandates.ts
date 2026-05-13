import { Router } from "express";
import { z } from "zod";
import { Brackets } from "typeorm";
import {
  MANDATE_CATEGORIES,
  MANDATE_STATUSES,
  URGENCY_LEVELS,
  type MandateDetail,
  type MandateStatus,
  type MandateSummary,
} from "@sautiledger/shared";
import { AppDataSource } from "../data-source.js";
import { Authority } from "../entities/authority.entity.js";
import { InstitutionResponse } from "../entities/institution-response.entity.js";
import { Mandate } from "../entities/mandate.entity.js";
import { StatusHistory } from "../entities/status-history.entity.js";
import { requireInstitutionKey } from "../middleware/auth.js";
import { env } from "../config/env.js";

export const mandatesRouter = Router();

const listQuerySchema = z.object({
  category: z.enum(MANDATE_CATEGORIES).optional(),
  urgency: z.enum(URGENCY_LEVELS).optional(),
  status: z.enum(MANDATE_STATUSES).optional(),
  county: z.string().optional(),
  constituency: z.string().optional(),
  ward: z.string().optional(),
  authorityId: z.string().uuid().optional(),
  q: z.string().min(1).max(200).optional(),
  sort: z.enum(["recent", "evidence", "urgency"]).optional().default("recent"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

function toMandateSummary(m: Mandate): MandateSummary {
  return {
    id: m.id,
    title: m.title,
    summary: m.summary,
    category: m.category,
    urgency: m.urgency,
    status: m.status,
    county: m.county ?? null,
    constituency: m.constituency ?? null,
    ward: m.ward ?? null,
    authority: m.authority
      ? {
          id: m.authority.id,
          name: m.authority.name,
          level: m.authority.level,
          county: m.authority.county,
          constituency: m.authority.constituency,
          ward: m.authority.ward,
          verified: m.authority.verified,
        }
      : null,
    submissionCount: m.submissionCount,
    evidenceStrength: m.evidenceStrength,
    firstReportedAt: m.firstReportedAt.toISOString(),
    lastActivityAt: m.lastActivityAt.toISOString(),
  };
}

// GET /api/mandates — public, filtered, paginated
mandatesRouter.get("/", async (req, res, next) => {
  try {
    const q = listQuerySchema.parse(req.query);
    const repo = AppDataSource.getRepository(Mandate);
    const qb = repo
      .createQueryBuilder("m")
      .leftJoinAndSelect("m.authority", "a");

    if (q.category)
      qb.andWhere("m.category = :category", { category: q.category });
    if (q.urgency) qb.andWhere("m.urgency = :urgency", { urgency: q.urgency });
    if (q.status) qb.andWhere("m.status = :status", { status: q.status });
    if (q.county) qb.andWhere("m.county = :county", { county: q.county });
    if (q.constituency)
      qb.andWhere("m.constituency = :constituency", {
        constituency: q.constituency,
      });
    if (q.ward) qb.andWhere("m.ward = :ward", { ward: q.ward });
    if (q.authorityId)
      qb.andWhere("m.authority_id = :aid", { aid: q.authorityId });
    if (q.q) {
      qb.andWhere(
        new Brackets((b) => {
          b.where("m.title ILIKE :q", { q: `%${q.q}%` }).orWhere(
            "m.summary ILIKE :q",
            {
              q: `%${q.q}%`,
            },
          );
        }),
      );
    }

    switch (q.sort) {
      case "evidence":
        qb.orderBy("m.evidence_strength", "DESC").addOrderBy(
          "m.last_activity_at",
          "DESC",
        );
        break;
      case "urgency":
        qb.orderBy(
          "CASE m.urgency WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0 END",
          "DESC",
        ).addOrderBy("m.last_activity_at", "DESC");
        break;
      default:
        qb.orderBy("m.last_activity_at", "DESC");
    }

    qb.skip((q.page - 1) * q.pageSize).take(q.pageSize);

    const [rows, total] = await qb.getManyAndCount();
    res.json({
      page: q.page,
      pageSize: q.pageSize,
      total,
      items: rows.map(toMandateSummary),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/mandates/:id
mandatesRouter.get("/:id", async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const mandate = await AppDataSource.getRepository(Mandate).findOne({
      where: { id },
      relations: { authority: true },
    });
    if (!mandate) {
      res.status(404).json({ error: "Mandate not found" });
      return;
    }

    const [responses, history] = await Promise.all([
      AppDataSource.getRepository(InstitutionResponse).find({
        where: { mandateId: id },
        order: { createdAt: "ASC" },
      }),
      AppDataSource.getRepository(StatusHistory).find({
        where: { mandateId: id },
        order: { createdAt: "ASC" },
      }),
    ]);

    const detail: MandateDetail = {
      ...toMandateSummary(mandate),
      formalMandateText: mandate.formalMandateText,
      responses: responses.map((r) => ({
        id: r.id,
        responderLabel: r.responderLabel,
        responseText: r.responseText,
        newStatus: r.newStatus ?? null,
        expectedResolutionDate: r.expectedResolutionDate
          ? r.expectedResolutionDate.toISOString()
          : null,
        createdAt: r.createdAt.toISOString(),
      })),
      statusHistory: history.map((h) => ({
        id: h.id,
        oldStatus: h.oldStatus ?? null,
        newStatus: h.newStatus,
        changedByLabel: h.changedByLabel,
        note: h.note ?? null,
        createdAt: h.createdAt.toISOString(),
      })),
    };
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

// GET /api/mandates/:id/responses
mandatesRouter.get("/:id/responses", async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const responses = await AppDataSource.getRepository(
      InstitutionResponse,
    ).find({
      where: { mandateId: id },
      order: { createdAt: "ASC" },
    });
    res.json(
      responses.map((r) => ({
        id: r.id,
        responderLabel: r.responderLabel,
        responseText: r.responseText,
        newStatus: r.newStatus ?? null,
        expectedResolutionDate: r.expectedResolutionDate
          ? r.expectedResolutionDate.toISOString()
          : null,
        createdAt: r.createdAt.toISOString(),
      })),
    );
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------
// Institution-only writes (gated by X-Institution-Key header)
// ---------------------------------------------------------------------

const responseBodySchema = z.object({
  responderLabel: z.string().min(2).max(120),
  responseText: z.string().min(5).max(5000),
  newStatus: z.enum(MANDATE_STATUSES).optional(),
  expectedResolutionDate: z.string().datetime().optional(),
});

mandatesRouter.post(
  "/:id/responses",
  requireInstitutionKey(env.institutionDemoKey),
  async (req, res, next) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const body = responseBodySchema.parse(req.body);

      const saved = await AppDataSource.transaction(async (em) => {
        const mandateRepo = em.getRepository(Mandate);
        const mandate = await mandateRepo.findOne({ where: { id } });
        if (!mandate) return null;

        const response = await em.getRepository(InstitutionResponse).save(
          em.getRepository(InstitutionResponse).create({
            mandateId: id,
            authorityId: mandate.authorityId ?? null,
            responderLabel: body.responderLabel,
            responseText: body.responseText,
            newStatus: body.newStatus ?? null,
            expectedResolutionDate: body.expectedResolutionDate
              ? new Date(body.expectedResolutionDate)
              : null,
          }),
        );

        // Optional status transition.
        if (body.newStatus && body.newStatus !== mandate.status) {
          const oldStatus = mandate.status;
          mandate.status = body.newStatus;
          mandate.lastActivityAt = new Date();
          await mandateRepo.save(mandate);
          await em.getRepository(StatusHistory).save(
            em.getRepository(StatusHistory).create({
              mandateId: id,
              oldStatus,
              newStatus: body.newStatus,
              changedByLabel: body.responderLabel,
              note: "Status updated via response",
            }),
          );
        } else {
          mandate.lastActivityAt = new Date();
          await mandateRepo.save(mandate);
        }

        return response;
      });

      if (!saved) {
        res.status(404).json({ error: "Mandate not found" });
        return;
      }
      res.status(201).json({
        id: saved.id,
        createdAt: saved.createdAt.toISOString(),
      });
    } catch (err) {
      next(err);
    }
  },
);

const statusBodySchema = z.object({
  newStatus: z.enum(MANDATE_STATUSES),
  changedByLabel: z.string().min(2).max(120),
  note: z.string().max(2000).optional(),
});

mandatesRouter.patch(
  "/:id/status",
  requireInstitutionKey(env.institutionDemoKey),
  async (req, res, next) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const body = statusBodySchema.parse(req.body);

      const result = await AppDataSource.transaction(async (em) => {
        const mandateRepo = em.getRepository(Mandate);
        const mandate = await mandateRepo.findOne({ where: { id } });
        if (!mandate) return null;
        const oldStatus: MandateStatus = mandate.status;
        if (oldStatus === body.newStatus) return mandate;

        mandate.status = body.newStatus;
        mandate.lastActivityAt = new Date();
        await mandateRepo.save(mandate);
        await em.getRepository(StatusHistory).save(
          em.getRepository(StatusHistory).create({
            mandateId: id,
            oldStatus,
            newStatus: body.newStatus,
            changedByLabel: body.changedByLabel,
            note: body.note ?? null,
          }),
        );
        return mandate;
      });

      if (!result) {
        res.status(404).json({ error: "Mandate not found" });
        return;
      }
      res.json({ id: result.id, status: result.status });
    } catch (err) {
      next(err);
    }
  },
);
