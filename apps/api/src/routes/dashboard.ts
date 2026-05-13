import { Router } from "express";
import type { DashboardStats, MandateCategory, MandateStatus, Urgency } from "@sautiledger/shared";
import { AppDataSource } from "../data-source.js";
import { Authority } from "../entities/authority.entity.js";
import { Mandate } from "../entities/mandate.entity.js";
import { computeResponsivenessIndex } from "../services/responsiveness.js";

export const dashboardRouter = Router();

dashboardRouter.get("/stats", async (_req, res, next) => {
  try {
    const mandateRepo = AppDataSource.getRepository(Mandate);
    const authorityRepo = AppDataSource.getRepository(Authority);

    const [
      totalMandates,
      totalAuthorities,
      acknowledgedCount,
      resolvedCount,
      byCategory,
      byUrgency,
      byStatus,
      byCounty,
      trendRows
    ] = await Promise.all([
      mandateRepo.count(),
      authorityRepo.count(),
      mandateRepo
        .createQueryBuilder("m")
        .where("m.status IN ('acknowledged','in_progress','resolved')")
        .getCount(),
      mandateRepo.createQueryBuilder("m").where("m.status = 'resolved'").getCount(),
      mandateRepo
        .createQueryBuilder("m")
        .select("m.category", "category")
        .addSelect("COUNT(*)::int", "count")
        .groupBy("m.category")
        .getRawMany<{ category: MandateCategory; count: number }>(),
      mandateRepo
        .createQueryBuilder("m")
        .select("m.urgency", "urgency")
        .addSelect("COUNT(*)::int", "count")
        .groupBy("m.urgency")
        .getRawMany<{ urgency: Urgency; count: number }>(),
      mandateRepo
        .createQueryBuilder("m")
        .select("m.status", "status")
        .addSelect("COUNT(*)::int", "count")
        .groupBy("m.status")
        .getRawMany<{ status: MandateStatus; count: number }>(),
      mandateRepo
        .createQueryBuilder("m")
        .select("m.county", "county")
        .addSelect("COUNT(*)::int", "count")
        .where("m.county IS NOT NULL")
        .groupBy("m.county")
        .orderBy("count", "DESC")
        .limit(10)
        .getRawMany<{ county: string; count: number }>(),
      mandateRepo
        .createQueryBuilder("m")
        .select("DATE(m.first_reported_at)", "date")
        .addSelect("COUNT(*)::int", "count")
        .where("m.first_reported_at >= NOW() - INTERVAL '30 days'")
        .groupBy("DATE(m.first_reported_at)")
        .orderBy("DATE(m.first_reported_at)", "ASC")
        .getRawMany<{ date: string; count: number }>()
    ]);

    // Top responsiveness — compute over authorities that own ≥1 mandate.
    const authoritiesWithMandates = await mandateRepo
      .createQueryBuilder("m")
      .select("DISTINCT m.authority_id", "authority_id")
      .where("m.authority_id IS NOT NULL")
      .getRawMany<{ authority_id: string }>();

    const scored = await Promise.all(
      authoritiesWithMandates.slice(0, 50).map(async (row) => {
        const score = await computeResponsivenessIndex(row.authority_id);
        const authority = await authorityRepo.findOne({ where: { id: row.authority_id } });
        return { score, authority };
      })
    );

    const topResponsiveness = scored
      .filter((s): s is { score: typeof s.score; authority: Authority } => !!s.authority)
      .sort((a, b) => b.score.index - a.score.index)
      .slice(0, 5)
      .map((s) => ({
        authority: {
          id: s.authority.id,
          name: s.authority.name,
          level: s.authority.level,
          county: s.authority.county,
          constituency: s.authority.constituency,
          ward: s.authority.ward,
          verified: s.authority.verified
        },
        responsivenessIndex: s.score.index,
        assigned: s.score.mandatesTotal,
        acknowledged: s.score.mandatesAcknowledged,
        resolved: s.score.mandatesResolved
      }));

    const stats: DashboardStats = {
      totals: {
        mandates: totalMandates,
        authorities: totalAuthorities,
        acknowledgedPct: totalMandates === 0 ? 0 : Math.round((acknowledgedCount / totalMandates) * 1000) / 10,
        resolvedPct: totalMandates === 0 ? 0 : Math.round((resolvedCount / totalMandates) * 1000) / 10
      },
      byCategory,
      byUrgency,
      byStatus,
      byCounty,
      trend30d: trendRows.map((r) => ({
        // pg returns Date for DATE; cast safely.
        date: typeof r.date === "string" ? r.date : new Date(r.date).toISOString().slice(0, 10),
        count: r.count
      })),
      topResponsiveness
    };

    res.json(stats);
  } catch (err) {
    next(err);
  }
});
