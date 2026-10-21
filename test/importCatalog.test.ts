// Tests for loading a catalog snapshot into CourseOffering and Constrain
// (src/catalog/import.ts), against the Catalog section of design/compositions/BFSThisMess.md.
//
// Run with: bun test test/importCatalog.test.ts (needs MongoDB at MONGODB_URI)

import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { importCatalog } from "../src/catalog/import.ts";
import { ConstrainConcept } from "../src/concepts/Constrain.ts";
import { CourseOfferingConcept, type SnapshotCourse } from "../src/concepts/CourseOffering.ts";
import { useFreshDb } from "./support.ts";

/*
 * Testing strategy
 *
 * partition on the snapshot file: missing; present and not loaded yet; already loaded; already loaded but forced
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
  corequisitesText: "", units: "3-0-9", prerequisites: [], corequisites: [], totalUnits: 12, technical: true,
  ...fields,
});

function write(id: string, courses: SnapshotCourse[]) {
  const path = join(dir, `${id}.json`);
  writeFileSync(path, JSON.stringify({ id, source: "test", academicYear: 2026, courses }));
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
  course("21M.301", { technical: false, terms: ["FALL"] }),
];

describe("importCatalog", () => {
  test("covers: missing file -> nothing loaded", async () => {
    expect(await importCatalog(db(), { path: join(dir, "none.json"), log: quiet })).toEqual({ loaded: false, id: "", count: 0 });
  });

  test("covers: new snapshot -> loaded into CourseOffering and copied into Constrain", async () => {
    const path = write("one", SUBJECTS);
    expect(await importCatalog(db(), { path, log: quiet })).toEqual({ loaded: true, id: "one", count: 4 });

    const offering = new CourseOfferingConcept(db());
    expect((await offering._search({})).map((r) => r.course)).toEqual(["6.100A", "6.1010", "6.1020", "21M.301"]);

    // A road that has to take 6.1020 needs 6.100A, then 6.1010, before it, as the copied facts say.
    const constrain = new ConstrainConcept(db());
    const { road } = await constrain.newRoad({ name: "R", major: "6-3", startYear: 2026, startTerm: "FALL" });
    const { block } = await constrain.addBlock({ road, count: 1 });
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

  test("covers: the same snapshot again -> skipped; forced -> loaded", async () => {
    const path = write("two", SUBJECTS);
    await importCatalog(db(), { path, log: quiet });
    expect(await importCatalog(db(), { path, log: quiet })).toEqual({ loaded: false, id: "two", count: 0 });
    expect(await importCatalog(db(), { path, force: true, log: quiet })).toEqual({ loaded: true, id: "two", count: 4 });
  });

  test("covers: a new snapshot replaces dependencies and cancellations instead of adding to them", async () => {
    await importCatalog(db(), { path: write("fall", SUBJECTS), log: quiet });
    await importCatalog(db(), {
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
    const { block } = await constrain.addBlock({ road, count: 1 });
    await constrain.addOption({ block, subject: "6.1020" });
    const plan = await constrain._findPath({ road, includeIAPAndSummer: false, limit: 1 });
    expect(plan.map((r) => r.subject).sort()).toEqual(["6.100A", "6.1020"]);
    expect(plan.find((r) => r.subject === "6.1020")).toEqual(expect.objectContaining({ year: 2027, term: "SPRING" }));
  });
});
