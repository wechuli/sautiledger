import { Router } from "express";
import { z } from "zod";
import { AppDataSource } from "../data-source.js";
import { Authority } from "../entities/authority.entity.js";
import { AUTHORITY_LEVELS } from "@sautiledger/shared";

const querySchema = z.object({
  level: z.enum(AUTHORITY_LEVELS).optional(),
  county: z.string().optional(),
  q: z.string().optional()
});

export const authoritiesRouter = Router();

authoritiesRouter.get("/", async (req, res, next) => {
  try {
    const { level, county, q } = querySchema.parse(req.query);
    const repo = AppDataSource.getRepository(Authority);
    const qb = repo.createQueryBuilder("a").orderBy("a.level", "ASC").addOrderBy("a.name", "ASC");
    if (level) qb.andWhere("a.level = :level", { level });
    if (county) qb.andWhere("(a.county = :county OR a.level = 'national')", { county });
    if (q) qb.andWhere("LOWER(a.name) LIKE :q", { q: `%${q.toLowerCase()}%` });
    const rows = await qb.getMany();
    res.json(
      rows.map((a) => ({
        id: a.id,
        name: a.name,
        level: a.level,
        county: a.county ?? null,
        constituency: a.constituency ?? null,
        ward: a.ward ?? null,
        verified: a.verified
      }))
    );
  } catch (err) {
    next(err);
  }
});
