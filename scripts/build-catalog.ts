// Builds catalog/snapshot.json from Fireroad. Run once a semester, review the diff and
// commit it; the server loads a new snapshot the next time it starts (src/catalog/import.ts).
//
//   bun run catalog:build                 academic year from today's date
//   bun run catalog:build --year 2026     the academic year starting in FALL 2026
//   bun run catalog:build --from all.json read a saved copy of Fireroad's response

import { parseArgs } from "node:util";
import { academicYearOf, FIREROAD_URL, fromFireroad, type FireroadCourse } from "../src/catalog/fireroad.ts";
import { SNAPSHOT_PATH } from "../src/catalog/import.ts";

const { values } = parseArgs({
  options: { year: { type: "string" }, from: { type: "string" } },
});

const today = new Date();
const academicYear = values.year ? Number(values.year) : academicYearOf(today);
if (!Number.isInteger(academicYear)) throw new Error(`--year must be a year, not ${values.year}`);

let raw: FireroadCourse[];
if (values.from) {
  raw = await Bun.file(values.from).json();
} else {
  console.log(`Fetching ${FIREROAD_URL} ...`);
  const response = await fetch(FIREROAD_URL);
  if (!response.ok) throw new Error(`Fireroad answered ${response.status}`);
  raw = await response.json();
}
if (!Array.isArray(raw) || raw.length === 0) throw new Error("Fireroad answered no courses");

const pad = (n: number) => String(n).padStart(2, "0");
const id = `fireroad-${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
const { snapshot, stats } = fromFireroad(raw, { academicYear, id });

// One course per line keeps the committed diff readable.
const json =
  `{"id":${JSON.stringify(snapshot.id)},"source":${JSON.stringify(snapshot.source)},` +
  `"academicYear":${snapshot.academicYear},"courses":[\n` +
  snapshot.courses.map((c) => JSON.stringify(c)).join(",\n") +
  "\n]}\n";
await Bun.write(SNAPSHOT_PATH, json);

const count = (f: (c: (typeof snapshot.courses)[number]) => boolean) => snapshot.courses.filter(f).length;
console.log(`Wrote ${snapshot.courses.length} subjects to ${SNAPSHOT_PATH} (id ${id}, academic year ${academicYear}-${academicYear + 1})`);
console.log(`  with prerequisites: ${count((c) => c.prerequisites.length > 0)}, with ratings: ${count((c) => !!c.rating)}`);
console.log(`  not offered this year: ${count((c) => c.offering === "Not offered THIS year")}, next year: ${count((c) => c.offering === "Not offered NEXT year")}, not listed: ${count((c) => c.offering === "Not currently listed")}`);
console.log(`  groups dropped as free text (e.g. permission of instructor): ${stats.freeTextGroups}`);
console.log(`  options dropped as not in the catalog: ${stats.unknownSubjects}`);
for (const [label, list] of [["unparsed", stats.unparsed], ["too large", stats.tooLarge]] as const) {
  console.log(`  requirements left out as ${label}: ${list.length}`);
  for (const s of list.slice(0, 20)) console.log(`    ${s}`);
}
