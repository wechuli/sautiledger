import "reflect-metadata";
import bcrypt from "bcrypt";
import { AppDataSource } from "../data-source.js";
import { Authority } from "../entities/authority.entity.js";
import { Citizen } from "../entities/citizen.entity.js";
import { InstitutionResponse } from "../entities/institution-response.entity.js";
import { Mandate } from "../entities/mandate.entity.js";
import { StatusHistory } from "../entities/status-history.entity.js";
import { Submission } from "../entities/submission.entity.js";
import { normalizeKenyanPhone } from "../services/citizen-auth.js";
import { createTrackingCode, hashContactIdentifier } from "../services/privacy.js";

// ---------------------------------------------------------------------
// Demo seed: 3 citizens, 3 mandates with clustered submissions, and
// institution responses. Idempotent — keyed by phone hash + mandate title.
// ---------------------------------------------------------------------

type DemoMandate = {
  title: string;
  summary: string;
  formalMandateText: string;
  category: Mandate["category"];
  urgency: Mandate["urgency"];
  status: Mandate["status"];
  authorityName: string;
  county: string;
  constituency?: string;
  ward?: string;
  submissions: Array<{ phone: string; text: string }>;
  responses: Array<{ responderLabel: string; responseText: string; newStatus?: Mandate["status"] }>;
};

const DEMO_PHONES = ["+254700000001", "+254700000002", "+254700000003"];
const DEMO_PASSWORD = "demo-password-123";

const demoMandates: DemoMandate[] = [
  {
    title: "Restore reliable water access in Mathare ward",
    summary:
      "Residents report a non-functional borehole and delayed county response affecting daily water access in Mathare.",
    formalMandateText:
      "The county water department should inspect the Mathare borehole, restore supply, and publish a maintenance timeline within 14 days.",
    category: "water",
    urgency: "high",
    status: "acknowledged",
    authorityName: "Nairobi County Water Department",
    county: "Nairobi",
    constituency: "Mathare",
    ward: "Mathare",
    submissions: [
      {
        phone: DEMO_PHONES[0],
        text: "Huku maji imekuwa shida for weeks. Borehole iko dead na chief anasema tu ngoja."
      },
      {
        phone: DEMO_PHONES[1],
        text: "We've had no water in our area for over two weeks. The community borehole stopped working."
      },
      {
        phone: DEMO_PHONES[2],
        text: "Maji haitoki, na hakuna jibu kutoka kwa county. We need help."
      }
    ],
    responses: [
      {
        responderLabel: "Nairobi County Water Office",
        responseText:
          "We have received the reports and dispatched a technical team to inspect the borehole this week. We will share a restoration timeline by Friday.",
        newStatus: "acknowledged"
      }
    ]
  },
  {
    title: "Restock dispensary medicine in Kondele ward",
    summary:
      "Residents report the local dispensary has been without basic medicines for several weeks.",
    formalMandateText:
      "The county health department should audit the Kondele dispensary stock, restock essential medicines, and report on supply chain gaps within 21 days.",
    category: "health",
    urgency: "high",
    status: "in_progress",
    authorityName: "Kisumu County Water Department", // intentional fallback to a county-level entry; will be replaced if better one exists
    county: "Kisumu",
    constituency: "Kisumu Central",
    ward: "Kondele",
    submissions: [
      {
        phone: DEMO_PHONES[0],
        text: "The dispensary has had no medicine for two months. We have to travel to town for basic painkillers."
      },
      {
        phone: DEMO_PHONES[1],
        text: "Dispensary yetu haina dawa kabisa. Watoto wanaumwa na tunaambiwa tununue private."
      }
    ],
    responses: [
      {
        responderLabel: "Kisumu County Health Office",
        responseText:
          "We are aware of the stockouts and are coordinating with KEMSA. A first restock is expected within 10 days.",
        newStatus: "in_progress"
      }
    ]
  },
  {
    title: "Repair impassable ward road in Kibra",
    summary:
      "Heavy rains have damaged the ward road, blocking ambulances and stranding residents.",
    formalMandateText:
      "The responsible roads authority should grade and patch the affected sections of the ward road and publish a repair schedule within 30 days.",
    category: "roads",
    urgency: "critical",
    status: "new",
    authorityName: "Kibra Constituency Office",
    county: "Nairobi",
    constituency: "Kibra",
    ward: undefined,
    submissions: [
      {
        phone: DEMO_PHONES[2],
        text: "Barabara ya ward yetu imeharibika na magari ya wagonjwa yanakwama. Hii ni emergency."
      }
    ],
    responses: []
  }
];

