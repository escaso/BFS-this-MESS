import { createHttpClient } from "@mit-sdg/sync-engine-http/client";
import type { BFSThisMessWireHttp } from "../generated/wire.ts";

const client = createHttpClient<BFSThisMessWireHttp>({ baseUrl: "http://127.0.0.1:3000/api" });
const api = client.bfsthismess;

// Fail loudly on any error result so a broken endpoint is obvious.
function ok<R extends object>(label: string, result: R): Exclude<R, { error: unknown }> {
  if ("error" in result) {
    console.error(`${label} failed:`, result);
    process.exit(1);
  }
  return result as Exclude<R, { error: unknown }>;
}

// ---------- Road setup ----------

const { road } = ok("newRoad", await api.newRoad({ name: "My 6-3 road", major: "6-3" }));
console.log("created road:", road);

ok("addRequirement 6.1010", await api.addRequirement({ road, subject: "6.1010" }));
ok("addRequirement 6.1210", await api.addRequirement({ road, subject: "6.1210" }));
ok("addRequirement 18.06", await api.addRequirement({ road, subject: "18.06" }));
ok("addElectiveBlock", await api.addElectiveBlock({ road, options: ["6.1800", "6.1810", "6.1820"] }));
ok("pin 6.1010", await api.pin({ road, subject: "6.1010", semester: 1 }));
ok("setCap total", await api.setCap({ road, capType: "total", limit: 4 }));
ok("setCap technical", await api.setCap({ road, capType: "technical", limit: 3 }));
ok("lockThroughSemester", await api.lockThroughSemester({ road, semester: 0 }));

// ---------- View the road ----------

const view = ok("viewRoad", await api.viewRoad({ road, limit: 2 }));
for (const c of view.constraints.constraints) {
  console.log("required:", c.required);
  console.log("elective blocks:", c.elective_blocks);
  console.log("pins:", c.pins.map((p) => `${p.subject}@${p.semester}`).join(", "));
  console.log(`caps: ${c.maxPerSemester} total, ${c.maxTechnicalPerSemester} technical; locked through ${c.lockedThrough}`);
}
for (const { paths } of view.paths.catalogs) {
  paths.paths.forEach(({ plan }, i) => {
    console.log(`\npath ${i + 1}:`);
    plan.forEach((subjects, semester) => {
      if (subjects.length > 0) console.log(`  semester ${semester}: ${subjects.join(", ")}`);
    });
  });
}

// ---------- Catalog lookups (empty until loadCatalog actually parses data) ----------

const search = ok("searchSubjects", await api.searchSubjects({ query: "6.1010" }));
console.log("\nsearch '6.1010':", search.courses.courses.map((c) => c.course));
const schedule = ok("viewSchedule", await api.viewSchedule({ course: "6.1010" }));
console.log("6.1010 schedule:", schedule.schedule.schedule);
const ratings = ok("viewRatings", await api.viewRatings({ course: "6.1010" }));
console.log("6.1010 ratings:", ratings.ratings.ratings);
