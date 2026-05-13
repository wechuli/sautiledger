import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "./config/env.js";
import { Authority } from "./entities/authority.entity.js";
import { Citizen } from "./entities/citizen.entity.js";
import { InstitutionResponse } from "./entities/institution-response.entity.js";
import { Mandate } from "./entities/mandate.entity.js";
import { StatusHistory } from "./entities/status-history.entity.js";
import { Submission } from "./entities/submission.entity.js";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: env.databaseUrl,
  entities: [
    Citizen,
    Authority,
    Mandate,
    Submission,
    InstitutionResponse,
    StatusHistory,
  ],
  // tsx-friendly: load migrations from src in dev, from dist in prod.
  migrations: [
    env.nodeEnv === "production"
      ? "dist/migrations/*.js"
      : "src/migrations/*.ts",
  ],
  synchronize: false,
  logging: env.nodeEnv === "development",
});
