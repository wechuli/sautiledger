import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "./config/env.js";
import { Submission } from "./entities/submission.entity.js";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: env.databaseUrl,
  entities: [Submission],
  migrations: ["dist/migrations/*.js"],
  synchronize: false,
  logging: env.nodeEnv === "development"
});
