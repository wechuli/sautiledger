import { Router } from "express";
import type {
  DashboardStats,
  MandateCategory,
  MandateStatus,
  ScopeLevel,
  Urgency,
} from "@sautiledger/shared";
import { AppDataSource } from "../data-source.js";
import { Mandate } from "../entities/mandate.entity.js";

export const dashboardRouter = Router();

dashboardRouter.get("/stats", async (_req, res, next) => {
  try {
    const mandateRepo = AppDataSource.getRepository(Mandate);

    const [
      totalMandates,
      acknowledgedCount,
      resolvedCount,
      byCategoryRaw,
      byUrgencyRaw,
      byStatusRaw,
      byCountyRaw,
      byScopeRaw,
      trendRows,
    ] = await Promise.all([
      mandateRepo.count(),
      mandateRepo
        .createQueryBuilder("m")
        .where("m.status IN ('acknowledged','in_progress','resolved')")
        .getCount(),
      mandateRepo
        .createQueryBuilder("m")
        .where("m.status = 'resolved'")
        .getCount(),
      mandateRepo
        .createQueryBuilder("m")
        .select("m.category", "category")
        .addSelect("COUNT(*)", "count")
        .groupBy("m.category")
        .getRawMany<{ category: MandateCategory; count: string }>(),
      mandateRepo
        .createQueryBuilder("m")
        .select("m.urgency", "urgency")
        .addSelect("COUNT(*)", "count")
        .groupBy("m.urgency")
        .getRawMany<{ urgency: Urgency; count: string }>(),
      mandateRepo
        .createQueryBuilder("m")
        .select("m.status", "status")
        .addSelect("COUNT(*)", "count")
        .groupBy("m.status")
        .getRawMany<{ status: MandateStatus; count: string }>(),
      mandateRepo
        .createQueryBuilder("m")
        .select("m.county", "county")
        .addSelect("COUNT(*)", "count")
        .where("m.county IS NOT NULL")
        .groupBy("m.county")
        .orderBy("count", "DESC")
        .limit(10)
        .getRawMany<{ county: string; count: string }>(),
      mandateRepo
        .createQueryBuilder("m")
        .select("m.scope_level", "scope")
        .addSelect("COUNT(*)", "count")
        .groupBy("m.scope_level")
        .getRawMany<{ scope: ScopeLevel; count: string }>(),
      mandateRepo
        .createQueryBuilder("m")
        .select("DATE(m.first_reported_at)", "date")
        .addSelect("COUNT(*)", "count")
        .where("m.first_reported_at >= DATE('now', '-30 days')")
        .groupBy("DATE(m.first_reported_at)")
        .orderBy("DATE(m.first_reported_at)", "ASC")
        .getRawMany<{ date: string; count: string }>(),
    ]);

    const toN = (s: string | number) =>
      typeof s === "number" ? s : Number(s);

    const stats: DashboardStats = {
      totals: {
        mandates: totalMandates,
        acknowledgedPct:
          totalMandates === 0
            ? 0
            : Math.round((acknowledgedCount / totalMandates) * 1000) / 10,
        resolvedPct:
          totalMandates === 0
            ? 0
            : Math.round((resolvedCount / totalMandates) * 1000) / 10,
      },
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
      byCounty: byCountyRaw.map((r) => ({
        county: r.county,
        count: toN(r.count),
      })),
      byScope: byScopeRaw.map((r) => ({
        scope: r.scope,
        count: toN(r.count),
      })),
      trend30d: trendRows.map((r) => ({
        date:
          typeof r.date === "string"
            ? r.date
            : new Date(r.date).toISOString().slice(0, 10),
        count: toN(r.count),
      })),
    };

    res.json(stats);
  } catch (err) {
    next(err);
  }
});
