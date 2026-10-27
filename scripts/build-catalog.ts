// Builds catalog/snapshot.json (subjects) and catalog/requirements.json (degree requirements)
// from Fireroad. Run once a semester, review the diff and commit it; the server loads new
// snapshots the next time it starts (src/catalog/import.ts).
//
//   bun run catalog:build                         academic year from today's date
//   bun run catalog:build --year 2026             the academic year starting in FALL 2026
//   bun run catalog:build --from all.json         read a saved copy of Fireroad's courses
//   bun run catalog:build --requirements-from reqs.json
//                                                 read saved requirement lists ({ listId: list })
//   bun run catalog:build --save-raw dir          also save Fireroad's responses there, for the two flags above

import { join } from "node:path";
import { parseArgs } from "node:util";
import { academicYearOf, FIREROAD_URL, fromFireroad, indexCatalog, type FireroadCourse } from "../src/catalog/fireroad.ts";
import { BROAD, fromFireroadRequirements, isPlannedList, REQUIREMENTS_URL, type FireroadRequirement } from "../src/catalog/requirements.ts";
import { REQUIREMENTS_PATH, SNAPSHOT_PATH } from "../src/catalog/import.ts";

const { values } = parseArgs({
  options: {
    year: { type: "string" },
    from: { type: "string" },
    "requirements-from": { type: "string" },
    "save-raw": { type: "string" },
  },
});

const today = new Date();
const academicYear = values.year ? Number(values.year) : academicYearOf(today);
if (!Number.isInteger(academicYear)) throw new Error(`--year must be a year, not ${values.year}`);
const pad = (n: number) => String(n).padStart(2, "0");
const date = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

async function getJson(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  return response.json();
}

// ───────────── Subjects ─────────────

let raw: FireroadCourse[];
if (values.from) {
  raw = await Bun.file(values.from).json();
} else {
  console.log(`Fetching ${FIREROAD_URL} ...`);
  raw = await getJson(FIREROAD_URL);
  if (values["save-raw"]) await Bun.write(join(values["save-raw"], "courses.json"), JSON.stringify(raw));
}
if (!Array.isArray(raw) || raw.length === 0) throw new Error("Fireroad answered no courses");

const { snapshot, stats } = fromFireroad(raw, { academicYear, id: `fireroad-${date}` });

// One entry per line keeps the committed diffs readable.
const lines = (head: Record<string, unknown>, arrays: Record<string, unknown[]>) =>
  JSON.stringify(head).slice(0, -1) +
  Object.entries(arrays).map(([key, rows]) => `,${JSON.stringify(key)}:[\n${rows.map((r) => JSON.stringify(r)).join(",\n")}\n]`).join("") +
  "}\n";

await Bun.write(
  SNAPSHOT_PATH,
  lines({ id: snapshot.id, source: snapshot.source, academicYear, scheduleSeason: snapshot.scheduleSeason }, { courses: snapshot.courses }),
);

const count = (f: (c: (typeof snapshot.courses)[number]) => boolean) => snapshot.courses.filter(f).length;
console.log(`Wrote ${snapshot.courses.length} subjects to ${SNAPSHOT_PATH} (id ${snapshot.id}, academic year ${academicYear}-${academicYear + 1})`);
console.log(`  with prerequisites: ${count((c) => c.prerequisites.length > 0)}, with ratings: ${count((c) => !!c.rating)}`);
const season = snapshot.scheduleSeason ? `${snapshot.scheduleSeason.term} ${snapshot.scheduleSeason.year}` : "no term";
console.log(`  with schedules: ${count((c) => !!c.schedule)} (for ${season}), with evaluation hours: ${count((c) => c.outOfClassHours !== undefined)}`);
console.log(`  not offered this year: ${count((c) => c.offering === "Not offered THIS year")}, next year: ${count((c) => c.offering === "Not offered NEXT year")}, not listed: ${count((c) => c.offering === "Not currently listed")}`);
console.log(`  groups dropped as free text (e.g. permission of instructor): ${stats.freeTextGroups}`);
console.log(`  options dropped as not in the catalog: ${stats.unknownSubjects}`);
for (const [label, list] of [["unparsed", stats.unparsed], ["too large", stats.tooLarge]] as const) {
  console.log(`  requirements left out as ${label}: ${list.length}`);
  for (const s of list.slice(0, 20)) console.log(`    ${s}`);
}

// ───────────── Degree requirements ─────────────

let lists: Record<string, FireroadRequirement>;
if (values["requirements-from"]) {
  lists = await Bun.file(values["requirements-from"]).json();
} else {
  console.log(`\nFetching ${REQUIREMENTS_URL} ...`);
  const ids = Object.keys(await getJson(`${REQUIREMENTS_URL}list_reqs/`)).filter(isPlannedList);
  lists = {};
  // A few at a time, to be gentle with a student-run server.
  const queue = [...ids];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let id = queue.shift(); id; id = queue.shift()) lists[id] = await getJson(`${REQUIREMENTS_URL}get_json/${id}/`);
    }),
  );
  if (values["save-raw"]) await Bun.write(join(values["save-raw"], "requirements.json"), JSON.stringify(lists));
}

const requirements = fromFireroadRequirements(lists, indexCatalog(raw), { id: `fireroad-requirements-${date}` });
await Bun.write(
  REQUIREMENTS_PATH,
  lines({ id: requirements.snapshot.id, source: requirements.snapshot.source }, {
    lists: requirements.snapshot.lists,
    items: requirements.snapshot.items,
  }),
);

const totals = Object.values(requirements.stats).reduce(
  (t, s) => ({ blocks: t.blocks + s.blocks, choices: t.choices + s.choices, notes: t.notes + s.notes, approximate: t.approximate + s.approximate, broad: t.broad + s.broad }),
  { blocks: 0, choices: 0, notes: 0, approximate: 0, broad: 0 },
);
console.log(`Wrote ${requirements.snapshot.lists.length} requirement lists to ${REQUIREMENTS_PATH} (id ${requirements.snapshot.id})`);
console.log(`  blocks: ${totals.blocks}, choices: ${totals.choices}, approximate blocks: ${totals.approximate}`);
console.log(`  notes (free text, not planned): ${totals.notes}, open blocks left to the student (over ${BROAD} options): ${totals.broad}`);
