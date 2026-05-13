import "reflect-metadata";
import fs from "node:fs";
import path from "node:path";
import { DataSource } from "typeorm";
import { env } from "./config/env.js";
import { Citizen } from "./entities/citizen.entity.js";
import { InstitutionResponse } from "./entities/institution-response.entity.js";
import { Mandate } from "./entities/mandate.entity.js";
import { MandateUpvote } from "./entities/mandate-upvote.entity.js";
import { StatusHistory } from "./entities/status-history.entity.js";
import { Submission } from "./entities/submission.entity.js";

// Ensure the parent directory for the SQLite file exists.
const dbPath = path.resolve(env.databasePath);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const AppDataSource = new DataSource({
  type: "better-sqlite3",
  database: dbPath,
  entities: [
    Citizen,
    Mandate,
    MandateUpvote,
    Submission,
    InstitutionResponse,
    StatusHistory,
  ],
  // No migration files for the MVP — schema is derived from the entities.
  // Switch to migrations + synchronize:false if/when this stabilizes.
  synchronize: true,
  logging: env.nodeEnv === "development" ? ["error", "warn"] : false,
});