async function ensureCitizen(phone: string): Promise<Citizen> {
  const repo = AppDataSource.getRepository(Citizen);
  const e164 = normalizeKenyanPhone(phone);
  const phoneHash = hashContactIdentifier(e164)!;
  let citizen = await repo.findOne({ where: { phoneHash } });
  if (citizen) return citizen;
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  citizen = repo.create({ phoneHash, passwordHash, countyHint: "Nairobi" });
  return repo.save(citizen);
}

async function run() {
  await AppDataSource.initialize();

  const authorityRepo = AppDataSource.getRepository(Authority);
  const mandateRepo = AppDataSource.getRepository(Mandate);
  const submissionRepo = AppDataSource.getRepository(Submission);
  const responseRepo = AppDataSource.getRepository(InstitutionResponse);
  const historyRepo = AppDataSource.getRepository(StatusHistory);

  let createdMandates = 0;
  let createdSubmissions = 0;
  let createdResponses = 0;

  for (const demo of demoMandates) {
    const existing = await mandateRepo.findOne({ where: { title: demo.title } });
    if (existing) continue;

    const authority = await authorityRepo.findOne({ where: { name: demo.authorityName } });
    if (!authority) {
      console.warn(`Skipping mandate "${demo.title}": authority not found (run authority seed first).`);
      continue;
    }

    const now = new Date();
    const mandate = await mandateRepo.save(
      mandateRepo.create({
        title: demo.title,
        summary: demo.summary,
        formalMandateText: demo.formalMandateText,
        category: demo.category,
        urgency: demo.urgency,
        status: demo.status,
        authorityId: authority.id,
        county: demo.county,
        constituency: demo.constituency ?? null,
        ward: demo.ward ?? null,
        submissionCount: demo.submissions.length,
        evidenceStrength:
          Math.round(
            (0.6 * Math.min(1, Math.log10(Math.max(1, demo.submissions.length)) / 2) + 0.4 * 0.8) * 1000
          ) / 1000,
        firstReportedAt: now,
        lastActivityAt: now
      })
    );
    createdMandates += 1;

    await historyRepo.save(
      historyRepo.create({
        mandateId: mandate.id,
        oldStatus: null,
        newStatus: "new",
        changedByLabel: "seed:demo",
        note: "Demo mandate created via seed"
      })
    );

    // Submissions
    for (const sub of demo.submissions) {
      const citizen = await ensureCitizen(sub.phone);
      await submissionRepo.save(
        submissionRepo.create({
          trackingCode: createTrackingCode(),
          citizenId: citizen.id,
          targetAuthorityId: authority.id,
          mandateId: mandate.id,
          originalText: sub.text,
          normalizedText: sub.text,
          detectedLanguage: "mixed",
          category: demo.category,
          urgency: demo.urgency,
          processingStatus: "processed",
          location: {
            country: "Kenya",
            county: demo.county,
            constituency: demo.constituency,
            ward: demo.ward
          },
          aiResult: null
        })
      );
      createdSubmissions += 1;
    }

    // Responses + status transitions
    for (const r of demo.responses) {
      await responseRepo.save(
        responseRepo.create({
          mandateId: mandate.id,
          authorityId: authority.id,
          responderLabel: r.responderLabel,
          responseText: r.responseText,
          newStatus: r.newStatus ?? null
        })
      );
      createdResponses += 1;
      if (r.newStatus && r.newStatus !== "new") {
        await historyRepo.save(
          historyRepo.create({
            mandateId: mandate.id,
            oldStatus: "new",
            newStatus: r.newStatus,
            changedByLabel: r.responderLabel,
            note: "Status set via demo response"
          })
        );
      }
    }
  }

  console.log(
    `Demo seed complete: ${createdMandates} mandates, ${createdSubmissions} submissions, ${createdResponses} responses.`
  );
  await AppDataSource.destroy();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
