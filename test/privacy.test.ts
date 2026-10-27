// Tests that a road shared as hours only (the default) never gives away the owner's
// blocked time: through the assembled application and a local client, written from the
// Plans against the time budget part of design/compositions/BFSThisMess.md.
//
// Run with: bun test test/privacy.test.ts (needs MongoDB at MONGODB_URI)

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
 * Who asks: the owner (always everything) / a viewer / an editor / a viewer the editor
 *   added (hours only unless shared)
 * Share mode: METRICS (default) / DETAILS / back to METRICS
 * What could leak: a category's name or id, a block's day and time, a conflict's category,
 *   a meeting marked conflicted only because of a block
 * Where: every request a person on the road can make about it, and the week requests,
 *   which only ever answer the requester's own
 * Who may change it: the owner / editor and viewer (NOT_AN_OWNER) / bad value
 */

const db = useFreshDb("privacy_test");
const dir = mkdtempSync(join(tmpdir(), "privacy-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const course = (subject: string, fields: Partial<SnapshotCourse> = {}): SnapshotCourse => ({
  subject, name: subject, courseId: subject, description: "", lecturer: "Staff", level: "Undergraduate",
  terms: ["FALL"], offering: "Offered normally", canBeRepeated: false, prerequisitesText: "",
  corequisitesText: "", units: "3-0-9", prerequisites: [], corequisites: [], totalUnits: 12, contactUnits: 3, ...fields,
});
const item = (key: string, options: string[]): RequirementItem => ({
  key, list: "majorA", parent: null, kind: "BLOCK", title: key, count: 1, options, approximate: false, technical: true, order: 0,
});

type Client = ReturnType<typeof createLocalClient<BFSThisMessWire>>;
let api: Client["bfsthismess"];

