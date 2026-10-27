// Tests for loading a catalog snapshot into CourseOffering and Constrain
// (src/catalog/import.ts), against the Catalog section of design/compositions/BFSThisMess.md.
//
// Run with: bun test test/importCatalog.test.ts (needs MongoDB at MONGODB_URI)

import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { importCatalog } from "../src/catalog/import.ts";
import { TimeBudgetConcept } from "../src/concepts/TimeBudget.ts";
import { ConstrainConcept } from "../src/concepts/Constrain.ts";
import { CourseOfferingConcept, type SnapshotCourse } from "../src/concepts/CourseOffering.ts";
import { RequirementsConcept } from "../src/concepts/Requirements.ts";
import { useFreshDb } from "./support.ts";

/*
 * Testing strategy
 *
 * partition on the snapshot file: missing; present and not loaded yet; already loaded; already loaded but forced;
 *   loaded into CourseOffering but its copy into Constrain cut short
 * partition on the requirements file: missing; present (loaded after the subjects); already loaded;
 *   edited under the same id
 * partition on a subject: with prerequisites; with corequisites; with cancellations; neither
 * partition on a reload with a new id: dependencies and cancellations change (replaced, not added to)
 */

const db = useFreshDb("import_catalog_test");
const dir = mkdtempSync(join(tmpdir(), "catalog-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
const quiet = () => {};

const course = (subject: string, fields: Partial<SnapshotCourse> = {}): SnapshotCourse => ({
  subject, name: subject, courseId: subject, description: "", lecturer: "Staff", level: "Undergraduate",
  terms: ["FALL", "SPRING"], offering: "Offered normally", canBeRepeated: false, prerequisitesText: "",
  corequisitesText: "", units: "3-0-9", prerequisites: [], corequisites: [], totalUnits: 12,
  ...fields,
});

// Each test reads the subjects it is given and no requirements, unless it says otherwise.
const NO_REQUIREMENTS = join(dir, "no-requirements.json");

function writeRequirements(id: string) {
  const path = join(dir, `requirements-${id}.json`);
  writeFileSync(path, JSON.stringify({
    id, source: "test",
    lists: [{ id: "major6-3", title: "Computer Science", shortTitle: "6-3", mediumTitle: "6-3 Major", kind: "MAJOR" }],
    items: [{ key: "major6-3/1", list: "major6-3", parent: null, kind: "BLOCK", title: "Software", count: 1, options: ["6.1020"], approximate: false, technical: true, order: 0 }],
  }));
  return path;
}

function write(id: string, courses: SnapshotCourse[], scheduleSeason?: { year: number; term: string }) {
  const path = join(dir, `${id}.json`);
  writeFileSync(path, JSON.stringify({ id, source: "test", academicYear: 2026, scheduleSeason, courses }));
  return path;
}

const SUBJECTS = [
  course("6.100A", { totalUnits: 6, units: "2-0-4" }),
  course("6.1010", { prerequisites: [{ count: 1, options: ["6.100A"] }] }),
  course("6.1020", {
    terms: ["SPRING"],
    offering: "Not offered NEXT year",
    prerequisites: [{ count: 1, options: ["6.1010"] }],
    corequisites: [{ count: 1, options: ["6.100A"] }],
  }),
  course("21M.301", { terms: ["FALL"] }),
];

describe("importCatalog", () => {
  test("covers: missing file -> nothing loaded", async () => {
    expect(await importCatalog(db(), { path: join(dir, "none.json"), log: quiet })).toMatchObject({ loaded: false, id: "", count: 0 });
  });

  test("covers: new snapshot -> loaded into CourseOffering and copied into Constrain", async () => {
    const path = write("one", SUBJECTS);
    expect(await importCatalog(db(), { path, requirementsPath: NO_REQUIREMENTS, log: quiet })).toMatchObject({ loaded: true, id: "one", count: 4 });

    const offering = new CourseOfferingConcept(db());
    expect((await offering._search({})).map((r) => r.course)).toEqual(["6.100A", "6.1010", "6.1020", "21M.301"]);

    // A road that has to take 6.1020 needs 6.100A, then 6.1010, before it, as the copied facts say.
    const constrain = new ConstrainConcept(db());
    const { road } = await constrain.newRoad({ name: "R", major: "6-3", startYear: 2026, startTerm: "FALL" });
    const { block } = await constrain.addBlock({ road, count: 1, technical: true });
    await constrain.addOption({ block, subject: "6.1020" });
    const plan = await constrain._findPath({ road, includeIAPAndSummer: false, limit: 1 });
    const TERMS = ["IAP", "SPRING", "SUMMER", "FALL"];
    const season = (s: string) => {
      const row = plan.find((r) => r.subject === s)!;
      return row.year * 4 + TERMS.indexOf(row.term);
    };
    expect(plan.map((r) => r.subject).sort()).toEqual(["6.100A", "6.1010", "6.1020"]);
    expect(season("6.100A")).toBeLessThan(season("6.1010"));
    expect(season("6.1010")).toBeLessThan(season("6.1020"));
    // 6.1020 runs only in the spring and is not offered next academic year, so not in SPRING 2028.
    expect(plan.find((r) => r.subject === "6.1020")).not.toEqual(expect.objectContaining({ year: 2028, term: "SPRING" }));
  });

  test("covers: each subject's schedule and hours copied into TimeBudget, the schedule with its season", async () => {
    const path = write("hours", [
      course("6.1210", { schedule: "Lecture,26-100/TR/0/11-12.30;Recitation,34-304/WF/0/10,34-304/WF/0/11", inClassHours: 4.11, outOfClassHours: 7.61, contactUnits: 5 }),
      course("21M.301", { contactUnits: 3 }),
      course("1.00", { schedule: "Lecture,1-134/T/0/2-4;Lab,TBA" }),
    ], { year: 2026, term: "FALL" });
    await importCatalog(db(), { path, requirementsPath: NO_REQUIREMENTS, log: quiet });
    const budget = new TimeBudgetConcept(db());
    expect(await budget._classHours({ user: "u", subject: "6.1210", year: 2026, term: "FALL" }))
      .toMatchObject({ inClass: 5, inClassSource: "SCHEDULE", outOfClass: 7.61, schedule: "EXACT" });
    expect((await budget._sections({ subject: "6.1210", year: 2026, term: "FALL" })).filter((r) => r.kind === "RECITATION"))
      .toEqual([
        { kind: "RECITATION", section: 1, room: "34-304", day: 2, start: 40, slots: 4 },
        { kind: "RECITATION", section: 1, room: "34-304", day: 4, start: 40, slots: 4 },
        { kind: "RECITATION", section: 2, room: "34-304", day: 2, start: 44, slots: 4 },
        { kind: "RECITATION", section: 2, room: "34-304", day: 4, start: 44, slots: 4 },
      ]);
    expect(await budget._classHours({ user: "u", subject: "21M.301", year: 2026, term: "FALL" }))
      .toMatchObject({ inClass: 3, inClassSource: "UNITS", outOfClass: 6, outOfClassSource: "FORMULA" });
    expect((await budget._classHours({ user: "u", subject: "1.00", year: 2026, term: "FALL" })).schedule).toBe("ARRANGED");
  });

  test("covers: a snapshot with schedules but no season keeps no schedule", async () => {
    const path = write("noseason", [course("6.1210", { schedule: "Lecture,26-100/TR/0/11-12.30", contactUnits: 5 })]);
    await importCatalog(db(), { path, requirementsPath: NO_REQUIREMENTS, log: quiet });
    expect(await new TimeBudgetConcept(db())._classHours({ user: "u", subject: "6.1210", year: 2026, term: "FALL" }))
      .toMatchObject({ inClass: 5, inClassSource: "UNITS", schedule: "NONE" });
  });

  test("covers: the same snapshot again -> skipped; forced -> loaded", async () => {
    const path = write("two", SUBJECTS);
    await importCatalog(db(), { path, requirementsPath: NO_REQUIREMENTS, log: quiet });
    expect(await importCatalog(db(), { path, requirementsPath: NO_REQUIREMENTS, log: quiet })).toMatchObject({ loaded: false, id: "two", count: 0 });
    expect(await importCatalog(db(), { path, requirementsPath: NO_REQUIREMENTS, force: true, log: quiet })).toMatchObject({ loaded: true, id: "two", count: 4 });
  });

  test("covers: a copy into Constrain cut short -> copied again on the next start", async () => {
    const path = write("cut", SUBJECTS);
    // The server stopped right after CourseOffering.load, before copying any subject.
    await new CourseOfferingConcept(db()).load({ snapshot: await Bun.file(path).text() });
    const constrain = new ConstrainConcept(db());
    expect((await constrain._loadedCatalog({})).found).toBe(false);

    expect(await importCatalog(db(), { path, requirementsPath: NO_REQUIREMENTS, log: quiet })).toMatchObject({ loaded: true, id: "cut", count: 4 });
    expect(await constrain._loadedCatalog({})).toEqual({ found: true, id: expect.stringMatching(/^cut\+[0-9a-f]{12}$/) });
    await constrain.markCancelled({ subject: "21M.301", year: 2026, term: "FALL" }); // refused if 21M.301 had no listing
  });

  test("covers: a snapshot edited under the same id -> copied again, with its new facts", async () => {
    const path = write("same", SUBJECTS);
    await importCatalog(db(), { path, requirementsPath: NO_REQUIREMENTS, log: quiet });
    write("same", SUBJECTS.map((c) => (c.subject === "6.100A" ? { ...c, enrollment: 500 } : c)));
    expect(await importCatalog(db(), { path, requirementsPath: NO_REQUIREMENTS, log: quiet })).toMatchObject({ loaded: true, id: "same" });
    expect(await importCatalog(db(), { path, requirementsPath: NO_REQUIREMENTS, log: quiet })).toMatchObject({ loaded: false });
  });

  test("covers: a new snapshot replaces dependencies and cancellations instead of adding to them", async () => {
    await importCatalog(db(), { path: write("fall", SUBJECTS), log: quiet });
    await importCatalog(db(), {
      requirementsPath: NO_REQUIREMENTS,
      path: write("spring", [
        ...SUBJECTS.filter((c) => c.subject !== "6.1020"),
        course("6.1020", { terms: ["SPRING"], prerequisites: [{ count: 1, options: ["6.100A"] }] }),
      ]),
      log: quiet,
    });

    const offering = new CourseOfferingConcept(db());
    expect((await offering._prerequisites({ course: "6.1020" })).map((r) => r.prerequisite)).toEqual(["6.100A"]);
    expect(await offering._cancellations({ course: "6.1020" })).toEqual([]);

    // In Constrain too: 6.1020 now only needs 6.100A and runs in SPRING 2027.
    const constrain = new ConstrainConcept(db());
    const { road } = await constrain.newRoad({ name: "R", major: "6-3", startYear: 2026, startTerm: "FALL" });
    const { block } = await constrain.addBlock({ road, count: 1, technical: true });
    await constrain.addOption({ block, subject: "6.1020" });
    const plan = await constrain._findPath({ road, includeIAPAndSummer: false, limit: 1 });
    expect(plan.map((r) => r.subject).sort()).toEqual(["6.100A", "6.1020"]);
    expect(plan.find((r) => r.subject === "6.1020")).toEqual(expect.objectContaining({ year: 2027, term: "SPRING" }));
  });
});

describe("importCatalog requirements", () => {
  test("covers: requirements load after the subjects, and are skipped once loaded", async () => {
    const path = write("subjects", SUBJECTS);
    const requirementsPath = writeRequirements("r1");
    expect((await importCatalog(db(), { path, requirementsPath, log: quiet })).requirements).toEqual({ loaded: true, id: "r1", count: 1 });
    expect(await new RequirementsConcept(db())._activeBlocks({ list: "major6-3", road: "any" })).toEqual([
      { item: "major6-3/1", title: "Software", count: 1, technical: true, group: "major6-3" },
    ]);
    expect((await importCatalog(db(), { path, requirementsPath, log: quiet })).requirements).toEqual({ loaded: false, id: "r1", count: 0 });
  });

  test("covers: a requirements file edited under the same id -> loaded again", async () => {
    const path = write("subjects3", SUBJECTS);
    const requirementsPath = writeRequirements("r2");
    await importCatalog(db(), { path, requirementsPath, log: quiet });
    const edited = JSON.parse(readFileSync(requirementsPath, "utf8"));
    edited.items[0].title = "Software Construction";
    writeFileSync(requirementsPath, JSON.stringify(edited));
    expect((await importCatalog(db(), { path, requirementsPath, log: quiet })).requirements).toEqual({ loaded: true, id: "r2", count: 1 });
    expect((await new RequirementsConcept(db())._activeBlocks({ list: "major6-3", road: "any" }))[0].title).toBe("Software Construction");
  });

  test("covers: missing requirements file -> none loaded, subjects still loaded", async () => {
    const result = await importCatalog(db(), { path: write("subjects2", SUBJECTS), requirementsPath: join(dir, "none.json"), log: quiet });
    expect(result).toMatchObject({ loaded: true, count: 4, requirements: { loaded: false, id: "", count: 0 } });
  });
});
