// Tests for the History part of the BFSThisMess composition (design/compositions/BFSThisMess.md),
// through the assembled application and a local client, written from the design. The clock
// is fixed at 2026-10-26, so the current season is FALL 2026.
//
// Run with: bun test test/onboarding.test.ts (needs MongoDB at MONGODB_URI)

import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLocalClient } from "@mit-sdg/sync-engine/client";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import type { BFSThisMessWire } from "../generated/wire.ts";
import { assembleApplication } from "../src/assembly.ts";
import { importCatalog } from "../src/catalog/import.ts";
import type { SnapshotCourse } from "../src/concepts/CourseOffering.ts";
import { useFreshDb } from "./support.ts";

/*
 * Testing strategy
 *
 * Onboarding: prior credit, start, each past season (IAP and summer included, "nothing this
 *   term"), left half way and resumed (pending), complete
 * Catalog check: subject in the catalog / not (UNKNOWN_SUBJECT, nothing changes)
 * Placement: into every road the user owns, existing and new; not into roads shared with them;
 *   a copy gets the copier's history, not the original owner's
 * Locking in roads: history seasons can't be pinned, unpinned or unlocked on the road
 * Unlock and correct: the change reaches every owned road; warnings name planned subjects
 *   left without a prerequisite, and prerequisites missing inside the history itself
 * Sessions: none (NO_SUCH_SESSION) on each change
 */

const db = useFreshDb("history_e2e_test");
const dir = mkdtempSync(join(tmpdir(), "history-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const course = (subject: string, prerequisites: string[][] = []): SnapshotCourse => ({
  subject, name: subject, courseId: subject, description: "", lecturer: "Staff", level: "Undergraduate",
  terms: ["FALL", "IAP", "SPRING", "SUMMER"], offering: "Offered normally", canBeRepeated: false,
  prerequisitesText: "", corequisitesText: "", units: "3-0-9",
  prerequisites: prerequisites.map((options) => ({ count: 1, options })), corequisites: [], totalUnits: 12,
});

type Client = ReturnType<typeof createLocalClient<BFSThisMessWire>>;
let api: Client["bfsthismess"];

beforeEach(async () => {
  const path = join(dir, "subjects.json");
  const courses = [course("A.1"), course("B.1", [["A.1"]]), course("C.1", [["B.1"]]), course("D.1"), course("P.1")];
  writeFileSync(path, JSON.stringify({ id: "s", source: "test", academicYear: 2026, courses }));
  const requirementsPath = join(dir, "requirements.json");
  writeFileSync(requirementsPath, JSON.stringify({
    id: "r", source: "test",
    lists: [
      { id: "majorA", title: "A degree", shortTitle: "A", mediumTitle: "A Major", kind: "MAJOR" },
      { id: "girs", title: "GIRs", shortTitle: "GIRs", mediumTitle: "GIRs", kind: "GIRS" },
    ],
    items: [],
  }));
  await importCatalog(db(), { path, requirementsPath, log: () => {} });
  const application = assembleApplication(db(), () => new Date(2026, 9, 26));
  api = createLocalClient<BFSThisMessWire>({ invoker: createGateway({ application }) }).bfsthismess;
});

const value = <T>(result: T): Exclude<T, { error: unknown }> => {
  if (result && typeof result === "object" && "error" in result) throw new Error(`refused: ${String(result.error)}`);
  return result as Exclude<T, { error: unknown }>;
};
const refusal = (result: unknown) => (result as { error?: unknown }).error;

async function signUp(username: string) {
  await api.register({ username, password: "pw" });
  return String(value(await api.logIn({ username, password: "pw" })).session);
}

const newRoad = async (session: string, name = "Road") =>
  String(value(await api.newRoad({ session, name, major: "majorA", startYear: 2025, startTerm: "FALL" })).road);
const constraintsOf = async (session: string, road: string) =>
  value(await api.viewRoad({ session, road, includeIAPAndSummer: true, limit: 1 })).constraints;
const historyOf = async (session: string) => value(await api.viewHistory({ session })).history;
const pinsOf = async (session: string, road: string) =>
  (await constraintsOf(session, road)).pins.map((p) => `${p.term} ${p.year} ${p.subject}`);

/** Prior credit P.1, a FALL 2025 start, A.1 in FALL 2025 and B.1 in SPRING 2026; IAP and SUMMER empty. */
async function onboard(session: string) {
  value(await api.addPriorCredit({ session, subject: "P.1" }));
  value(await api.finishPriorCredit({ session }));
  value(await api.setHistoryStart({ session, year: 2025, term: "FALL" }));
  value(await api.addTaken({ session, year: 2025, term: "FALL", subject: "A.1" }));
  value(await api.lockSeason({ session, year: 2025, term: "FALL" }));
  value(await api.lockSeason({ session, year: 2026, term: "IAP" }));
  value(await api.addTaken({ session, year: 2026, term: "SPRING", subject: "B.1" }));
  value(await api.lockSeason({ session, year: 2026, term: "SPRING" }));
  value(await api.lockSeason({ session, year: 2026, term: "SUMMER" }));
}

