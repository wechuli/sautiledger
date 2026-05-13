import "dotenv/config";

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/sautiledger",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  aiProvider: (process.env.AI_PROVIDER ?? "mock") as "mock" | "openai",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  serveStaticFrontend: process.env.SERVE_STATIC_FRONTEND !== "false",
  submissionHashSalt:
    process.env.SUBMISSION_HASH_SALT ?? "local-development-only",
  sessionSecret:
    process.env.SESSION_SECRET ?? "local-development-only-change-me",
  institutionDemoKey:
    process.env.INSTITUTION_DEMO_KEY ?? "demo-institution-key",
};
