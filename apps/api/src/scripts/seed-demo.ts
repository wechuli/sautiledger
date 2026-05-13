import "reflect-metadata";
import bcrypt from "bcrypt";
import { responsibleOffice, type ScopeLevel } from "@sautiledger/shared";
import { AppDataSource } from "../data-source.js";
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
  scopeLevel: ScopeLevel;
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
    title: "Restore reliable water access in Mabatini ward",
    summary:
      "Residents report a non-functional borehole and delayed county response affecting daily water access in Mabatini, Mathare.",
    formalMandateText: [
      "Community Mandate: Restore reliable water access in Mabatini ward.",
      "Location: Mabatini ward, Mathare constituency, Nairobi County. Scope: county. Urgency: high.",
      "Background: Residents of Mabatini ward report that the community borehole has been non-functional for several weeks. Households, schools, and small businesses are without a dependable water source, and previous calls to the area chief and county office have not produced a documented response.",
      "Responsible body: Nairobi County Government. The community requests (i) an inspection report on the borehole within seven days, (ii) a restoration plan with timelines for repair or alternative supply within fourteen days, and (iii) a maintenance schedule that prevents repeat outages.",
      "Expected response: The concern has persisted long enough to affect daily life. A formal acknowledgement is requested within one week and an initial response within two weeks.",
      "This mandate aggregates anonymized community submissions. Individual submitters are not identified.",
    ].join("\n\n"),
    category: "water",
    urgency: "high",
    status: "acknowledged",
    scopeLevel: "county",
    county: "Nairobi",
    constituency: "Mathare",
    ward: "Mabatini",
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
        responderLabel: "Nairobi County Water and Sanitation Office",
        responseText:
          "We have received the reports and dispatched a technical team to inspect the borehole this week. We will share a restoration timeline by Friday.",
        newStatus: "acknowledged",
      },
    ],
  },
  {
    title: "Restore reliable water supply in Township (Kiambu) ward",
    summary:
      "Residents of Kiambu Township report extended water rationing and unreliable kiosks affecting households and small traders.",
    formalMandateText: [
      "Community Mandate: Restore reliable water supply in Township (Kiambu) ward.",
      "Location: Township (Kiambu) ward, Kiambu constituency, Kiambu County. Scope: county. Urgency: high.",
      "Background: Households and small businesses in Kiambu Township report intermittent piped water for several weeks; community water kiosks are frequently dry. Residents are buying water from informal vendors at inflated rates.",
      "Responsible body: Kiambu County Government. The community requests (i) a public statement on the cause of the rationing within seven days, (ii) a published restoration schedule with named officers within fourteen days, and (iii) interim water bowser support for affected sub-locations until piped supply is restored.",
      "Expected response: A formal acknowledgement is requested within one week and an initial response within two weeks.",
      "This mandate aggregates anonymized community submissions. Individual submitters are not identified.",
    ].join("\n\n"),
    category: "water",
    urgency: "high",
    status: "in_progress",
    scopeLevel: "county",
    county: "Kiambu",
    constituency: "Kiambu",
    ward: "Township (Kiambu)",
    submissions: [
      {
        phone: DEMO_PHONES[0],
        text: "Maji haijatoka kwa pipe for three weeks. Tunalipa mavendor pesa mingi sana.",
      },
      {
        phone: DEMO_PHONES[1],
        text: "Our water kiosk in Kiambu Township has been dry. Children are getting sick from buying water elsewhere.",
      },
    ],
    responses: [
      {
        responderLabel: "Kiambu County Water Office",
        responseText:
          "We acknowledge the rationing and have begun assessing the supply line. A bowser schedule will be published this week.",
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
      "Location: Laini Saba ward, Kibra constituency, Nairobi County. Scope: constituency. Urgency: critical.",
      "Background: Recent heavy rains have damaged sections of the ward road serving the community. The road is currently impassable to ambulances and to vehicles transporting goods. Residents report disrupted medical emergencies and school transport.",
      "Responsible body: Kibra Constituency Office. The community requests (i) emergency grading and patching of the most damaged sections within seventy-two hours, (ii) a published repair schedule with named contractors within fourteen days, and (iii) a follow-up assessment after the next rainy period.",
      "Expected response: Residents describe an immediate risk to life and essential services. This mandate requires urgent acknowledgement within forty-eight hours and a documented response plan within one week.",
      "This mandate aggregates anonymized community submissions. Individual submitters are not identified.",
    ].join("\n\n"),
    category: "roads",
    urgency: "critical",
    status: "new",
    scopeLevel: "constituency",
    county: "Nairobi",
    constituency: "Kibra",
    ward: "Laini Saba",
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

  const mandateRepo = AppDataSource.getRepository(Mandate);
  const submissionRepo = AppDataSource.getRepository(Submission);
  const responseRepo = AppDataSource.getRepository(InstitutionResponse);
  const historyRepo = AppDataSource.getRepository(StatusHistory);

  let createdMandates = 0;
  let createdSubmissions = 0;
  let createdResponses = 0;

  for (const demo of demoMandates) {
    const loc = {
      country: "Kenya" as const,
      county: demo.county,
      constituency: demo.constituency,
      ward: demo.ward,
    };
    const office = responsibleOffice(demo.scopeLevel, loc);

    const existing = await mandateRepo.findOne({
      where: { title: demo.title },
    });
    if (existing) {
      let changed = false;
      if (existing.formalMandateText !== demo.formalMandateText) {
        existing.formalMandateText = demo.formalMandateText;
        changed = true;
      }
      if (existing.summary !== demo.summary) {
        existing.summary = demo.summary;
        changed = true;
      }
      if (existing.scopeLevel !== demo.scopeLevel) {
        existing.scopeLevel = demo.scopeLevel;
        changed = true;
      }
      if (existing.responsibleOffice !== office) {
        existing.responsibleOffice = office;
        changed = true;
      }
      if (existing.county !== demo.county) {
        existing.county = demo.county;
        changed = true;
      }
      if ((existing.constituency ?? null) !== (demo.constituency ?? null)) {
        existing.constituency = demo.constituency ?? null;
        changed = true;
      }
      if ((existing.ward ?? null) !== (demo.ward ?? null)) {
        existing.ward = demo.ward ?? null;
        changed = true;
      }
      if (changed) {
        await mandateRepo.save(existing);
        console.log(`Refreshed mandate: ${demo.title}`);
      }
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
        scopeLevel: demo.scopeLevel,
        responsibleOffice: office,
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

    for (const sub of demo.submissions) {
      const citizen = await ensureCitizen(sub.phone);
      await submissionRepo.save(
        submissionRepo.create({
          trackingCode: createTrackingCode(),
          citizenId: citizen.id,
          mandateId: mandate.id,
          scopeLevel: demo.scopeLevel,
          originalText: sub.text,
          normalizedText: sub.text,
          detectedLanguage: "mixed",
          category: demo.category,
          urgency: demo.urgency,
          processingStatus: "processed",
          location: loc,
          aiResult: null,
        }),
      );
      createdSubmissions += 1;
    }

    for (const resp of demo.responses) {
      await responseRepo.save(
        responseRepo.create({
          mandateId: mandate.id,
          responderLabel: resp.responderLabel,
          responseText: resp.responseText,
          newStatus: resp.newStatus ?? null,
        }),
      );
      if (resp.newStatus && resp.newStatus !== "new") {
        await historyRepo.save(
          historyRepo.create({
            mandateId: mandate.id,
            oldStatus: "new",
            newStatus: resp.newStatus,
            changedByLabel: resp.responderLabel,
            note: "Status updated via demo response",
          }),
        );
      }
      createdResponses += 1;
    }
  }

  console.log(
    `Seed complete. Mandates created: ${createdMandates}, submissions: ${createdSubmissions}, responses: ${createdResponses}.`,
  );
  await AppDataSource.destroy();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
