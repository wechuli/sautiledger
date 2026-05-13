import { Router } from "express";
import { z } from "zod";
import { Brackets } from "typeorm";
import {
  MANDATE_CATEGORIES,
  MANDATE_STATUSES,
  SCOPE_LEVELS,
  URGENCY_LEVELS,
  responsibleOffice,
  type MandateAggregateStats,
  type MandateCategory,
  type MandateDetail,
  type MandateStatus,
  type MandateSummary,
  type ScopeLevel,
  type Urgency,
} from "@sautiledger/shared";
import { AppDataSource } from "../data-source.js";
import { InstitutionResponse } from "../entities/institution-response.entity.js";
import { Mandate } from "../entities/mandate.entity.js";
import { MandateUpvote } from "../entities/mandate-upvote.entity.js";
import { StatusHistory } from "../entities/status-history.entity.js";
import {
  optionalCitizen,
  requireCitizen,
  requireInstitutionKey,
} from "../middleware/auth.js";
import { env } from "../config/env.js";

export const mandatesRouter = Router();

const listQuerySchema = z.object({
  category: z.enum(MANDATE_CATEGORIES).optional(),
  urgency: z.enum(URGENCY_LEVELS).optional(),
  status: z.enum(MANDATE_STATUSES).optional(),
  scopeLevel: z.enum(SCOPE_LEVELS).optional(),
  county: z.string().optional(),
  constituency: z.string().optional(),
  ward: z.string().optional(),
  q: z.string().min(1).max(200).optional(),
  sort: z
    .enum(["recent", "evidence", "urgency", "upvotes"])
    .optional()
    .default("recent"),
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
    scopeLevel: m.scopeLevel,
    responsibleOffice:
      m.responsibleOffice ||
      responsibleOffice(m.scopeLevel, {
        country: "Kenya",
        county: m.county ?? undefined,
        constituency: m.constituency ?? undefined,
        ward: m.ward ?? undefined,
      }),
    submissionCount: m.submissionCount,
    evidenceStrength: m.evidenceStrength,
    upvoteCount: m.upvoteCount ?? 0,
    firstReportedAt: m.firstReportedAt.toISOString(),
    lastActivityAt: m.lastActivityAt.toISOString(),
  };
}

