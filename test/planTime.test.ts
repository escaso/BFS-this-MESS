// Tests for the Plans against the time budget part of the BFSThisMess composition
// (design/compositions/BFSThisMess.md), through the assembled application and a local
// client, written from the design.
//
// Run with: bun test test/planTime.test.ts (needs MongoDB at MONGODB_URI)

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
import type { RequirementItem } from "../src/concepts/Requirements.ts";
import { useFreshDb } from "./support.ts";

/*
 * Testing strategy
 *
 * ViewPlanMetrics: owner / viewer (the same numbers, from the owner's week) / stranger
 *   (NO_SUCH_ROAD); semesters with subjects; status and the 168-hour reconciliation
 * ViewSemesterSchedule: placement of the picked sections; a conflict with the owner's week;
 *   classes with no place (no schedule this term)
 * ChooseSection / ClearSection: owner, editor (allowed), viewer (NOT_AN_EDITOR), no such
 *   section; the preview follows the choice
 * DeleteRoad: section choices and settings are forgotten
 */

const db = useFreshDb("plan_time_test");
const dir = mkdtempSync(join(tmpdir(), "plan-time-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const course = (subject: string, fields: Partial<SnapshotCourse> = {}): SnapshotCourse => ({
  subject, name: subject, courseId: subject, description: "", lecturer: "Staff", level: "Undergraduate",
  terms: ["FALL"], offering: "Offered normally", canBeRepeated: false, prerequisitesText: "",
  corequisitesText: "", units: "3-0-9", prerequisites: [], corequisites: [], totalUnits: 12, contactUnits: 3, ...fields,
});

const item = (key: string, fields: Partial<RequirementItem>): RequirementItem => ({
  key, list: key.split("/")[0]!, parent: null, kind: "BLOCK", title: key, count: 1, options: [],
  approximate: false, technical: true, order: 0, ...fields,
});

type Client = ReturnType<typeof createLocalClient<BFSThisMessWire>>;
let api: Client["bfsthismess"];