beforeEach(async () => {
  const path = join(dir, "subjects.json");
  writeFileSync(path, JSON.stringify({
    id: "s", source: "test", academicYear: 2026, scheduleSeason: { year: 2026, term: "FALL" },
    // A meets Tuesday 3-4pm only: it will overlap the owner's therapy.
    courses: [course("A.1", { schedule: "Lecture,1-1/T/0/3", outOfClassHours: 8 })],
  }));
  const requirementsPath = join(dir, "requirements.json");
  writeFileSync(requirementsPath, JSON.stringify({
    id: "r", source: "test",
    lists: [
      { id: "majorA", title: "A", shortTitle: "A", mediumTitle: "A", kind: "MAJOR" },
      { id: "girs", title: "GIRs", shortTitle: "GIRs", mediumTitle: "GIRs", kind: "GIRS" },
    ],
    items: [item("majorA/1", ["A.1"])],
  }));
  await importCatalog(db(), { path, requirementsPath, log: () => {} });
  const application = assembleApplication(db(), () => new Date(2026, 7, 20));
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

const fall = { year: 2026, term: "FALL" as const };

/** omar's road, with therapy on Tuesday 3-4pm; ada views it, ed edits it, and vic was added by ed. */
async function setUp() {
  const omar = await signUp("omar");
  const [ada, ed, vic] = [await signUp("ada"), await signUp("ed"), await signUp("vic")];
  const road = String(value(await api.newRoad({ session: omar, name: "R", major: "majorA", startYear: 2026, startTerm: "FALL" })).road);
  value(await api.pin({ session: omar, road, subject: "A.1", ...fall }));
  const { template } = value(await api.viewWeek({ session: omar })).week;
  const { category } = value(await api.addCategory({ session: omar, name: "Therapy", color: "#123456" }));
  value(await api.addTimeBlock({ session: omar, template, category, day: 1, start: 60, slots: 4 }));
  value(await api.shareRoad({ session: omar, road, username: "ada", role: "VIEW" }));
  value(await api.shareRoad({ session: omar, road, username: "ed", role: "EDIT" }));
  value(await api.shareRoad({ session: ed, road, username: "vic", role: "VIEW" }));
  return { omar, ada, ed, vic, road, category };
}

/** Everything a person on the road can ask about it, as one string to search. */
async function everythingSeenBy(session: string, road: string) {
  const answers = await Promise.all([
    api.viewRoad({ session, road, includeIAPAndSummer: true, limit: 3 }),
    api.findPaths({ session, road, includeIAPAndSummer: true, limit: 3 }),
    api.viewPlanMetrics({ session, road, includeIAPAndSummer: true, limit: 3 }),
    api.viewSemesterSchedule({ session, road, ...fall, subjects: "A.1" }),
    api.viewRoadTime({ session, road }),
    api.viewOptions({ session, road, includeIAPAndSummer: true }),
    api.checkPlan({ session, road }),
    api.viewSharing({ session, road }),
    api.myRoads({ session }),
    api.viewClassHours({ session, subject: "A.1", ...fall }),
    api.viewWeek({ session }),
    api.viewSemesterWeek({ session, ...fall }),
    api.viewHistory({ session }),
    api.viewStudySettings({ session }),
  ]);
  return JSON.stringify(answers);
}

describe("a road shared as hours only (the default)", () => {
  test("gives others the classes and the hours, and nothing of the blocked time", async () => {
    const { ada, ed, vic, road, category } = await setUp();
    for (const session of [ada, ed, vic]) {
      const s = value(await api.viewSemesterSchedule({ session, road, ...fall, subjects: "A.1" })).schedule;
      expect(s.shared).toBe("METRICS");
      expect(s).not.toHaveProperty("blocks");
      expect(s).not.toHaveProperty("categories");
      expect(s.conflicts).toEqual([]); // the only conflict is with a block
      expect(s.placement).toEqual([expect.objectContaining({ subject: "A.1", day: 1, start: 60, conflicted: false })]);
      expect("blockConflicts" in s && s.blockConflicts).toBe(1);
      const everything = await everythingSeenBy(session, road);
      expect(everything).not.toContain("Therapy");
      expect(everything).not.toContain(category);
      expect(everything).not.toContain("#123456");
    }
  });

  test("still gives the same hours, with blocked time as a total", async () => {
    const { omar, ada, road } = await setUp();
    const mine = value(await api.viewPlanMetrics({ session: omar, road, includeIAPAndSummer: false, limit: 1 })).metrics;
    const theirs = value(await api.viewPlanMetrics({ session: ada, road, includeIAPAndSummer: false, limit: 1 })).metrics;
    expect(theirs).toEqual(mine);
    expect(theirs.semesters[0]).toMatchObject({ blocked: 85, conflicts: 1 });
  });

  test("the owner always sees their own blocked time", async () => {
    const { omar, road, category } = await setUp();
    const s = value(await api.viewSemesterSchedule({ session: omar, road, ...fall, subjects: "A.1" })).schedule;
    if (s.shared !== "DETAILS") throw new Error("the owner sees everything");
    expect(s.categories.find((c) => c.category === category)?.name).toBe("Therapy");
    expect(s.conflicts).toEqual([{ subject: "A.1", kind: "LECTURE", day: 1, start: 60, slots: 4, withBlock: true, with: category }]);
    expect(s.placement[0]?.conflicted).toBe(true);
  });
});

describe("choosing what a road shares", () => {
  test("only the owner may, and sharing blocked time shows it until it is hours only again", async () => {
    const { omar, ada, ed, road } = await setUp();
    for (const session of [ada, ed]) {
      expect(refusal(await api.setShareMode({ session, road, shareMode: "DETAILS" }))).toBe("NOT_AN_OWNER");
    }
    expect(refusal(await api.setShareMode({ session: omar, road, shareMode: "EVERYTHING" }))).toBe("BAD_SHARE_MODE");
    value(await api.setShareMode({ session: omar, road, shareMode: "DETAILS" }));
    expect(value(await api.viewRoadTime({ session: ada, road })).time.shareMode).toBe("DETAILS");
    const shown = value(await api.viewSemesterSchedule({ session: ada, road, ...fall, subjects: "A.1" })).schedule;
    if (shown.shared !== "DETAILS") throw new Error("shared");
    expect(shown.categories.some((c) => c.name === "Therapy")).toBe(true);
    expect(shown.blocks.some((b) => b.day === 1 && b.start === 60)).toBe(true);
    value(await api.setShareMode({ session: omar, road, shareMode: "METRICS" }));
    expect(await everythingSeenBy(ada, road)).not.toContain("Therapy");
  });

  test("a stranger learns nothing", async () => {
    const { road } = await setUp();
    const zed = await signUp("zed");
    expect(refusal(await api.viewSemesterSchedule({ session: zed, road, ...fall, subjects: "A.1" }))).toBe("NO_SUCH_ROAD");
    expect(refusal(await api.setShareMode({ session: zed, road, shareMode: "DETAILS" }))).toBe("NO_SUCH_ROAD");
  });
});
