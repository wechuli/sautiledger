import "reflect-metadata";
import { AppDataSource } from "../data-source.js";
import { Authority } from "../entities/authority.entity.js";

/**
 * Seed a small, representative set of Kenyan authorities so the submission
 * form has something to point at and the dashboard can render responsiveness.
 *
 * Idempotent: re-running only inserts authorities not already present (by name).
 */
const seedAuthorities: Array<Omit<Authority, "id" | "createdAt" | "updatedAt">> = [
  {
    name: "Ministry of Water, Sanitation and Irrigation",
    level: "national",
    county: null,
    constituency: null,
    ward: null,
    description: "National ministry responsible for water resources and sanitation policy.",
    contactEmail: null,
    verified: true
  },
  {
    name: "Ministry of Health",
    level: "national",
    county: null,
    constituency: null,
    ward: null,
    description: "National ministry responsible for public health policy and major facilities.",
    contactEmail: null,
    verified: true
  },
  {
    name: "Ministry of Roads and Transport",
    level: "national",
    county: null,
    constituency: null,
    ward: null,
    description: "National ministry responsible for trunk roads and transport infrastructure.",
    contactEmail: null,
    verified: true
  },
  {
    name: "Nairobi County Water Department",
    level: "county",
    county: "Nairobi",
    constituency: null,
    ward: null,
    description: "County-level water department for Nairobi.",
    contactEmail: null,
    verified: true
  },
  {
    name: "Nairobi County Health Department",
    level: "county",
    county: "Nairobi",
    constituency: null,
    ward: null,
    description: "County-level health services for Nairobi.",
    contactEmail: null,
    verified: true
  },
  {
    name: "Kisumu County Water Department",
    level: "county",
    county: "Kisumu",
    constituency: null,
    ward: null,
    description: "County-level water department for Kisumu.",
    contactEmail: null,
    verified: true
  },
  {
    name: "Mombasa County Sanitation Department",
    level: "county",
    county: "Mombasa",
    constituency: null,
    ward: null,
    description: "County-level sanitation and waste management for Mombasa.",
    contactEmail: null,
    verified: true
  },
  {
    name: "Turkana County Health Department",
    level: "county",
    county: "Turkana",
    constituency: null,
    ward: null,
    description: "County-level health services for Turkana.",
    contactEmail: null,
    verified: true
  },
  {
    name: "Kibra Constituency Office",
    level: "constituency",
    county: "Nairobi",
    constituency: "Kibra",
    ward: null,
    description: "MP's constituency office for Kibra.",
    contactEmail: null,
    verified: false
  },
  {
    name: "Mathare Ward Administrator",
    level: "ward",
    county: "Nairobi",
    constituency: "Mathare",
    ward: "Mathare",
    description: "Ward administration office for Mathare.",
    contactEmail: null,
    verified: false
  },
  {
    name: "Kondele Ward Administrator",
    level: "ward",
    county: "Kisumu",
    constituency: "Kisumu Central",
    ward: "Kondele",
    description: "Ward administration office for Kondele.",
    contactEmail: null,
    verified: false
  }
];

async function run() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(Authority);

  let inserted = 0;
  let skipped = 0;
  for (const a of seedAuthorities) {
    const existing = await repo.findOne({ where: { name: a.name } });
    if (existing) {
      skipped += 1;
      continue;
    }
    await repo.save(repo.create(a as Partial<Authority>));
    inserted += 1;
  }

  console.log(`Seed complete: ${inserted} inserted, ${skipped} already present.`);
  await AppDataSource.destroy();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
