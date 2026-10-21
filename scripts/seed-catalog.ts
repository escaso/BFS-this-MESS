// Development seed: puts a handful of real MIT subjects into Constrain's own
// subject facts (Listings and Dependencies), so that roads can pin subjects and
// find paths before CourseOffering.load parses the real listing and a
// synchronization copies its facts across (see the notebook, Oct 19).
//
// It only calls Constrain actions, so it goes through the concept like the
// future synchronization would. CourseOffering has no action to write courses
// other than load, so ratings and schedules stay empty.
//
// Run from the repo root: bun scripts/seed-catalog.ts   (safe to rerun)

import { client, db } from "../src/db.ts";
import { ConstrainConcept, NoListing, type Term } from "../src/concepts/Constrain.ts";

type Subject = {
  subject: string;
  units: number;
  technical: boolean;
  terms: Term[];
  // Each inner list is one dependency: at least one of its options is needed.
  prerequisites?: string[][];
};

// Units, terms and prerequisites are simplified from the MIT Subject Listing.
const SUBJECTS: Subject[] = [
  { subject: "18.01", units: 12, technical: false, terms: ["FALL", "SPRING"] },
  { subject: "18.02", units: 12, technical: false, terms: ["FALL", "SPRING"], prerequisites: [["18.01"]] },
  { subject: "18.06", units: 12, technical: false, terms: ["FALL", "SPRING"], prerequisites: [["18.02"]] },
  { subject: "6.100A", units: 6, technical: true, terms: ["FALL", "SPRING"] },
  { subject: "6.1010", units: 12, technical: true, terms: ["FALL", "SPRING"], prerequisites: [["6.100A"]] },
  { subject: "6.1020", units: 15, technical: true, terms: ["FALL", "SPRING"], prerequisites: [["6.1010"]] },
  { subject: "6.1200", units: 12, technical: true, terms: ["FALL", "SPRING"], prerequisites: [["18.01"]] },
  { subject: "6.1210", units: 12, technical: true, terms: ["FALL", "SPRING"], prerequisites: [["6.1010"], ["6.1200"]] },
  { subject: "6.1910", units: 12, technical: true, terms: ["FALL", "SPRING"], prerequisites: [["6.100A"]] },
  { subject: "6.1800", units: 12, technical: true, terms: ["SPRING"], prerequisites: [["6.1910"], ["6.1020"]] },
  { subject: "6.3700", units: 12, technical: true, terms: ["FALL", "SPRING"], prerequisites: [["18.02"], ["6.100A"]] },
  { subject: "6.9110", units: 12, technical: true, terms: ["IAP"] },
];

const constrain = new ConstrainConcept(db);

for (const s of SUBJECTS) {
  // Start from scratch so a rerun does not duplicate dependencies.
  try {
    await constrain.removeListing({ subject: s.subject });
  } catch (e) {
    if (!(e instanceof NoListing)) throw e;
  }
  await constrain.setListing({ subject: s.subject, units: s.units, technical: s.technical });
  for (const term of s.terms) await constrain.addListingTerm({ subject: s.subject, term });
  for (const options of s.prerequisites ?? []) {
    const { dependency } = await constrain.addDependency({ course: s.subject, kind: "PREREQUISITE", count: 1 });
    for (const option of options) await constrain.addDependencyOption({ dependency, subject: option });
  }
}

console.log(`Seeded ${SUBJECTS.length} subjects: ${SUBJECTS.map((s) => s.subject).join(", ")}`);
await client.close();
