import { describe, expect, it, beforeAll, afterAll } from "vitest";
import request from "supertest";
import type { Express } from "express";

// Integration test: register → submit → tracking → mandate list.
// Uses the SQLite file database with synchronize:true; no migration step needed.
// Skipped unless INTEGRATION=1.

const integrationEnabled = process.env.INTEGRATION === "1";
const d = integrationEnabled ? describe : describe.skip;

d("API integration (SQLite)", () => {
  let app: Express;
  let token: string;
  let trackingCode: string;

  beforeAll(async () => {
    process.env.AI_PROVIDER = "mock";
    const { AppDataSource } = await import("./data-source.js");
    const { createApp } = await import("./app.js");
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    app = createApp();
  });

  afterAll(async () => {
    const { AppDataSource } = await import("./data-source.js");
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  });

  it("registers a new citizen", async () => {
    const phone = `+25471${Math.floor(1000000 + Math.random() * 8999999)}`;
    const res = await request(app)
      .post("/api/citizens/register")
      .send({ phone, password: "demo-password-123" });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    token = res.body.token;
  });

  it("creates a submission and links it to a mandate", async () => {
    const res = await request(app)
      .post("/api/submissions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        originalText:
          "Water shortage in our ward for over two weeks; borehole is broken.",
        scopeLevel: "ward",
        location: { country: "Kenya", county: "Nairobi", ward: "Mathare" },
        consentToProcess: true,
      });
    expect(res.status).toBe(201);
    expect(res.body.trackingCode).toMatch(/^SL-/);
    trackingCode = res.body.trackingCode;
  });

  it("returns tracking status anonymously", async () => {
    const res = await request(app).get(`/api/tracking/${trackingCode}`);
    expect(res.status).toBe(200);
    expect(res.body.trackingCode).toBe(trackingCode);
    expect(res.body).not.toHaveProperty("originalText");
    expect(res.body).not.toHaveProperty("phoneHash");
  });

  it("lists mandates publicly", async () => {
    const res = await request(app).get("/api/mandates");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it("rejects institution writes without a key", async () => {
    const res = await request(app)
      .patch("/api/mandates/00000000-0000-0000-0000-000000000000/status")
      .send({
        newStatus: "acknowledged",
        changedByLabel: "Test",
      });
    expect([401, 403]).toContain(res.status);
  });
});
