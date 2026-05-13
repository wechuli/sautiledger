import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { ZodError } from "zod";
import { env } from "./config/env.js";
import { logger } from "./logger.js";
import { authoritiesRouter } from "./routes/authorities.js";
import { citizensRouter } from "./routes/citizens.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { healthRouter } from "./routes/health.js";
import { mandatesRouter } from "./routes/mandates.js";
import { submissionsRouter } from "./routes/submissions.js";
import { trackingRouter } from "./routes/tracking.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: "512kb" }));
  app.use(
    pinoHttp({
      logger,
      // Drop the noisy default `req`/`res` serializers for static asset paths.
      autoLogging: {
        ignore: (req: { url?: string }) => req.url?.startsWith("/assets/") ?? false
      }
    })
  );

  app.use("/api/health", healthRouter);
  app.use("/api/citizens", citizensRouter);
  app.use("/api/authorities", authoritiesRouter);
  app.use("/api/submissions", submissionsRouter);
  app.use("/api/mandates", mandatesRouter);
  app.use("/api/tracking", trackingRouter);
  app.use("/api/dashboard", dashboardRouter);

  const staticPath = path.resolve(__dirname, "../../web/dist");
  if (env.serveStaticFrontend && env.nodeEnv === "production") {
    app.use(express.static(staticPath));
    app.get("*", (_req, res) => res.sendFile(path.join(staticPath, "index.html")));
  }

  app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Invalid request", details: error.flatten() });
      return;
    }

    (req as any).log?.error?.({ err: error }, "unhandled error");
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