beforeEach(async () => {
  const path = join(dir, "subjects.json");
  writeFileSync(path, JSON.stringify({
    id: "s", source: "test", academicYear: 2026, scheduleSeason: { year: 2026, term: "FALL" },
    courses: [
      // A: lecture MWF 9 or MWF 10; recitation T 9 or R 9.
      course("A.1", { schedule: "Lecture,1-1/MWF/0/9,1-2/MWF/0/10;Recitation,2-1/T/0/9,2-2/R/0/9", outOfClassHours: 8 }),
      // B: lecture TR 9.30-11 only.
      course("B.1", { schedule: "Lecture,3-1/TR/0/9.30-11", outOfClassHours: 6 }),
      // C: no schedule published.
      course("C.1", { inClassHours: 3, outOfClassHours: 5 }),
    ],
  }));
  const requirementsPath = join(dir, "requirements.json");
  writeFileSync(requirementsPath, JSON.stringify({
    id: "r", source: "test",
    lists: [
      { id: "majorA", title: "A", shortTitle: "A", mediumTitle: "A", kind: "MAJOR" },
      { id: "girs", title: "GIRs", shortTitle: "GIRs", mediumTitle: "GIRs", kind: "GIRS" },
    ],
    items: [
      item("majorA/1", { options: ["A.1"], order: 0 }),
      item("majorA/2", { options: ["B.1"], order: 1 }),
      item("majorA/3", { options: ["C.1"], order: 2 }),
    ],
  }));
  await importCatalog(db(), { path, requirementsPath, log: () => {} });
  const application = assembleApplication(db(), () => new Date(2026, 7, 20)); // SUMMER 2026
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

/** omar owns a road starting FALL 2026, with all three subjects pinned to that fall; ada views it, ed edits it. */
async function setUp() {
  const omar = await signUp("omar");
  const ada = await signUp("ada");
  const ed = await signUp("ed");
  const road = String(value(await api.newRoad({ session: omar, name: "R", major: "majorA", startYear: 2026, startTerm: "FALL" })).road);
  for (const subject of ["A.1", "B.1", "C.1"]) value(await api.pin({ session: omar, road, subject, year: 2026, term: "FALL" }));
  value(await api.shareRoad({ session: omar, road, username: "ada", role: "VIEW" }));
  value(await api.shareRoad({ session: omar, road, username: "ed", role: "EDIT" }));
  return { omar, ada, ed, road };
}
const fall = { year: 2026, term: "FALL" as const };
const metricsOf = async (session: string, road: string) =>
  value(await api.viewPlanMetrics({ session, road, includeIAPAndSummer: false, limit: 1 })).metrics.semesters;

describe("the hours of a plan", () => {
  test("each semester's numbers, the same for everyone on the road, from the owner's week", async () => {
    const { omar, ada, road } = await setUp();
    // Omar works Tuesday and Thursday mornings: 9-10 clashes with A's recitations.
    const { template } = value(await api.viewWeek({ session: omar })).week;
    for (const day of [1, 3]) value(await api.addTimeBlock({ session: omar, template, category: "system:work", day, start: 36, slots: 4 }));
    const [first] = await metricsOf(omar, road);
    expect(first).toMatchObject({
      plan: 1, year: 2026, term: "FALL", subjects: "A.1,B.1,C.1", slots: 0, locked: false,
      inClass: 4 + 3 + 3, outOfClass: 8 + 6 + 5, blocked: 84 + 2, buffer: 10, status: "FEASIBLE", estimated: false,
    });
    expect(first!.blocked + first!.inClass + first!.free).toBe(168);
    // A recitation must clash with work whichever is picked, and B's lecture overlaps it too (9:30).
    expect(first!.conflicts).toBeGreaterThan(0);
    expect(await metricsOf(ada, road)).toEqual(await metricsOf(omar, road));
    const stranger = await signUp("zed");
    expect(refusal(await api.viewPlanMetrics({ session: stranger, road, includeIAPAndSummer: false, limit: 1 }))).toBe("NO_SUCH_ROAD");
  });

  test("a semester's schedule: picked sections, conflicts, classes with no place", async () => {
    const { omar, road } = await setUp();
    const s = value(await api.viewSemesterSchedule({ session: omar, road, ...fall, subjects: "A.1,B.1,C.1" })).schedule;
    if (s.shared !== "DETAILS") throw new Error("the owner sees their blocked time");
    // B meets TR 9:30-11, and A's recitations are T 9 or R 9: either overlaps B.
    const recitation = s.placement.filter((p) => p.subject === "A.1" && p.kind === "RECITATION");
    expect(recitation).toHaveLength(1);
    expect(recitation[0]).toMatchObject({ options: 2, chosen: false, conflicted: true });
    expect(s.conflicts.some((c) => !c.withBlock && [c.subject, c.with].sort().join() === "A.1,B.1")).toBe(true);
    expect(s.unplaced).toEqual([{ subject: "C.1", reason: "NONE" }]);
    expect(s.blocks.length).toBe(35); // the owner's default week
    expect(s.categories.some((c) => c.category === "system:sleep")).toBe(true);
    // A's lecture MWF 9 is free: its first section.
    expect(s.placement.find((p) => p.subject === "A.1" && p.kind === "LECTURE")).toMatchObject({ section: 1, conflicted: false });
    expect(value(await api.viewSemesterSchedule({ session: omar, road, year: 2027, term: "IAP", subjects: "A.1" })).schedule.placement)
      .toEqual([]);
  });
});

describe("sections picked by hand", () => {
  test("owner and editors pick and clear; viewers are refused", async () => {
    const { omar, ada, ed, road } = await setUp();
    value(await api.chooseSection({ session: ed, road, ...fall, subject: "A.1", kind: "LECTURE", section: 2 }));
    let s = value(await api.viewSemesterSchedule({ session: omar, road, ...fall, subjects: "A.1,B.1" })).schedule;
    expect(s.placement.find((p) => p.subject === "A.1" && p.kind === "LECTURE")).toMatchObject({ section: 2, chosen: true, room: "1-2" });
    expect(refusal(await api.chooseSection({ session: ada, road, ...fall, subject: "A.1", kind: "LECTURE", section: 1 }))).toBe("NOT_AN_EDITOR");
    expect(refusal(await api.chooseSection({ session: omar, road, ...fall, subject: "A.1", kind: "LECTURE", section: 9 }))).toBe("NO_SUCH_SECTION");
    expect(refusal(await api.clearSection({ session: ada, road, ...fall, subject: "A.1", kind: "LECTURE" }))).toBe("NOT_AN_EDITOR");
    value(await api.clearSection({ session: omar, road, ...fall, subject: "A.1", kind: "LECTURE" }));
    s = value(await api.viewSemesterSchedule({ session: omar, road, ...fall, subjects: "A.1,B.1" })).schedule;
    expect(s.placement.find((p) => p.subject === "A.1" && p.kind === "LECTURE")).toMatchObject({ section: 1, chosen: false });
    expect(refusal(await api.clearSection({ session: omar, road, ...fall, subject: "A.1", kind: "LECTURE" }))).toBe("NOT_CHOSEN");
  });

  test("are forgotten with the road", async () => {
    const { omar, road } = await setUp();
    value(await api.chooseSection({ session: omar, road, ...fall, subject: "A.1", kind: "LECTURE", section: 2 }));
    value(await api.deleteRoad({ session: omar, road }));
    expect(await db().collection("timebudget.sectionChoices").countDocuments({ road })).toBe(0);
  });
});

/*
 * Soft and hard roads:
 *   soft (default): the path is shown, with a semester that is OVER / hard: left out, the
 *   answer says so and which semester does not fit; locked semesters never judged
 *   settings: viewer refused (NOT_AN_EDITOR); a reserve for the road alone
 */
describe("soft and hard roads", () => {
  async function busyOwner() {
    const ctx = await setUp();
    // Work 9am-noon, 3-6pm and 7:30-11pm every day (around meals): 66.5 h, leaving
    // 168 - 84 - 66.5 - 10 in class = 7.5 h free for 19 h of study.
    const { template } = value(await api.viewWeek({ session: ctx.omar })).week;
    for (let day = 0; day < 7; day++) {
      value(await api.addTimeBlock({ session: ctx.omar, template, category: "system:work", day, start: 36, slots: 12 }));
      value(await api.addTimeBlock({ session: ctx.omar, template, category: "system:work", day, start: 60, slots: 12 }));
      value(await api.addTimeBlock({ session: ctx.omar, template, category: "system:work", day, start: 78, slots: 14 }));
    }
    return ctx;
  }
  const pathsOf = async (session: string, road: string) =>
    value(await api.viewRoad({ session, road, includeIAPAndSummer: false, limit: 3 })).paths;

  test("a soft road shows the path, with the semester that does not fit", async () => {
    const { omar, road } = await busyOwner();
    const paths = await pathsOf(omar, road);
    expect(paths).toMatchObject({ mode: "SOFT", dropped: 0, binding: [] });
    expect(paths.plans.length).toBeGreaterThan(0);
    const [fall] = await metricsOf(omar, road);
    expect(fall).toMatchObject({ blocked: 150.5, free: 7.5, outOfClass: 19, status: "OVER" });
  });

  test("a hard road leaves it out, and says which semester does not fit and by how much", async () => {
    const { omar, ada, ed, road } = await busyOwner();
    expect(refusal(await api.setScheduleMode({ session: ada, road, mode: "HARD" }))).toBe("NOT_AN_EDITOR");
    value(await api.setScheduleMode({ session: ed, road, mode: "HARD" }));
    expect(value(await api.viewRoadTime({ session: ada, road })).time).toMatchObject({ mode: "HARD" });
    const paths = await pathsOf(ada, road);
    expect(paths.mode).toBe("HARD");
    expect(paths.plans).toEqual([]);
    expect(paths.dropped).toBeGreaterThan(0);
    expect(paths.binding[0]).toMatchObject({ plan: 1, year: 2026, term: "FALL", outOfClass: 19, free: 7.5, status: "OVER" });
    expect(await metricsOf(omar, road)).toEqual([]);
  });

  test("locked semesters are never judged, and a road may keep a reserve of its own", async () => {
    const { omar, road } = await busyOwner();
    value(await api.setScheduleMode({ session: omar, road, mode: "HARD" }));
    value(await api.setLocked({ session: omar, road, year: 2026, term: "FALL", locked: true }));
    expect((await pathsOf(omar, road)).plans.length).toBeGreaterThan(0);
    value(await api.setRoadReserve({ session: omar, road, buffer: 30 }));
    expect(value(await api.viewRoadTime({ session: omar, road })).time).toMatchObject({ hasBuffer: true, buffer: 30 });
    expect((await metricsOf(omar, road))[0]).toMatchObject({ buffer: 30 });
    value(await api.clearRoadReserve({ session: omar, road }));
    expect(value(await api.viewRoadTime({ session: omar, road })).time).toMatchObject({ hasBuffer: false });
  });
});
