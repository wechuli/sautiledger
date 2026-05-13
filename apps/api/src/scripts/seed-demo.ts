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
import {
  createTrackingCode,
  hashContactIdentifier,
} from "../services/privacy.js";

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
  responses: Array<{
    responderLabel: string;
    responseText: string;
    newStatus?: Mandate["status"];
  }>;
};

const DEMO_PHONES = ["+254700000001", "+254700000002", "+254700000003"];
const DEMO_PASSWORD = "demo-password-123";

const demoMandates: DemoMandate[] = [
  {
    title: "Restore reliable water access in Mathare ward",
    summary:
      "Residents report a non-functional borehole and delayed county response affecting daily water access in Mathare.",
    formalMandateText: [
      "Community Mandate: Restore reliable water access in Mathare ward.",
      "Location: Mathare ward, Mathare constituency, Nairobi County. Issue area: water access. Urgency: high.",
      "Background: Residents of Mathare ward report that the community borehole has been non-functional for several weeks. Households, schools, and small businesses are without a dependable water source, and previous calls to the area chief and county office have not produced a documented response. The disruption is affecting hygiene, food preparation, and the daily routines of women and children who are walking long distances to fetch water.",
      "Responsible body: Nairobi County Water Department, supported by the Mathare ward administrator. The community requests that this office publish (i) an inspection report on the borehole within seven days, (ii) a restoration plan with timelines for repair or alternative supply within fourteen days, and (iii) a maintenance schedule that prevents repeat outages.",
      "Expected response: The concern has persisted long enough to affect daily life across the community. A formal acknowledgement is requested within one week and an initial response within two weeks.",
      "This mandate aggregates anonymized community submissions reporting the same concern. Individual submitters are not identified. The mandate is intended for review, editing, and public response by accountable institutions.",
    ].join("\n\n"),
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
        text: "Huku maji imekuwa shida for weeks. Borehole iko dead na chief anasema tu ngoja.",
      },
      {
        phone: DEMO_PHONES[1],
        text: "We've had no water in our area for over two weeks. The community borehole stopped working.",
      },
      {
        phone: DEMO_PHONES[2],
        text: "Maji haitoki, na hakuna jibu kutoka kwa county. We need help.",
      },
    ],
    responses: [
      {
        responderLabel: "Nairobi County Water Office",
        responseText:
          "We have received the reports and dispatched a technical team to inspect the borehole this week. We will share a restoration timeline by Friday.",
        newStatus: "acknowledged",
      },
    ],
  },
  {
    title: "Restock dispensary medicine in Kondele ward",
    summary:
      "Residents report the local dispensary has been without basic medicines for several weeks.",
    formalMandateText: [
      "Community Mandate: Restock essential medicines at Kondele ward dispensary.",
      "Location: Kondele ward, Kisumu Central constituency, Kisumu County. Issue area: health services. Urgency: high.",
      "Background: Residents report that the Kondele dispensary has been without basic medicines for an extended period. Families are travelling further or paying private providers for treatments that should be available at the dispensary, and parents with young children are reporting deteriorating outcomes for routine illnesses. The stock-out points to a supply chain breakdown rather than a one-off event.",
      "Responsible body: Kisumu County Department of Health, in coordination with KEMSA and the Kondele ward administrator. The community requests (i) an audit of the dispensary's current stock and ordering history within seven days, (ii) an emergency restock of essential medicines within fourteen days, and (iii) a public statement on the supply chain gap and the measures that will prevent recurrence within twenty-one days.",
      "Expected response: The concern has persisted long enough to affect daily life across the community. A formal acknowledgement is requested within one week and an initial response within two weeks.",
      "This mandate aggregates anonymized community submissions reporting the same concern. Individual submitters are not identified. The mandate is intended for review, editing, and public response by accountable institutions.",
    ].join("\n\n"),
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
        text: "The dispensary has had no medicine for two months. We have to travel to town for basic painkillers.",
      },
      {
        phone: DEMO_PHONES[1],
        text: "Dispensary yetu haina dawa kabisa. Watoto wanaumwa na tunaambiwa tununue private.",
      },
    ],
    responses: [
      {
        responderLabel: "Kisumu County Health Office",
        responseText:
          "We are aware of the stockouts and are coordinating with KEMSA. A first restock is expected within 10 days.",
        newStatus: "in_progress",
      },
    ],
  },
  {
    title: "Repair impassable ward road in Kibra",
    summary:
      "Heavy rains have damaged the ward road, blocking ambulances and stranding residents.",
    formalMandateText: [
      "Community Mandate: Repair impassable ward road in Kibra.",
      "Location: Kibra constituency, Nairobi County. Issue area: road infrastructure. Urgency: critical.",
      "Background: Recent heavy rains have damaged sections of the ward road serving the community. The road is currently impassable to ambulances and to vehicles transporting goods, and residents are reporting that medical emergencies and school transport have already been disrupted. Without urgent intervention, the community remains exposed to a preventable safety risk.",
      "Responsible body: Kibra Constituency Office and the Nairobi County Roads and Public Works department. The community requests (i) emergency grading and patching of the most damaged sections within seventy-two hours, (ii) a published repair schedule with named contractors and supervising officers within fourteen days, and (iii) a follow-up assessment after the next rainy period to confirm durability.",
      "Expected response: Residents describe an immediate risk to life, livelihoods, or essential services. This mandate requires urgent acknowledgement within forty-eight hours and a documented response plan within one week.",
      "This mandate aggregates anonymized community submissions reporting the same concern. Individual submitters are not identified. The mandate is intended for review, editing, and public response by accountable institutions.",
    ].join("\n\n"),
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
        text: "Barabara ya ward yetu imeharibika na magari ya wagonjwa yanakwama. Hii ni emergency.",
      },
    ],
    responses: [],
  },
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
    const existing = await mandateRepo.findOne({
      where: { title: demo.title },
    });
    if (existing) {
      // Keep the demo seed idempotent but refresh the drafted text so
      // demo databases pick up improvements to the seed copy.
      if (
        existing.formalMandateText !== demo.formalMandateText ||
        existing.summary !== demo.summary
      ) {
        existing.formalMandateText = demo.formalMandateText;
        existing.summary = demo.summary;
        await mandateRepo.save(existing);
        console.log(`Refreshed mandate copy: ${demo.title}`);
      }
      continue;
    }

    const authority = await authorityRepo.findOne({
      where: { name: demo.authorityName },
    });
    if (!authority) {
      console.warn(
        `Skipping mandate "${demo.title}": authority not found (run authority seed first).`,
      );
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
            (0.6 *
              Math.min(
                1,
                Math.log10(Math.max(1, demo.submissions.length)) / 2,
              ) +
              0.4 * 0.8) *
              1000,
          ) / 1000,
        firstReportedAt: now,
        lastActivityAt: now,
      }),
    );
    createdMandates += 1;

    await historyRepo.save(
      historyRepo.create({
        mandateId: mandate.id,
        oldStatus: null,
        newStatus: "new",
        changedByLabel: "seed:demo",
        note: "Demo mandate created via seed",
      }),
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
            ward: demo.ward,
          },
          aiResult: null,
        }),
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
          newStatus: r.newStatus ?? null,
        }),
      );
      createdResponses += 1;
      if (r.newStatus && r.newStatus !== "new") {
        await historyRepo.save(
          historyRepo.create({
            mandateId: mandate.id,
            oldStatus: "new",
            newStatus: r.newStatus,
            changedByLabel: r.responderLabel,
            note: "Status set via demo response",
          }),
        );
      }
    }
  }

  console.log(
    `Demo seed complete: ${createdMandates} mandates, ${createdSubmissions} submissions, ${createdResponses} responses.`,
  );
  await AppDataSource.destroy();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