describe("onboarding", () => {
  test("can be left half way and resumed, and is complete once every past season is answered", async () => {
    const s = await signUp("omar");
    let h = await historyOf(s);
    expect(h).toMatchObject({ started: false, priorDone: false, complete: false, currentYear: 2026, currentTerm: "FALL" });
    value(await api.finishPriorCredit({ session: s }));
    value(await api.setHistoryStart({ session: s, year: 2025, term: "FALL" }));
    value(await api.addTaken({ session: s, year: 2025, term: "FALL", subject: "A.1" }));
    h = await historyOf(s);
    expect(h.pending).toEqual([{ year: 2025, term: "FALL" }]);
    expect(h.seasons.map((x) => x.term)).toEqual(["FALL", "IAP", "SPRING", "SUMMER"]);
    expect(h.taken).toEqual([{ year: 2025, term: "FALL", subject: "A.1" }]);
    value(await api.lockSeason({ session: s, year: 2025, term: "FALL" }));
    expect((await historyOf(s)).pending).toEqual([{ year: 2026, term: "IAP" }]);
    for (const term of ["IAP", "SPRING", "SUMMER"] as const) value(await api.lockSeason({ session: s, year: 2026, term }));
    h = await historyOf(s);
    expect(h.pending).toEqual([]);
    expect(h.complete).toBe(true);
  });

  test("refuses subjects that are not in the catalog, and requests without a session", async () => {
    const s = await signUp("omar");
    value(await api.setHistoryStart({ session: s, year: 2025, term: "FALL" }));
    expect(refusal(await api.addPriorCredit({ session: s, subject: "NOPE" }))).toBe("UNKNOWN_SUBJECT");
    expect(refusal(await api.addTaken({ session: s, year: 2025, term: "FALL", subject: "NOPE" }))).toBe("UNKNOWN_SUBJECT");
    expect((await historyOf(s)).taken).toEqual([]);
    for (const r of [
      await api.addPriorCredit({ session: "x", subject: "A.1" }),
      await api.removePriorCredit({ session: "x", subject: "A.1" }),
      await api.finishPriorCredit({ session: "x" }),
      await api.setHistoryStart({ session: "x", year: 2025, term: "FALL" }),
      await api.addTaken({ session: "x", year: 2025, term: "FALL", subject: "A.1" }),
      await api.removeTaken({ session: "x", year: 2025, term: "FALL", subject: "A.1" }),
      await api.lockSeason({ session: "x", year: 2025, term: "FALL" }),
      await api.unlockSeason({ session: "x", year: 2025, term: "FALL" }),
      await api.viewHistory({ session: "x" }),
    ]) expect(refusal(r)).toBe("NO_SUCH_SESSION");
  });

  test("passes on the concept's refusals", async () => {
    const s = await signUp("omar");
    expect(refusal(await api.addTaken({ session: s, year: 2025, term: "FALL", subject: "A.1" }))).toBe("NOT_PAST");
    await onboard(s);
    expect(refusal(await api.addTaken({ session: s, year: 2025, term: "FALL", subject: "D.1" }))).toBe("LOCKED");
    expect(refusal(await api.addPriorCredit({ session: s, subject: "A.1" }))).toBe("ALREADY_TAKEN");
    expect(refusal(await api.unlockSeason({ session: s, year: 2026, term: "FALL" }))).toBe("NOT_LOCKED");
  });
});

