import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { healthRouter } from "./routes/health.js";
import { submissionsRouter } from "./routes/submissions.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: "512kb" }));

  app.use("/api/health", healthRouter);
  app.use("/api/submissions", submissionsRouter);

  const staticPath = path.resolve(__dirname, "../../web/dist");
  if (env.serveStaticFrontend && env.nodeEnv === "production") {
    app.use(express.static(staticPath));
    app.get("*", (_req, res) => res.sendFile(path.join(staticPath, "index.html")));
  }

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Invalid submission", details: error.flatten() });
      return;
    }

    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
