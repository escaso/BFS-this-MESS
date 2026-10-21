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

// Fail loudly unless the request was refused with this HTTP category. The HTTP layer
// shows only the category (see publicErrors in src/http.ts), never the domain code.
function refused(label: string, result: object, code: string) {
  const error = "error" in result ? result.error : undefined;
  if (error !== code) {
    console.error(`${label}: expected ${code}, got`, result);
    process.exit(1);
  }
  console.log(`${label}: refused with ${code}, as expected`);
}

// ---------- Accounts ----------

// Fresh usernames each run, so the script can be rerun against the same database.
const suffix = crypto.randomUUID().slice(0, 8);
const student = `student-${suffix}`;
const advisor = `advisor-${suffix}`;

ok("register student", await api.register({ username: student, password: "pw" }));
ok("register advisor", await api.register({ username: advisor, password: "pw" }));
const { session } = ok("logIn student", await api.logIn({ username: student, password: "pw" }));
const { session: advisorSession } = ok("logIn advisor", await api.logIn({ username: advisor, password: "pw" }));

// ---------- Road setup ----------

refused(
  "newRoad without a session",
  await api.newRoad({ session: "not-a-session", name: "x", major: "6-3", startYear: 2025, startTerm: "FALL" }),
  "UNAUTHORIZED", // NO_SUCH_SESSION
);

const { road } = ok(
  "newRoad",
  await api.newRoad({ session, name: "My 6-3 road", major: "6-3", startYear: 2025, startTerm: "FALL" }),
);
console.log("created road:", road);

ok("addPrior 18.01", await api.addPrior({ session, road, subject: "18.01" }));
const { block } = ok("addBlock", await api.addBlock({ session, road, count: 1 }));
ok("addOption 6.1800", await api.addOption({ session, block, subject: "6.1800" }));
ok("addOption 6.1810", await api.addOption({ session, block, subject: "6.1810" }));
ok("setCap total", await api.setCap({ session, road, year: 2025, term: "FALL", capType: "total", limit: 48 }));
ok("setLocked", await api.setLocked({ session, road, year: 2025, term: "FALL", locked: true }));

// ---------- Sharing and access ----------

refused("advisor views before sharing", await api.checkPlan({ session: advisorSession, road }), "NOT_FOUND");
refused(
  "share with nobody",
  await api.shareRoad({ session, road, username: `nobody-${suffix}` }),
  "NOT_FOUND", // NO_SUCH_USER
);
ok("share with advisor", await api.shareRoad({ session, road, username: advisor }));
ok("advisor checks the plan", await api.checkPlan({ session: advisorSession, road }));
refused(
  "advisor renames",
  await api.renameRoad({ session: advisorSession, road, name: "mine now" }),
  "FORBIDDEN", // NOT_AN_OWNER
);
refused(
  "advisor edits a block",
  await api.addOption({ session: advisorSession, block, subject: "6.1820" }),
  "FORBIDDEN", // NOT_AN_OWNER
);

const sharing = ok("viewSharing", await api.viewSharing({ session, road }));
console.log("shared with:", sharing.viewers.viewers.map((v) => v.username));
const advisorRoads = ok("advisor myRoads", await api.myRoads({ session: advisorSession }));
console.log("advisor sees:", advisorRoads.roads.shared.map((r) => r.name));

ok("unshare", await api.unshareRoad({ session, road, username: advisor }));
refused("advisor views after unsharing", await api.checkPlan({ session: advisorSession, road }), "NOT_FOUND");

// ---------- View the road ----------

const view = ok("viewRoad", await api.viewRoad({ session, road, includeIAPAndSummer: false, limit: 2 }));
const c = view.constraints;
console.log(`\n${c.name} (${c.major}), ${c.startTerm} ${c.startYear} to ${c.endTerm} ${c.endYear}`);
console.log("prior:", c.prior.map((p) => p.subject));
console.log("blocks:", c.blocks.map((b) => `${b.block.slice(0, 8)} needs ${b.count} of ${b.subject}`));
console.log("semesters:", c.semesters.map((s) => `${s.term} ${s.year}${s.locked ? " (locked)" : ""}`));
for (const { plan, year, term, subject } of view.paths.plans) {
  console.log(`  plan ${plan}: ${subject} in ${term} ${year}`);
}

// ---------- Clean up ----------

ok("deleteRoad", await api.deleteRoad({ session, road }));
refused("view after delete", await api.checkPlan({ session, road }), "NOT_FOUND");
ok("logOut", await api.logOut({ session }));
refused("use a logged-out session", await api.myRoads({ session }), "UNAUTHORIZED");

// ---------- Catalog lookups (empty until loadCatalog actually parses data) ----------

const search = ok("searchSubjects", await api.searchSubjects({ query: "6.1010" }));
console.log("\nsearch '6.1010':", search.courses.courses.map((c) => c.course));
const schedule = ok("viewSchedule", await api.viewSchedule({ course: "6.1010" }));
console.log("6.1010 schedule:", schedule.schedule.schedule);
const ratings = ok("viewRatings", await api.viewRatings({ course: "6.1010" }));
console.log("6.1010 ratings:", ratings.ratings.ratings);

console.log("\nAll checks passed.");