describe("placing the history in roads", () => {
  test("reaches every road the user owns, existing and new, locked", async () => {
    const s = await signUp("omar");
    const before = await newRoad(s, "Before");
    await onboard(s);
    const after = await newRoad(s, "After");
    for (const road of [before, after]) {
      const c = await constraintsOf(s, road);
      expect(c.prior).toEqual([{ subject: "P.1", fromHistory: true }]);
      expect(c.pins.map((p) => `${p.term} ${p.year} ${p.subject}`)).toEqual(["FALL 2025 A.1", "SPRING 2026 B.1"]);
      expect(c.semesters.filter((x) => x.fromHistory).map((x) => `${x.term} ${x.year} ${x.locked}`)).toEqual([
        "FALL 2025 true", "IAP 2026 true", "SPRING 2026 true", "SUMMER 2026 true",
      ]);
    }
    expect(refusal(await api.pin({ session: s, road: before, subject: "D.1", year: 2025, term: "FALL" }))).toBe("HISTORY_SEASON");
    expect(refusal(await api.unPin({ session: s, road: before, subject: "A.1" }))).toBe("HISTORY_SEASON");
    expect(refusal(await api.setLocked({ session: s, road: before, year: 2025, term: "FALL", locked: false }))).toBe("HISTORY_SEASON");
    expect(refusal(await api.removePrior({ session: s, road: before, subject: "P.1" }))).toBe("HISTORY_PRIOR");
  });

  test("does not reach roads shared with the user, and a copy gets the copier's own history", async () => {
    const owner = await signUp("omar");
    const other = await signUp("ada");
    await onboard(owner);
    const road = await newRoad(owner);
    value(await api.shareRoad({ session: owner, road, username: "ada", role: "EDIT" }));
    value(await api.setHistoryStart({ session: other, year: 2025, term: "FALL" }));
    value(await api.addTaken({ session: other, year: 2025, term: "FALL", subject: "D.1" }));
    value(await api.lockSeason({ session: other, year: 2025, term: "FALL" }));
    expect(await pinsOf(owner, road)).toEqual(["FALL 2025 A.1", "SPRING 2026 B.1"]);
    const copy = String(value(await api.copyRoad({ session: other, road, name: "Mine" })).road);
    const c = await constraintsOf(other, copy);
    expect(c.prior).toEqual([]);
    // Ada's FALL 2025 replaces Omar's; Omar's SPRING 2026 stays as an ordinary lock in the copy.
    expect(c.pins.map((p) => `${p.term} ${p.year} ${p.subject}`)).toEqual(["FALL 2025 D.1", "SPRING 2026 B.1"]);
    expect(c.semesters.find((x) => x.term === "SPRING" && x.year === 2026)).toMatchObject({ locked: true, fromHistory: false });
  });

  test("unlocking and correcting a season reaches every road, with warnings for what it breaks", async () => {
    const s = await signUp("omar");
    await onboard(s);
    const one = await newRoad(s, "One");
    const two = await newRoad(s, "Two");
    value(await api.pin({ session: s, road: one, subject: "C.1", year: 2027, term: "SPRING" }));
    expect((await historyOf(s)).roadWarnings).toEqual([]);

    value(await api.unlockSeason({ session: s, year: 2026, term: "SPRING" }));
    // Still locked in the roads while it is being corrected.
    expect((await constraintsOf(s, one)).semesters.find((x) => x.term === "SPRING" && x.year === 2026)?.locked).toBe(true);
    value(await api.removeTaken({ session: s, year: 2026, term: "SPRING", subject: "B.1" }));
    value(await api.addTaken({ session: s, year: 2026, term: "SPRING", subject: "D.1" }));
    for (const road of [one, two]) expect(await pinsOf(s, road)).toContain("SPRING 2026 D.1");
    const h = await historyOf(s);
    expect(h.roadWarnings).toEqual([{ road: one, name: "One", year: 2027, term: "SPRING", subject: "C.1", missing: "B.1" }]);
    value(await api.lockSeason({ session: s, year: 2026, term: "SPRING" }));
    expect((await historyOf(s)).seasons.find((x) => x.term === "SPRING")).toMatchObject({ answered: true, locked: true });
  });

  test("warns, without refusing, about prerequisites the history itself does not meet", async () => {
    const s = await signUp("omar");
    value(await api.setHistoryStart({ session: s, year: 2025, term: "FALL" }));
    value(await api.addTaken({ session: s, year: 2025, term: "FALL", subject: "B.1" }));
    expect((await historyOf(s)).warnings).toEqual([]); // not answered yet
    value(await api.lockSeason({ session: s, year: 2025, term: "FALL" }));
    expect((await historyOf(s)).warnings).toEqual([{ year: 2025, term: "FALL", subject: "B.1", missing: "A.1" }]);
    value(await api.addPriorCredit({ session: s, subject: "A.1" }));
    expect((await historyOf(s)).warnings).toEqual([]);
  });

  test("a history that does not follow the catalog's rules still leaves the road paths to find", async () => {
    // B.1 needs A.1 first; this student took B.1 without it. C.1, which needs B.1, is still to take.
    const s = await signUp("omar");
    value(await api.finishPriorCredit({ session: s }));
    value(await api.setHistoryStart({ session: s, year: 2025, term: "FALL" }));
    value(await api.addTaken({ session: s, year: 2025, term: "FALL", subject: "B.1" }));
    for (const [year, term] of [[2025, "FALL"], [2026, "IAP"], [2026, "SPRING"], [2026, "SUMMER"]] as const) {
      value(await api.lockSeason({ session: s, year, term }));
    }
    const road = await newRoad(s);
    value(await api.addBlock({ session: s, road, count: 1, technical: true }).then(async (r) => {
      const { block } = value(r);
      return api.addOption({ session: s, block, subject: "C.1" });
    }));
    const plans = value(await api.viewRoad({ session: s, road, includeIAPAndSummer: false, limit: 3 })).paths.plans;
    expect(plans.filter((p) => p.plan === 1).map((p) => p.subject).sort()).toEqual(["B.1", "C.1"]);
    expect((await historyOf(s)).warnings).toEqual([{ year: 2025, term: "FALL", subject: "B.1", missing: "A.1" }]);
  });
});
