import { AppDataSource } from "../data-source.js";
import { InstitutionResponse } from "../entities/institution-response.entity.js";
import { Mandate } from "../entities/mandate.entity.js";

// ---------------------------------------------------------------------
// Responsiveness Index
// 0..1 — combines acknowledgement rate, resolution rate, and how quickly
// the authority responds on average. Computed on-read; cheap for MVP.
// ---------------------------------------------------------------------

export type ResponsivenessScore = {
  authorityId: string;
  mandatesTotal: number;
  mandatesAcknowledged: number;
  mandatesResolved: number;
  avgFirstResponseHours: number | null;
  index: number;
};

const ACK_STATUSES = ["acknowledged", "in_progress", "resolved"];
const RESOLVED_STATUSES = ["resolved"];

export async function computeResponsivenessIndex(authorityId: string): Promise<ResponsivenessScore> {
  const mandateRepo = AppDataSource.getRepository(Mandate);
  const responseRepo = AppDataSource.getRepository(InstitutionResponse);

  const mandates = await mandateRepo.find({ where: { authorityId } });
  const total = mandates.length;
  if (total === 0) {
    return {
      authorityId,
      mandatesTotal: 0,
      mandatesAcknowledged: 0,
      mandatesResolved: 0,
      avgFirstResponseHours: null,
      index: 0
    };
  }

  const acknowledged = mandates.filter((m) => ACK_STATUSES.includes(m.status)).length;
  const resolved = mandates.filter((m) => RESOLVED_STATUSES.includes(m.status)).length;

  // Average hours from mandate creation to first institution response.
  const mandateIds = mandates.map((m) => m.id);
  const responses = await responseRepo
    .createQueryBuilder("r")
    .where("r.mandate_id IN (:...ids)", { ids: mandateIds })
    .orderBy("r.created_at", "ASC")
    .getMany();

  const firstByMandate = new Map<string, Date>();
  for (const r of responses) {
    if (!firstByMandate.has(r.mandateId)) firstByMandate.set(r.mandateId, r.createdAt);
  }

  let respondedCount = 0;
  let totalHours = 0;
  for (const m of mandates) {
    const firstAt = firstByMandate.get(m.id);
    if (!firstAt) continue;
    const hours = (firstAt.getTime() - m.firstReportedAt.getTime()) / (1000 * 60 * 60);
    if (hours >= 0) {
      totalHours += hours;
      respondedCount += 1;
    }
  }
  const avgHours = respondedCount > 0 ? totalHours / respondedCount : null;

  const ackRate = acknowledged / total;
  const resolutionRate = resolved / total;
  // Speed factor: 1 if responded within 24h, decays to 0 over 30 days.
  const speedFactor =
    avgHours === null ? 0 : Math.max(0, Math.min(1, 1 - Math.max(0, avgHours - 24) / (24 * 30)));

  const index = Math.round((0.4 * ackRate + 0.4 * resolutionRate + 0.2 * speedFactor) * 1000) / 1000;

  return {
    authorityId,
    mandatesTotal: total,
    mandatesAcknowledged: acknowledged,
    mandatesResolved: resolved,
    avgFirstResponseHours: avgHours === null ? null : Math.round(avgHours * 10) / 10,
    index
  };
}