mandatesRouter.get("/", async (req, res, next) => {
  try {
    const q = listQuerySchema.parse(req.query);
    const repo = AppDataSource.getRepository(Mandate);
    const qb = repo.createQueryBuilder("m");

    if (q.category)
      qb.andWhere("m.category = :category", { category: q.category });
    if (q.urgency) qb.andWhere("m.urgency = :urgency", { urgency: q.urgency });
    if (q.status) qb.andWhere("m.status = :status", { status: q.status });
    if (q.scopeLevel)
      qb.andWhere("m.scopeLevel = :scopeLevel", { scopeLevel: q.scopeLevel });
    if (q.county) qb.andWhere("m.county = :county", { county: q.county });
    if (q.constituency)
      qb.andWhere("m.constituency = :constituency", {
        constituency: q.constituency,
      });
    if (q.ward) qb.andWhere("m.ward = :ward", { ward: q.ward });
    if (q.q) {
      qb.andWhere(
        new Brackets((b) => {
          b.where("m.title LIKE :q", { q: `%${q.q}%` }).orWhere(
            "m.summary LIKE :q",
            { q: `%${q.q}%` },
          );
        }),
      );
    }

    switch (q.sort) {
      case "evidence":
        qb.orderBy("m.evidenceStrength", "DESC").addOrderBy(
          "m.lastActivityAt",
          "DESC",
        );
        break;
      case "upvotes":
        qb.orderBy("m.upvoteCount", "DESC").addOrderBy(
          "m.lastActivityAt",
          "DESC",
        );
        break;
      case "urgency":
        qb.addSelect(
          "CASE m.urgency WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0 END",
          "urgency_rank",
        )
          .orderBy("urgency_rank", "DESC")
          .addOrderBy("m.lastActivityAt", "DESC");
        break;
      default:
        qb.orderBy("m.lastActivityAt", "DESC");
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

// ---------------------------------------------------------------------
// Aggregations for the mandates page. Same filter shape as the list
// endpoint; returned counts always reflect the active filter set so the
// charts on the page update with the dropdowns.
// IMPORTANT: this route MUST be declared before "/:id" so Express does
// not interpret "stats" as a UUID.
// ---------------------------------------------------------------------

const statsQuerySchema = z.object({
  category: z.enum(MANDATE_CATEGORIES).optional(),
  urgency: z.enum(URGENCY_LEVELS).optional(),
  status: z.enum(MANDATE_STATUSES).optional(),
  scopeLevel: z.enum(SCOPE_LEVELS).optional(),
  county: z.string().optional(),
  constituency: z.string().optional(),
  ward: z.string().optional(),
  q: z.string().min(1).max(200).optional(),
});

mandatesRouter.get("/stats", async (req, res, next) => {
  try {
    const q = statsQuerySchema.parse(req.query);
    const repo = AppDataSource.getRepository(Mandate);

    // Helper that re-applies the same WHERE clauses to a fresh QB.
    const applyFilters = (alias: string) => {
      const qb = repo.createQueryBuilder(alias);
      if (q.category)
        qb.andWhere(`${alias}.category = :category`, { category: q.category });
      if (q.urgency)
        qb.andWhere(`${alias}.urgency = :urgency`, { urgency: q.urgency });
      if (q.status)
        qb.andWhere(`${alias}.status = :status`, { status: q.status });
      if (q.scopeLevel)
        qb.andWhere(`${alias}.scopeLevel = :scopeLevel`, {
          scopeLevel: q.scopeLevel,
        });
      if (q.county)
        qb.andWhere(`${alias}.county = :county`, { county: q.county });
      if (q.constituency)
        qb.andWhere(`${alias}.constituency = :constituency`, {
          constituency: q.constituency,
        });
      if (q.ward) qb.andWhere(`${alias}.ward = :ward`, { ward: q.ward });
      if (q.q) {
        qb.andWhere(
          new Brackets((b) => {
            b.where(`${alias}.title LIKE :q`, { q: `%${q.q}%` }).orWhere(
              `${alias}.summary LIKE :q`,
              { q: `%${q.q}%` },
            );
          }),
        );
      }
      return qb;
    };

    const toN = (s: string | number) => (typeof s === "number" ? s : Number(s));

    const [
      total,
      byCategoryRaw,
      byUrgencyRaw,
      byStatusRaw,
      byScopeRaw,
      byCountyRaw,
      byConstituencyRaw,
      byWardRaw,
      topUpvotedRaw,
    ] = await Promise.all([
      applyFilters("m").getCount(),
      applyFilters("m")
        .select("m.category", "category")
        .addSelect("COUNT(*)", "count")
        .groupBy("m.category")
        .getRawMany<{ category: MandateCategory; count: string }>(),
      applyFilters("m")
        .select("m.urgency", "urgency")
        .addSelect("COUNT(*)", "count")
        .groupBy("m.urgency")
        .getRawMany<{ urgency: Urgency; count: string }>(),
      applyFilters("m")
        .select("m.status", "status")
        .addSelect("COUNT(*)", "count")
        .groupBy("m.status")
        .getRawMany<{ status: MandateStatus; count: string }>(),
      applyFilters("m")
        .select("m.scope_level", "scope")
        .addSelect("COUNT(*)", "count")
        .groupBy("m.scope_level")
        .getRawMany<{ scope: ScopeLevel; count: string }>(),
      applyFilters("m")
        .select("m.county", "county")
        .addSelect("COUNT(*)", "count")
        .andWhere("m.county IS NOT NULL")
        .groupBy("m.county")
        .orderBy("count", "DESC")
        .limit(15)
        .getRawMany<{ county: string; count: string }>(),
      applyFilters("m")
        .select("m.constituency", "constituency")
        .addSelect("COUNT(*)", "count")
        .andWhere("m.constituency IS NOT NULL")
        .groupBy("m.constituency")
        .orderBy("count", "DESC")
        .limit(15)
        .getRawMany<{ constituency: string; count: string }>(),
      applyFilters("m")
        .select("m.ward", "ward")
        .addSelect("COUNT(*)", "count")
        .andWhere("m.ward IS NOT NULL")
        .groupBy("m.ward")
        .orderBy("count", "DESC")
        .limit(15)
        .getRawMany<{ ward: string; count: string }>(),
      applyFilters("m")
        .select([
          "m.id AS id",
          "m.title AS title",
          "m.upvote_count AS upvoteCount",
        ])
        .orderBy("m.upvote_count", "DESC")
        .addOrderBy("m.lastActivityAt", "DESC")
        .limit(5)
        .getRawMany<{ id: string; title: string; upvoteCount: string }>(),
    ]);

    const stats: MandateAggregateStats = {
      total,
      byCategory: byCategoryRaw.map((r) => ({
        category: r.category,
        count: toN(r.count),
      })),
      byUrgency: byUrgencyRaw.map((r) => ({
        urgency: r.urgency,
        count: toN(r.count),
      })),
      byStatus: byStatusRaw.map((r) => ({
        status: r.status,
        count: toN(r.count),
      })),
      byScope: byScopeRaw.map((r) => ({
        scope: r.scope,
        count: toN(r.count),
      })),
      byCounty: byCountyRaw.map((r) => ({
        county: r.county,
        count: toN(r.count),
      })),
      byConstituency: byConstituencyRaw.map((r) => ({
        constituency: r.constituency,
        count: toN(r.count),
      })),
      byWard: byWardRaw.map((r) => ({
        ward: r.ward,
        count: toN(r.count),
      })),
      topUpvoted: topUpvotedRaw.map((r) => ({
        id: r.id,
        title: r.title,
        upvoteCount: toN(r.upvoteCount),
      })),
    };

    res.json(stats);
  } catch (err) {
    next(err);
  }
});

mandatesRouter.get("/:id", optionalCitizen, async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const mandate = await AppDataSource.getRepository(Mandate).findOne({
      where: { id },
    });
    if (!mandate) {
      res.status(404).json({ error: "Mandate not found" });
      return;
    }

    const [responses, history, youUpvoted] = await Promise.all([
      AppDataSource.getRepository(InstitutionResponse).find({
        where: { mandateId: id },
        order: { createdAt: "ASC" },
      }),
      AppDataSource.getRepository(StatusHistory).find({
        where: { mandateId: id },
        order: { createdAt: "ASC" },
      }),
      req.citizenId
        ? AppDataSource.getRepository(MandateUpvote)
            .findOne({
              where: { mandateId: id, citizenId: req.citizenId },
            })
            .then((u) => !!u)
        : Promise.resolve(false),
    ]);

    const detail: MandateDetail = {
      ...toMandateSummary(mandate),
      formalMandateText: mandate.formalMandateText,
      youUpvoted,
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
            responderLabel: body.responderLabel,
            responseText: body.responseText,
            newStatus: body.newStatus ?? null,
            expectedResolutionDate: body.expectedResolutionDate
              ? new Date(body.expectedResolutionDate)
              : null,
          }),
        );

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

// ---------------------------------------------------------------------
// Upvotes — one per (citizen, mandate). POST toggles.
// ---------------------------------------------------------------------

mandatesRouter.get("/:id/upvote", optionalCitizen, async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const mandate = await AppDataSource.getRepository(Mandate).findOne({
      where: { id },
      select: { id: true, upvoteCount: true },
    });
    if (!mandate) {
      res.status(404).json({ error: "Mandate not found" });
      return;
    }
    const youUpvoted = req.citizenId
      ? !!(await AppDataSource.getRepository(MandateUpvote).findOne({
          where: { mandateId: id, citizenId: req.citizenId },
        }))
      : false;
    res.json({ upvoteCount: mandate.upvoteCount ?? 0, youUpvoted });
  } catch (err) {
    next(err);
  }
});

mandatesRouter.post("/:id/upvote", requireCitizen, async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const citizenId = req.citizenId!;

    const result = await AppDataSource.transaction(async (em) => {
      const mandateRepo = em.getRepository(Mandate);
      const upvoteRepo = em.getRepository(MandateUpvote);
      const mandate = await mandateRepo.findOne({ where: { id } });
      if (!mandate) return null;

      const existing = await upvoteRepo.findOne({
        where: { mandateId: id, citizenId },
      });

      if (existing) {
        await upvoteRepo.remove(existing);
        mandate.upvoteCount = Math.max(0, (mandate.upvoteCount ?? 0) - 1);
        await mandateRepo.save(mandate);
        return { youUpvoted: false, upvoteCount: mandate.upvoteCount };
      }

      await upvoteRepo.save(upvoteRepo.create({ mandateId: id, citizenId }));
      mandate.upvoteCount = (mandate.upvoteCount ?? 0) + 1;
      await mandateRepo.save(mandate);
      return { youUpvoted: true, upvoteCount: mandate.upvoteCount };
    });

    if (!result) {
      res.status(404).json({ error: "Mandate not found" });
      return;
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});
