import { createApp } from "./app.js";
import { AppDataSource } from "./data-source.js";
import { env } from "./config/env.js";

async function bootstrap() {
  try {
    await AppDataSource.initialize();
    console.log("Database connection initialized");
  } catch (error) {
    console.warn("Database unavailable; API will run without persistence until Postgres is ready");
    console.warn(error);
  }

  createApp().listen(env.port, () => {
    console.log(`SautiLedger API listening on port ${env.port}`);
  });
}

void bootstrap();
