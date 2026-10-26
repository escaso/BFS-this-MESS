/* Tests for the Constrain concept, derived from the concept specification
 * (Constrain.md), not from the implementation.
 *
 * Run with: bun test test/Constrain.test.ts (needs MongoDB at MONGODB_URI)
 */

import { describe, test as it, expect, beforeEach } from "bun:test";
import { ConstrainConcept, type Term } from "../src/concepts/Constrain.ts";
import { refusalsOf, useFreshDb } from "./support.ts";

/*
 * Testing strategy
 *
 * Every action and query is tested through the concept's public interface only.
 * Refusals are checked by the code and sentence the spec declares for that action.
 * Where several refusal conditions hold at once, the spec's first matching
 * branch is expected ("road does not exist" first).
 * Queries are only called where their `where` precondition holds; the spec
 * leaves other calls undefined, so they are not tested.
 *
 * newRoad(name, major, startYear, startTerm)
 *   partition on name: empty, non-empty
 *   partition on startTerm: FALL, SPRING, IAP, SUMMER
 *   partition on outcome: success, refusal
 *   cover: FALL start (end SPRING Y+4), SPRING start (end FALL Y+3),
 *          empty name, IAP start, SUMMER start, empty name and IAP start together
 *
 * renameRoad / setMajor / deleteRoad
 *   partition on road: exists, does not exist, deleted
 *   partition on name / major: empty, non-empty
 *   cover: each combination, including nonexistent road with an empty name;
 *          deleteRoad removes the road's blocks
 *
 * setStart(road, year, term)
 *   partition on term: FALL/SPRING, IAP/SUMMER
 *   partition on shift: whole years, odd number of semesters, earlier, later
 *   partition on extra semester added with setEnd: none, one
 *   partition on pins: all stay in span, some fall before the new start,
 *                      some fall after the new end
 *   cover: each part; _pinsLostBySetStart agrees with what is deleted and does not mutate
 *
 * setEnd(road, year, term)
 *   partition on end relative to start: before, equal, after
 *   partition on direction: earlier than old end, later than old end
 *   partition on pins: none after new end, some after new end
 *   cover: each part; _pinsLostBySetEnd agrees with what is deleted and does not mutate
 *
 * addPrior / removePrior
 *   partition on subject: pinned, not pinned; already prior, not prior; has Listing, has none
 *   cover: each part (addPrior on a pinned subject deletes the pin)
 *
 * addBlock / setCount / addOption / removeOption / removeBlock / _blocks / _roadOfBlock
 *   partition on count: < 1, = 1, > 1
 *   partition on block: exists, does not exist
 *   partition on option: already an option, not an option
 *   partition on number of options: 0, 1, many
 *   partition on number of blocks: 1, many (rows ordered by block)
 *   cover: each part
 *
 * pin(road, subject, year, term) / unPin(road, subject)
 *   partition on subject: has no Listing, prior credit, unpinned, pinned elsewhere
 *   partition on season: before start, at start, inside, at end, after end
 *   partition on locking: target locked, current pin locked, neither
 *   cover: each refusal; re-pin moves the pin; _pins ordered IAP < SPRING < SUMMER < FALL
 *
 * setLocked / setCap / clearCap / resetSemester / _semesters
 *   partition on term: IAP (default cap 12), other
 *   partition on capType: total, technical, invalid
 *   partition on limit: negative, 0, positive
 *   partition on semester: has settings, has no settings
 *   partition on locked seasons: one, several non-contiguous
 *   cover: each part; absent caps are reported as 0; reset restores the defaults
 *
 * Listings, Dependencies, Cancellations
 *   partition on subject: has Listing, no Listing
 *   partition on count: < 1, >= 1
 *   partition on cancellation: exists, does not exist
 *   cover: each refusal; setListing keeps terms and replaces units; removeListing cascades;
 *          removeDependency and unmarkCancelled take effect in _options
 *
 * _satisfies(road)
 *   partition on blocks: none, one block with no options, one satisfied, one unsatisfied,
 *                        shared subject across two blocks, count > 1
 *   partition on credit: pinned, prior
 *   partition on term availability: subject runs in pinned term, does not, is cancelled
 *   partition on dependency: none, PREREQUISITE (earlier / same / later / prior credit),
 *                            COREQUISITE (earlier / same / later), count 1, count 2
 *   partition on caps: none, within, exceeded; semester unlocked, locked; total, technical;
 *                      IAP with no Semester (default cap 12)
 *
 * _options(road, includeIAPAndSummer)
 *   partition on includeIAPAndSummer: true, false
 *   partition on subject: in block / not in block, taken (pinned or prior), runs / does not run,
 *                         cancelled, dependency met / not met (prereq, coreq, via prior credit),
 *                         candidate only as a (transitive) dependency of a block option
 *   partition on season: locked, unlocked, inside span, past the end
 *   partition on caps: no cap, would exceed total, would exceed technical, cap of 0, IAP default
 *   partition on fitsByEnd: true, false
 *
 * _findPath(road, includeIAPAndSummer, limit)
 *   partition on limit: 1, > number of plans
 *   partition on blocks: count 1, count 2, with prerequisite between block options
 *   partition on pins: none, pin in a block, pin outside every block, pin in IAP
 *   partition on prior credit: none, covers part of a block
 *   partition on locked semesters: none, one with pins
 *   partition on caps: none, binding
 *   partition on includeIAPAndSummer: true, false
 *   partition on finish: by the end of the road, only after the end
 *   partition on dependencies outside every block: none, a chain behind a block option,
 *                         a prerequisite of a pin, one that cannot fit before its pin
 *   partition on result: plans exist, no plan exists
 *   cover: each part; every returned plan passes _satisfies once pinned
 *
 * Principle: prior credit, pinned and locked history, blocks, a cap, options,
 *   earliest plans, and relaxing a cap to finish earlier.
 */

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

const FS: Term[] = ["FALL", "SPRING"];
const ALL_TERMS: Term[] = ["IAP", "SPRING", "SUMMER", "FALL"];
const rank = (year: number, term: Term) => year * 4 + ALL_TERMS.indexOf(term);

type Row = { year: number; term: Term; subject: string };
type PlanRow = Row & { plan: number };

const db = useFreshDb("constrain_test");
const expectRefusal = refusalsOf("Constrain");
let c: ConstrainConcept;
let known: Set<string>;

beforeEach(() => {
  c = new ConstrainConcept(db());
  known = new Set();
});

async function addSubject(id: string, units: number, terms: Term[] = FS): Promise<void> {
  await c.setListing({ subject: id, units });
  for (const term of terms) await c.addListingTerm({ subject: id, term });
  known.add(id);
}

/** Gives a Listing (12 units, no terms) to each subject that has none, so it can be an option or prior credit. */
async function listed(...ids: string[]): Promise<void> {
  for (const id of ids) {
    if (known.has(id)) continue;
    await c.setListing({ subject: id, units: 12 });
    known.add(id);
  }
}

async function prerequisite(course: string, options: string[], count = 1, kind: "PREREQUISITE" | "COREQUISITE" = "PREREQUISITE") {
  const { dependency } = await c.addDependency({ course, kind, count });
  for (const subject of options) await c.addDependencyOption({ dependency, subject });
  return dependency;
}

/** A road starting FALL 2026, so its default end is SPRING 2030. */
async function makeRoad(startYear = 2026, startTerm: Term = "FALL"): Promise<string> {
  return (await c.newRoad({ name: "My road", major: "6-3", startYear, startTerm })).road;
}

async function addBlock(road: string, count: number, options: string[], technical = false): Promise<string> {
  const { block } = await c.addBlock({ road, count, technical });
  await listed(...options);
  for (const subject of options) await c.addOption({ block, subject });
  return block;
}

const keys = (rows: Row[]): string[] => rows.map((r) => `${r.year}-${r.term}-${r.subject}`);
const sorted = (xs: string[]): string[] => [...xs].sort();
const satisfied = async (road: string) => (await c._satisfies({ road })).satisfied;
const lastSeason = (plan: Row[]) => Math.max(...plan.map((r) => rank(r.year, r.term)));

function groupPlans(rows: PlanRow[]): PlanRow[][] {
  const byPlan = new Map<number, PlanRow[]>();
  for (const r of rows) byPlan.set(r.plan, [...(byPlan.get(r.plan) ?? []), r]);
  return [...byPlan.values()];
}

/** Pins every row of a plan that is not pinned already (locked rows are already pins). */
async function pinPlan(road: string, plan: Row[]) {
  const pinned = new Set(keys(await c._pins({ road })));
  for (const r of plan) {
    if (!pinned.has(`${r.year}-${r.term}-${r.subject}`)) {
      await c.pin({ road, subject: r.subject, year: r.year, term: r.term });
    }
  }
}

// ---------------------------------------------------------------------------
// Principle
// ---------------------------------------------------------------------------

describe("principle", () => {
  it("records history, adds requirements, caps a semester, finds plans, and relaxes the cap to finish earlier", async () => {
    // A student creates a road for a major, starting in a given semester.
    const road = (await c.newRoad({ name: "Course 6", major: "6-3", startYear: 2026, startTerm: "FALL" })).road;

    await addSubject("18.01", 12);
    await addSubject("6.100A", 6);
    await addSubject("6.1010", 12);
    await addSubject("6.1200", 12);
    await addSubject("6.1210", 12);
    await prerequisite("6.1010", ["6.100A"]);
    await prerequisite("6.1200", ["18.01"]);
    await prerequisite("6.1210", ["6.1010"]);
    await prerequisite("6.1210", ["6.1200"]);

    // Prior credit, and a past semester pinned and locked.
    await listed("18.01");
    await c.addPrior({ road, subject: "18.01" });
    await c.pin({ road, subject: "6.100A", year: 2026, term: "FALL" });
    await c.setLocked({ road, year: 2026, term: "FALL", locked: true });

    // The major's requirements, as blocks.
    await addBlock(road, 1, ["6.1010"]);
    await addBlock(road, 1, ["6.1200"]);
    await addBlock(road, 1, ["6.1210"]);

    // A cap of 12 units in SPRING 2027.
    await c.setCap({ road, year: 2027, term: "SPRING", capType: "total", limit: 12 });

    // Options that still fit: nothing in the locked FALL 2026, and not 6.1210 before its prerequisites.
    const options = keys(await c._options({ road, includeIAPAndSummer: false }));
    expect(options).toContain("2027-SPRING-6.1010");
    expect(options).toContain("2027-SPRING-6.1200");
    expect(options.some((k) => k.startsWith("2026-FALL"))).toBe(false);
    expect(options.some((k) => k.endsWith("6.1210"))).toBe(false);

    // The cap allows one of the two in SPRING 2027, so the earliest plans finish in SPRING 2028.
    const capped = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 3 }));
    expect(capped.length).toBeGreaterThanOrEqual(1);
    for (const p of capped) {
      expect(lastSeason(p)).toBe(rank(2028, "SPRING"));
      expect(p.filter((r) => r.year === 2026 && r.term === "FALL").map((r) => r.subject)).toEqual(["6.100A"]);
      expect(p.some((r) => r.subject === "18.01")).toBe(false); // prior credit has no rows
    }

    // Relaxing the cap widens the set of plans: now they finish in FALL 2027.
    await c.clearCap({ road, year: 2027, term: "SPRING", capType: "total" });
    const [relaxed] = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 1 }));
    expect(sorted(keys(relaxed))).toEqual(["2026-FALL-6.100A", "2027-FALL-6.1210", "2027-SPRING-6.1010", "2027-SPRING-6.1200"]);

    await pinPlan(road, relaxed);
    expect(await satisfied(road)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Roads
// ---------------------------------------------------------------------------

describe("newRoad", () => {
  it("covers FALL start: default end is SPRING of Y + 4, and the road starts empty", async () => {
    const road = await makeRoad(2026, "FALL");
    expect(await c._road({ road })).toEqual({
      name: "My road",
      major: "6-3",
      startYear: 2026,
      startTerm: "FALL",
      endYear: 2030,
      endTerm: "SPRING",
    });
    expect(await c._prior({ road })).toEqual([]);
    expect(await c._blocks({ road })).toEqual([]);
    expect(await c._pins({ road })).toEqual([]);
    expect(await c._semesters({ road })).toEqual([]);
  });

  it("covers SPRING start: default end is FALL of Y + 3", async () => {
    const road = await makeRoad(2027, "SPRING");
    const r = await c._road({ road });
    expect([r.endYear, r.endTerm]).toEqual([2030, "FALL"]);
  });

  it("covers distinct roads for repeated calls", async () => {
    expect(await makeRoad()).not.toBe(await makeRoad());
  });

  it("covers empty name, IAP start, SUMMER start, and empty name with bad start", async () => {
    await expectRefusal("newRoad", "EMPTY_NAME", c.newRoad({ name: "", major: "6-3", startYear: 2026, startTerm: "FALL" }));
    await expectRefusal("newRoad", "BAD_START", c.newRoad({ name: "x", major: "6-3", startYear: 2026, startTerm: "IAP" }));
    await expectRefusal("newRoad", "BAD_START", c.newRoad({ name: "x", major: "6-3", startYear: 2026, startTerm: "SUMMER" }));
    await expectRefusal("newRoad", "EMPTY_NAME", c.newRoad({ name: "", major: "6-3", startYear: 2026, startTerm: "IAP" }));
  });
});

describe("copyRoad", () => {
  it("covers: copies major, span, blocks, pins and semesters, not prior credit; refusals", async () => {
    const road = await makeRoad();
    await addSubject("A", 12);
    await addSubject("B", 12);
    await c.addPrior({ road, subject: "B" });
    const block = await addBlock(road, 1, ["A"], true);
    await c.pin({ road, subject: "A", year: 2026, term: "FALL" });
    await c.setCap({ road, year: 2027, term: "SPRING", capType: "technical", limit: 24 });
    await c.setLocked({ road, year: 2026, term: "FALL", locked: true });
    await c.setEnd({ road, year: 2030, term: "FALL" });

    await expectRefusal("copyRoad", "NO_SUCH_ROAD", c.copyRoad({ road: "nope", name: "X" }));
    await expectRefusal("copyRoad", "EMPTY_NAME", c.copyRoad({ road, name: "" }));
    const { copy } = await c.copyRoad({ road, name: "Copy" });
    expect(copy).not.toBe(road);
    expect(await c._road({ road: copy })).toEqual({ ...(await c._road({ road })), name: "Copy" });
    expect(await c._prior({ road: copy })).toEqual([]);
    expect(await c._pins({ road: copy })).toEqual(await c._pins({ road }));
    expect(await c._semesters({ road: copy })).toEqual(await c._semesters({ road }));
    const [copied] = await c._blocks({ road: copy });
    expect(copied).toMatchObject({ count: 1, subject: "A", technical: true });
    expect(copied.block).not.toBe(block); // its own block, so changing one leaves the other

    await c.removeBlock({ block: copied.block });
    expect((await c._blocks({ road })).length).toBe(1);
  });
});

describe("renameRoad, setMajor, deleteRoad", () => {
  it("covers existing road with non-empty / empty values", async () => {
    const road = await makeRoad();
    expect(await c.renameRoad({ road, name: "Renamed" })).toEqual({});
    expect(await c.setMajor({ road, major: "2-A" })).toEqual({});
    const r = await c._road({ road });
    expect([r.name, r.major]).toEqual(["Renamed", "2-A"]);
    await expectRefusal("renameRoad", "EMPTY_NAME", c.renameRoad({ road, name: "" }));
    await expectRefusal("setMajor", "EMPTY_MAJOR", c.setMajor({ road, major: "" }));
    const after = await c._road({ road });
    expect([after.name, after.major]).toEqual(["Renamed", "2-A"]);
  });

  it("covers nonexistent road, which is checked before an empty name or major", async () => {
    await expectRefusal("renameRoad", "NO_SUCH_ROAD", c.renameRoad({ road: "nope", name: "" }));
    await expectRefusal("renameRoad", "NO_SUCH_ROAD", c.renameRoad({ road: "nope", name: "x" }));
    await expectRefusal("setMajor", "NO_SUCH_ROAD", c.setMajor({ road: "nope", major: "x" }));
    await expectRefusal("setMajor", "NO_SUCH_ROAD", c.setMajor({ road: "nope", major: "" }));
    await expectRefusal("deleteRoad", "NO_SUCH_ROAD", c.deleteRoad({ road: "nope" }));
  });

  it("covers deleteRoad removing the road and its blocks, leaving other roads alone", async () => {
    const road = await makeRoad();
    const other = await makeRoad();
    const block = await addBlock(road, 1, []);
    const otherBlock = await addBlock(other, 1, ["A"]);
    expect(await c.deleteRoad({ road })).toEqual({});
    expect(await c._roadOfBlock({ block })).toEqual([]);
    await expectRefusal("deleteRoad", "NO_SUCH_ROAD", c.deleteRoad({ road }));
    await expectRefusal("renameRoad", "NO_SUCH_ROAD", c.renameRoad({ road, name: "x" }));
    await expectRefusal("addBlock", "NO_SUCH_ROAD", c.addBlock({ road, count: 1, technical: false }));
    expect(await c._roadOfBlock({ block: otherBlock })).toEqual([{ road: other }]);
  });
});

describe("setStart", () => {
  it("covers whole-year shift and odd-semester shift", async () => {
    const road = await makeRoad(2026, "FALL"); // ends SPRING 2030
    expect(await c.setStart({ road, year: 2027, term: "FALL" })).toEqual({});
    let r = await c._road({ road });
    expect([r.startYear, r.startTerm, r.endYear, r.endTerm]).toEqual([2027, "FALL", 2031, "SPRING"]);
    await c.setStart({ road, year: 2028, term: "SPRING" }); // one semester later
    r = await c._road({ road });
    expect([r.startYear, r.startTerm, r.endYear, r.endTerm]).toEqual([2028, "SPRING", 2031, "FALL"]);
  });

  it("covers moving the start earlier", async () => {
    const road = await makeRoad(2027, "SPRING"); // ends FALL 2030
    await c.setStart({ road, year: 2026, term: "FALL" });
    const r = await c._road({ road });
    expect([r.startYear, r.startTerm, r.endYear, r.endTerm]).toEqual([2026, "FALL", 2030, "SPRING"]);
  });

  it("covers a road with an extra semester", async () => {
    const road = await makeRoad(2026, "FALL");
    await c.setEnd({ road, year: 2030, term: "FALL" });
    await c.setStart({ road, year: 2027, term: "FALL" });
    const r = await c._road({ road });
    expect([r.endYear, r.endTerm]).toEqual([2031, "FALL"]);
  });

  it("covers IAP/SUMMER start and nonexistent road", async () => {
    const road = await makeRoad();
    await expectRefusal("setStart", "BAD_START", c.setStart({ road, year: 2027, term: "IAP" }));
    await expectRefusal("setStart", "BAD_START", c.setStart({ road, year: 2027, term: "SUMMER" }));
    await expectRefusal("setStart", "NO_SUCH_ROAD", c.setStart({ road: "nope", year: 2027, term: "FALL" }));
    await expectRefusal("setStart", "NO_SUCH_ROAD", c.setStart({ road: "nope", year: 2027, term: "IAP" }));
    const r = await c._road({ road });
    expect([r.startYear, r.startTerm]).toEqual([2026, "FALL"]);
  });

  it("covers pins lost before the new start; _pinsLostBySetStart predicts them without mutating", async () => {
    const road = await makeRoad();
    await addSubject("A", 12);
    await addSubject("B", 12);
    await c.pin({ road, subject: "A", year: 2026, term: "FALL" });
    await c.pin({ road, subject: "B", year: 2030, term: "SPRING" });

    const lost = await c._pinsLostBySetStart({ road, year: 2027, term: "FALL" });
    expect(lost).toEqual([{ subject: "A", year: 2026, term: "FALL" }]);
    expect(await c._pins({ road })).toHaveLength(2);

    await c.setStart({ road, year: 2027, term: "FALL" });
    expect(await c._pins({ road })).toEqual([{ subject: "B", year: 2030, term: "SPRING" }]);
  });

  it("covers pins lost after the new end when the start moves earlier, predicted by _pinsLostBySetStart", async () => {
    const road = await makeRoad(2027, "FALL"); // ends SPRING 2031
    await addSubject("A", 12);
    await addSubject("B", 12);
    await c.pin({ road, subject: "A", year: 2031, term: "SPRING" });
    await c.pin({ road, subject: "B", year: 2028, term: "SPRING" });
    expect(await c._pinsLostBySetStart({ road, year: 2026, term: "FALL" })).toEqual([
      { subject: "A", year: 2031, term: "SPRING" },
    ]);
    await c.setStart({ road, year: 2026, term: "FALL" }); // end moves to SPRING 2030
    expect(await c._pins({ road })).toEqual([{ subject: "B", year: 2028, term: "SPRING" }]);
  });

  it("covers no pins lost: _pinsLostBySetStart answers no rows", async () => {
    const road = await makeRoad();
    await addSubject("A", 12);
    await c.pin({ road, subject: "A", year: 2028, term: "FALL" });
    expect(await c._pinsLostBySetStart({ road, year: 2027, term: "SPRING" })).toEqual([]);
  });
});

describe("setEnd", () => {
  it("covers end equal to or before the start, and nonexistent road", async () => {
    const road = await makeRoad();
    await expectRefusal("setEnd", "END_BEFORE_START", c.setEnd({ road, year: 2026, term: "FALL" }));
    await expectRefusal("setEnd", "END_BEFORE_START", c.setEnd({ road, year: 2026, term: "SPRING" }));
    await expectRefusal("setEnd", "NO_SUCH_ROAD", c.setEnd({ road: "nope", year: 2030, term: "FALL" }));
    await expectRefusal("setEnd", "NO_SUCH_ROAD", c.setEnd({ road: "nope", year: 2020, term: "FALL" }));
    const r = await c._road({ road });
    expect([r.endYear, r.endTerm]).toEqual([2030, "SPRING"]);
  });

  it("covers an earlier end that deletes pins; _pinsLostBySetEnd predicts them without mutating", async () => {
    const road = await makeRoad();
    await addSubject("A", 12);
    await addSubject("B", 12);
    await c.pin({ road, subject: "A", year: 2027, term: "SPRING" });
    await c.pin({ road, subject: "B", year: 2029, term: "FALL" });

    expect(await c._pinsLostBySetEnd({ road, year: 2028, term: "SPRING" })).toEqual([
      { subject: "B", year: 2029, term: "FALL" },
    ]);
    expect(await c._pins({ road })).toHaveLength(2);

    expect(await c.setEnd({ road, year: 2028, term: "SPRING" })).toEqual({});
    expect(await c._pins({ road })).toEqual([{ subject: "A", year: 2027, term: "SPRING" }]);
    const r = await c._road({ road });
    expect([r.endYear, r.endTerm]).toEqual([2028, "SPRING"]);
  });

  it("covers a later end that keeps every pin", async () => {
    const road = await makeRoad();
    await addSubject("A", 12);
    await c.pin({ road, subject: "A", year: 2027, term: "SPRING" });
    expect(await c._pinsLostBySetEnd({ road, year: 2031, term: "FALL" })).toEqual([]);
    await c.setEnd({ road, year: 2031, term: "FALL" });
    expect(await c._pins({ road })).toHaveLength(1);
    const r = await c._road({ road });
    expect([r.endYear, r.endTerm]).toEqual([2031, "FALL"]);
  });
});

// ---------------------------------------------------------------------------
// Prior credit
// ---------------------------------------------------------------------------

describe("prior credit", () => {
  it("covers addPrior on a pinned subject, repeated add, and pin refusal afterwards", async () => {
    const road = await makeRoad();
    await addSubject("A", 12);
    await c.pin({ road, subject: "A", year: 2026, term: "FALL" });
    expect(await c.addPrior({ road, subject: "A" })).toEqual({});
    expect(await c._pins({ road })).toEqual([]);
    expect(await c._prior({ road })).toEqual([{ subject: "A" }]);
    await listed("A");
    await c.addPrior({ road, subject: "A" });
    expect(await c._prior({ road })).toHaveLength(1);
    await expectRefusal("pin", "ALREADY_PRIOR", c.pin({ road, subject: "A", year: 2027, term: "FALL" }));
  });

  it("covers prior credit for a subject with no Listing, removePrior, and nonexistent road", async () => {
    const road = await makeRoad();
    await listed("A");
    await c.addPrior({ road, subject: "A" });
    await listed("B");
    await c.addPrior({ road, subject: "B" });
    expect(sorted((await c._prior({ road })).map((r) => r.subject))).toEqual(["A", "B"]);
    expect(await c.removePrior({ road, subject: "A" })).toEqual({});
    expect(await c._prior({ road })).toEqual([{ subject: "B" }]);
    await expectRefusal("removePrior", "NOT_PRIOR", c.removePrior({ road, subject: "A" }));
    await expectRefusal("addPrior", "NO_SUCH_ROAD", c.addPrior({ road: "nope", subject: "A" }));
    await expectRefusal("removePrior", "NO_SUCH_ROAD", c.removePrior({ road: "nope", subject: "A" }));
  });

  it("covers prior credit being per road", async () => {
    const road = await makeRoad();
    const other = await makeRoad();
    await listed("A");
    await c.addPrior({ road, subject: "A" });
    expect(await c._prior({ road: other })).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

describe("blocks", () => {
  it("covers addBlock with count < 1 and nonexistent road", async () => {
    const road = await makeRoad();
    await expectRefusal("addBlock", "BAD_COUNT", c.addBlock({ road, count: 0, technical: false }));
    await expectRefusal("addBlock", "BAD_COUNT", c.addBlock({ road, count: -1, technical: false }));
    await expectRefusal("addBlock", "NO_SUCH_ROAD", c.addBlock({ road: "nope", count: 1, technical: false }));
    await expectRefusal("addBlock", "NO_SUCH_ROAD", c.addBlock({ road: "nope", count: 0, technical: false }));
  });

  it("covers a block with 0 options, many options, duplicate option", async () => {
    const road = await makeRoad();
    const { block } = await c.addBlock({ road, count: 2, technical: false });
    expect(await c._blocks({ road })).toEqual([]); // a block with no options has no rows
    expect(await c._roadOfBlock({ block })).toEqual([{ road }]);

    await listed("A", "B");
    await c.addOption({ block, subject: "A" });
    await c.addOption({ block, subject: "B" });
    await c.addOption({ block, subject: "A" });
    const rows = await c._blocks({ road });
    expect(sorted(rows.map((r) => r.subject))).toEqual(["A", "B"]);
    expect(rows.every((r) => r.block === block && r.count === 2)).toBe(true);
  });

  it("covers several blocks: rows are ordered by block", async () => {
    const road = await makeRoad();
    await addBlock(road, 1, ["A", "B"]);
    await addBlock(road, 2, ["C", "D", "E"]);
    await addBlock(road, 1, ["F"]);
    const ids = (await c._blocks({ road })).map((r) => r.block);
    expect(ids).toHaveLength(6);
    expect(new Set(ids).size).toBe(3);
    // each block's rows are contiguous
    const runs = ids.filter((id, i) => i === 0 || ids[i - 1] !== id);
    expect(runs).toHaveLength(3);
  });

  it("covers setCount and removeOption on existing and nonexistent blocks", async () => {
    const road = await makeRoad();
    const block = await addBlock(road, 2, ["A", "B"]);
    expect(await c.setCount({ block, count: 1 })).toEqual({});
    expect((await c._blocks({ road })).every((r) => r.count === 1)).toBe(true);
    await expectRefusal("setCount", "BAD_COUNT", c.setCount({ block, count: 0 }));
    await expectRefusal("setCount", "NO_SUCH_BLOCK", c.setCount({ block: "nope", count: 1 }));
    await expectRefusal("setCount", "NO_SUCH_BLOCK", c.setCount({ block: "nope", count: 0 }));
    await expectRefusal("addOption", "NO_SUCH_BLOCK", c.addOption({ block: "nope", subject: "A" }));
    await expectRefusal("removeOption", "NO_SUCH_BLOCK", c.removeOption({ block: "nope", subject: "A" }));

    expect(await c.removeOption({ block, subject: "A" })).toEqual({});
    expect((await c._blocks({ road })).map((r) => r.subject)).toEqual(["B"]);
    await expectRefusal("removeOption", "NOT_AN_OPTION", c.removeOption({ block, subject: "A" }));
  });

  it("covers removeBlock and _roadOfBlock afterwards", async () => {
    const road = await makeRoad();
    const block = await addBlock(road, 1, ["A"]);
    expect(await c.removeBlock({ block })).toEqual({});
    expect(await c._blocks({ road })).toEqual([]);
    expect(await c._roadOfBlock({ block })).toEqual([]);
    await expectRefusal("removeBlock", "NO_SUCH_BLOCK", c.removeBlock({ block }));
  });

  it("covers _roadOfBlock for a block that never existed", async () => {
    expect(await c._roadOfBlock({ block: "nope" })).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Pins
// ---------------------------------------------------------------------------

describe("pin", () => {
  it("covers creating pins and ordering by season (IAP < SPRING < SUMMER < FALL)", async () => {
    const road = await makeRoad();
    for (const s of ["A", "B", "C", "D"]) await addSubject(s, 6, ALL_TERMS);
    expect(await c.pin({ road, subject: "A", year: 2027, term: "FALL" })).toEqual({});
    await c.pin({ road, subject: "B", year: 2027, term: "SPRING" });
    await c.pin({ road, subject: "C", year: 2027, term: "SUMMER" });
    await c.pin({ road, subject: "D", year: 2027, term: "IAP" });
    expect((await c._pins({ road })).map((p) => p.subject)).toEqual(["D", "B", "C", "A"]);
  });

  it("covers re-pinning, which moves the pin rather than adding another", async () => {
    const road = await makeRoad();
    await addSubject("A", 6);
    await c.pin({ road, subject: "A", year: 2027, term: "FALL" });
    await c.pin({ road, subject: "A", year: 2026, term: "FALL" });
    expect(await c._pins({ road })).toEqual([{ subject: "A", year: 2026, term: "FALL" }]);
  });

  it("covers nonexistent road, unknown subject, and seasons just outside the span", async () => {
    const road = await makeRoad();
    await addSubject("A", 12);
    await expectRefusal("pin", "NO_SUCH_ROAD", c.pin({ road: "nope", subject: "A", year: 2026, term: "FALL" }));
    await expectRefusal("pin", "NO_SUCH_ROAD", c.pin({ road: "nope", subject: "GHOST", year: 2026, term: "FALL" }));
    await expectRefusal("pin", "NO_LISTING", c.pin({ road, subject: "GHOST", year: 2026, term: "FALL" }));
    await expectRefusal("pin", "OUT_OF_SPAN", c.pin({ road, subject: "A", year: 2026, term: "SUMMER" }));
    await expectRefusal("pin", "OUT_OF_SPAN", c.pin({ road, subject: "A", year: 2030, term: "SUMMER" }));
    expect(await c._pins({ road })).toEqual([]);
  });

  it("covers the inclusive boundaries of the span", async () => {
    const road = await makeRoad();
    await addSubject("A", 12);
    await addSubject("B", 12);
    await c.pin({ road, subject: "A", year: 2026, term: "FALL" });
    await c.pin({ road, subject: "B", year: 2030, term: "SPRING" });
    expect(await c._pins({ road })).toEqual([
      { subject: "A", year: 2026, term: "FALL" },
      { subject: "B", year: 2030, term: "SPRING" },
    ]);
  });

  it("covers a pin that does not need to be offered in that term (history is a fact)", async () => {
    const road = await makeRoad();
    await addSubject("F", 12, ["FALL"]);
    await c.pin({ road, subject: "F", year: 2027, term: "SPRING" });
    expect(await c._pins({ road })).toEqual([{ subject: "F", year: 2027, term: "SPRING" }]);
  });

  it("covers a locked target season and a subject currently pinned in a locked season", async () => {
    const road = await makeRoad();
    await addSubject("A", 12);
    await addSubject("B", 12);
    await c.pin({ road, subject: "A", year: 2026, term: "FALL" });
    await c.setLocked({ road, year: 2026, term: "FALL", locked: true });
    await expectRefusal("pin", "LOCKED_SEASON", c.pin({ road, subject: "B", year: 2026, term: "FALL" }));
    await expectRefusal("pin", "LOCKED_SEASON", c.pin({ road, subject: "A", year: 2027, term: "SPRING" }));
    expect(await c._pins({ road })).toEqual([{ subject: "A", year: 2026, term: "FALL" }]);
  });
});

describe("unPin", () => {
  it("covers unpinning, unpinned subject, locked pin, and nonexistent road", async () => {
    const road = await makeRoad();
    await addSubject("A", 12);
    await c.pin({ road, subject: "A", year: 2026, term: "FALL" });
    await c.setLocked({ road, year: 2026, term: "FALL", locked: true });
    await expectRefusal("unPin", "LOCKED_SEASON", c.unPin({ road, subject: "A" }));
    await c.setLocked({ road, year: 2026, term: "FALL", locked: false });
    expect(await c.unPin({ road, subject: "A" })).toEqual({});
    expect(await c._pins({ road })).toEqual([]);
    await expectRefusal("unPin", "NOT_PINNED", c.unPin({ road, subject: "A" }));
    await expectRefusal("unPin", "NO_SUCH_ROAD", c.unPin({ road: "nope", subject: "A" }));
  });

  it("covers a subject that is prior credit (not a pin)", async () => {
    const road = await makeRoad();
    await listed("A");
    await c.addPrior({ road, subject: "A" });
    await expectRefusal("unPin", "NOT_PINNED", c.unPin({ road, subject: "A" }));
  });
});

// ---------------------------------------------------------------------------
// Semesters
// ---------------------------------------------------------------------------

describe("setLocked and _semesters", () => {
  it("covers creating semesters: IAP gets maxUnits 12, others have no cap (reported as 0)", async () => {
    const road = await makeRoad();
    expect(await c.setLocked({ road, year: 2027, term: "IAP", locked: true })).toEqual({});
    await c.setLocked({ road, year: 2026, term: "FALL", locked: true });
    expect(await c._semesters({ road })).toEqual([
      { year: 2026, term: "FALL", locked: true, maxUnits: 0, maxTechnicalUnits: 0 },
      { year: 2027, term: "IAP", locked: true, maxUnits: 12, maxTechnicalUnits: 0 },
    ]);
  });

  it("covers unlocking, which keeps the semester's caps, and nonexistent road", async () => {
    const road = await makeRoad();
    await c.setCap({ road, year: 2026, term: "FALL", capType: "total", limit: 36 });
    await c.setLocked({ road, year: 2026, term: "FALL", locked: true });
    await c.setLocked({ road, year: 2026, term: "FALL", locked: false });
    expect(await c._semesters({ road })).toEqual([
      { year: 2026, term: "FALL", locked: false, maxUnits: 36, maxTechnicalUnits: 0 },
    ]);
    await expectRefusal("setLocked", "NO_SUCH_ROAD", c.setLocked({ road: "nope", year: 2026, term: "FALL", locked: true }));
  });

  it("covers locking non-contiguous semesters on their own", async () => {
    const road = await makeRoad();
    await c.setEnd({ road, year: 2027, term: "FALL" });
    await addSubject("A", 6);
    await addBlock(road, 1, ["A"]);
    await c.setLocked({ road, year: 2026, term: "FALL", locked: true });
    await c.setLocked({ road, year: 2027, term: "FALL", locked: true });
    expect(keys(await c._options({ road, includeIAPAndSummer: false }))).toEqual(["2027-SPRING-A"]);
  });
});

describe("setCap, clearCap, resetSemester", () => {
  it("covers invalid capType, negative limit, and nonexistent road", async () => {
    const road = await makeRoad();
    await expectRefusal("setCap", "BAD_CAP_TYPE", c.setCap({ road, year: 2026, term: "FALL", capType: "bogus", limit: 10 }));
    await expectRefusal("setCap", "NEGATIVE_LIMIT", c.setCap({ road, year: 2026, term: "FALL", capType: "total", limit: -1 }));
    await expectRefusal("setCap", "NEGATIVE_LIMIT", c.setCap({ road, year: 2026, term: "FALL", capType: "technical", limit: -1 }));
    await expectRefusal("setCap", "NO_SUCH_ROAD", c.setCap({ road: "nope", year: 2026, term: "FALL", capType: "total", limit: 1 }));
    await expectRefusal("clearCap", "BAD_CAP_TYPE", c.clearCap({ road, year: 2026, term: "FALL", capType: "bogus" }));
    await expectRefusal("clearCap", "NO_SUCH_ROAD", c.clearCap({ road: "nope", year: 2026, term: "FALL", capType: "total" }));
    expect(await c._semesters({ road })).toEqual([]); // refusals create no Semester
  });

  it("covers setting both cap types and clearing each", async () => {
    const road = await makeRoad();
    expect(await c.setCap({ road, year: 2026, term: "FALL", capType: "total", limit: 48 })).toEqual({});
    await c.setCap({ road, year: 2026, term: "FALL", capType: "technical", limit: 36 });
    let [s] = await c._semesters({ road });
    expect([s.maxUnits, s.maxTechnicalUnits, s.locked]).toEqual([48, 36, false]);
    expect(await c.clearCap({ road, year: 2026, term: "FALL", capType: "total" })).toEqual({});
    [s] = await c._semesters({ road });
    expect([s.maxUnits, s.maxTechnicalUnits]).toEqual([0, 36]);
    await c.clearCap({ road, year: 2026, term: "FALL", capType: "technical" });
    [s] = await c._semesters({ road });
    expect([s.maxUnits, s.maxTechnicalUnits]).toEqual([0, 0]);
  });

  it("covers a technical cap on a new IAP semester, which still gets maxUnits 12", async () => {
    const road = await makeRoad();
    await c.setCap({ road, year: 2027, term: "IAP", capType: "technical", limit: 6 });
    expect(await c._semesters({ road })).toEqual([
      { year: 2027, term: "IAP", locked: false, maxUnits: 12, maxTechnicalUnits: 6 },
    ]);
  });

  it("covers clearing the default IAP cap", async () => {
    const road = await makeRoad();
    await c.clearCap({ road, year: 2027, term: "IAP", capType: "total" });
    expect(await c._semesters({ road })).toEqual([
      { year: 2027, term: "IAP", locked: false, maxUnits: 0, maxTechnicalUnits: 0 },
    ]);
  });

  it("covers resetSemester with and without settings, leaving pins alone", async () => {
    const road = await makeRoad();
    await addSubject("A", 12);
    await c.pin({ road, subject: "A", year: 2026, term: "FALL" });
    await c.setCap({ road, year: 2026, term: "FALL", capType: "total", limit: 12 });
    await c.setLocked({ road, year: 2026, term: "FALL", locked: true });
    expect(await c.resetSemester({ road, year: 2026, term: "FALL" })).toEqual({});
    expect(await c._semesters({ road })).toEqual([]);
    expect(await c._pins({ road })).toHaveLength(1);
    // the season is unlocked again
    await c.unPin({ road, subject: "A" });
    await expectRefusal("resetSemester", "NO_SUCH_SEMESTER", c.resetSemester({ road, year: 2026, term: "FALL" }));
    await expectRefusal("resetSemester", "NO_SUCH_ROAD", c.resetSemester({ road: "nope", year: 2026, term: "FALL" }));
  });

  it("covers resetSemester on IAP restoring the default cap of 12", async () => {
    const road = await makeRoad();
    await c.setEnd({ road, year: 2027, term: "SPRING" });
    await addSubject("BIG", 15, ["IAP"]);
    await addBlock(road, 1, ["BIG"]);
    await c.clearCap({ road, year: 2027, term: "IAP", capType: "total" });
    expect(keys(await c._options({ road, includeIAPAndSummer: true }))).toEqual(["2027-IAP-BIG"]);
    await c.resetSemester({ road, year: 2027, term: "IAP" });
    expect(await c._options({ road, includeIAPAndSummer: true })).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Subject facts
// ---------------------------------------------------------------------------

describe("listings", () => {
  it("covers operations on a subject with no Listing", async () => {
    await expectRefusal("addListingTerm", "NO_LISTING", c.addListingTerm({ subject: "A", term: "FALL" }));
    await expectRefusal("removeListingTerm", "NO_LISTING", c.removeListingTerm({ subject: "A", term: "FALL" }));
    await expectRefusal("removeListing", "NO_LISTING", c.removeListing({ subject: "A" }));
  });

  it("covers adding a term twice, removing an absent term, and setListing keeping terms", async () => {
    expect(await c.setListing({ subject: "A", units: 12 })).toEqual({});
    expect(await c.addListingTerm({ subject: "A", term: "FALL" })).toEqual({});
    await c.addListingTerm({ subject: "A", term: "FALL" });
    await expectRefusal("removeListingTerm", "NOT_A_TERM", c.removeListingTerm({ subject: "A", term: "SPRING" }));

    await c.setListing({ subject: "A", units: 9 }); // replace units, keep terms
    const road = await makeRoad();
    await addBlock(road, 1, ["A"]);
    expect(keys(await c._options({ road, includeIAPAndSummer: false }))).toContain("2026-FALL-A");

    // FALL was added twice but is one term: removing it once leaves no terms
    expect(await c.removeListingTerm({ subject: "A", term: "FALL" })).toEqual({});
    expect(await c._options({ road, includeIAPAndSummer: true })).toEqual([]);
    expect(await c.removeListing({ subject: "A" })).toEqual({});
    await expectRefusal("removeListing", "NO_LISTING", c.removeListing({ subject: "A" }));
  });

  it("covers setListing replacing units", async () => {
    const road = await makeRoad();
    await c.setEnd({ road, year: 2027, term: "SPRING" });
    await addSubject("A", 12, FS);
    await addBlock(road, 1, ["A"]);
    await c.setCap({ road, year: 2026, term: "FALL", capType: "total", limit: 6 });
    expect(keys(await c._options({ road, includeIAPAndSummer: false }))).toEqual(["2027-SPRING-A"]);

    await c.setListing({ subject: "A", units: 6 });
    expect(sorted(keys(await c._options({ road, includeIAPAndSummer: false })))).toEqual(["2026-FALL-A", "2027-SPRING-A"]);
  });

  it("covers removeListing deleting the subject's dependencies and cancellations", async () => {
    const road = await makeRoad();
    await addSubject("P", 6);
    await addSubject("A", 6);
    await prerequisite("A", ["P"]);
    await c.markCancelled({ subject: "A", year: 2026, term: "FALL" });
    await addBlock(road, 1, ["A"]);

    await c.removeListing({ subject: "A" });
    await addSubject("A", 6); // listed again: no stale prerequisite or cancellation
    expect(keys(await c._options({ road, includeIAPAndSummer: false }))).toContain("2026-FALL-A");
  });
});

describe("dependencies and cancellations", () => {
  it("covers dependency refusals and duplicate options", async () => {
    await expectRefusal("addDependency", "NO_LISTING", c.addDependency({ course: "A", kind: "PREREQUISITE", count: 1 }));
    await addSubject("A", 12);
    await expectRefusal("addDependency", "BAD_COUNT", c.addDependency({ course: "A", kind: "PREREQUISITE", count: 0 }));
    const { dependency } = await c.addDependency({ course: "A", kind: "COREQUISITE", count: 1 });
    expect(await c.addDependencyOption({ dependency, subject: "B" })).toEqual({});
    await c.addDependencyOption({ dependency, subject: "B" });
    await expectRefusal("addDependencyOption", "NO_SUCH_DEPENDENCY", c.addDependencyOption({ dependency: "nope", subject: "B" }));
    expect(await c.removeDependency({ dependency })).toEqual({});
    await expectRefusal("removeDependency", "NO_SUCH_DEPENDENCY", c.removeDependency({ dependency }));
  });

  it("covers removeDependency making a subject available again", async () => {
    const road = await makeRoad();
    await c.setEnd({ road, year: 2027, term: "SPRING" });
    await addSubject("P", 6);
    await addSubject("A", 6);
    const dependency = await prerequisite("A", ["P"]);
    await addBlock(road, 1, ["A"]);
    // While A needs P, only P can be taken now (P is a candidate as A's prerequisite).
    expect(sorted(keys(await c._options({ road, includeIAPAndSummer: false })))).toEqual(["2026-FALL-P", "2027-SPRING-P"]);
    await c.removeDependency({ dependency });
    // A is free to take, and P is no longer a candidate.
    expect(sorted(keys(await c._options({ road, includeIAPAndSummer: false })))).toEqual(["2026-FALL-A", "2027-SPRING-A"]);
  });

  it("covers marking and unmarking cancellations", async () => {
    await expectRefusal("markCancelled", "NO_LISTING", c.markCancelled({ subject: "GHOST", year: 2026, term: "FALL" }));
    await addSubject("A", 12);
    const road = await makeRoad();
    await c.setEnd({ road, year: 2027, term: "SPRING" });
    await addBlock(road, 1, ["A"]);

    expect(await c.markCancelled({ subject: "A", year: 2026, term: "FALL" })).toEqual({});
    await c.markCancelled({ subject: "A", year: 2026, term: "FALL" });
    expect(keys(await c._options({ road, includeIAPAndSummer: false }))).toEqual(["2027-SPRING-A"]);

    expect(await c.unmarkCancelled({ subject: "A", year: 2026, term: "FALL" })).toEqual({});
    expect(sorted(keys(await c._options({ road, includeIAPAndSummer: false })))).toEqual(["2026-FALL-A", "2027-SPRING-A"]);
    // marked twice, but one Cancellation: one unmark removes it
    await expectRefusal("unmarkCancelled", "NOT_CANCELLED", c.unmarkCancelled({ subject: "A", year: 2026, term: "FALL" }));
    await expectRefusal("unmarkCancelled", "NOT_CANCELLED", c.unmarkCancelled({ subject: "GHOST", year: 2026, term: "FALL" }));
  });
});

// ---------------------------------------------------------------------------
// _satisfies
// ---------------------------------------------------------------------------

describe("_satisfies", () => {
  it("covers no blocks, a block with no options, an unmet block, a pinned block, a prior-credit block", async () => {
    const road = await makeRoad();
    expect(await c._satisfies({ road })).toEqual({ satisfied: true });
    await addSubject("A", 6);
    const { block } = await c.addBlock({ road, count: 1, technical: false });
    expect(await satisfied(road)).toBe(true); // empty block ignored
    await c.addOption({ block, subject: "A" });
    expect(await satisfied(road)).toBe(false);
    await c.pin({ road, subject: "A", year: 2026, term: "FALL" });
    expect(await satisfied(road)).toBe(true);
    await c.unPin({ road, subject: "A" });
    await listed("A");
    await c.addPrior({ road, subject: "A" });
    expect(await satisfied(road)).toBe(true);
  });

  it("covers a pin outside every block, which does not stop the plan being satisfied", async () => {
    const road = await makeRoad();
    await addSubject("A", 6);
    await addSubject("EXTRA", 6);
    await addBlock(road, 1, ["A"]);
    await c.pin({ road, subject: "A", year: 2026, term: "FALL" });
    await c.pin({ road, subject: "EXTRA", year: 2027, term: "SPRING" });
    expect(await satisfied(road)).toBe(true);
  });

  it("covers one subject shared by two blocks", async () => {
    const road = await makeRoad();
    await addSubject("A", 6);
    await addSubject("B", 6);
    await addBlock(road, 1, ["A"]);
    await addBlock(road, 1, ["A", "B"]);
    await c.pin({ road, subject: "A", year: 2026, term: "FALL" });
    expect(await satisfied(road)).toBe(false);
    await c.pin({ road, subject: "B", year: 2026, term: "FALL" });
    expect(await satisfied(road)).toBe(true);
  });

  it("covers a block with count > 1", async () => {
    const road = await makeRoad();
    for (const s of ["A", "B", "C"]) await addSubject(s, 6);
    await addBlock(road, 2, ["A", "B", "C"]);
    await c.pin({ road, subject: "A", year: 2026, term: "FALL" });
    expect(await satisfied(road)).toBe(false);
    await c.pin({ road, subject: "C", year: 2027, term: "SPRING" });
    expect(await satisfied(road)).toBe(true);
  });

  it("covers a pin in a term the subject does not run in, and a cancelled season", async () => {
    const road = await makeRoad();
    await addSubject("A", 6, ["FALL"]);
    await addBlock(road, 1, ["A"]);
    await c.pin({ road, subject: "A", year: 2027, term: "SPRING" });
    expect(await satisfied(road)).toBe(false);
    await c.pin({ road, subject: "A", year: 2027, term: "FALL" });
    expect(await satisfied(road)).toBe(true);
    await c.markCancelled({ subject: "A", year: 2027, term: "FALL" });
    expect(await satisfied(road)).toBe(false);
  });

  it("covers prerequisites: same season, later, earlier, and prior credit", async () => {
    const road = await makeRoad();
    for (const s of ["P", "Q", "A"]) await addSubject(s, 6);
    await prerequisite("A", ["P", "Q"]);
    await addBlock(road, 1, ["A"]);

    await c.pin({ road, subject: "A", year: 2027, term: "FALL" });
    expect(await satisfied(road)).toBe(false);
    await c.pin({ road, subject: "Q", year: 2027, term: "FALL" });
    expect(await satisfied(road)).toBe(false); // same season is not earlier
    await c.pin({ road, subject: "Q", year: 2028, term: "SPRING" });
    expect(await satisfied(road)).toBe(false);
    await c.pin({ road, subject: "Q", year: 2026, term: "FALL" });
    expect(await satisfied(road)).toBe(true);
    await c.unPin({ road, subject: "Q" });
    await listed("P");
    await c.addPrior({ road, subject: "P" });
    expect(await satisfied(road)).toBe(true);
  });

  it("covers a dependency with count 2", async () => {
    const road = await makeRoad();
    for (const s of ["P", "Q", "A"]) await addSubject(s, 6);
    await prerequisite("A", ["P", "Q"], 2);
    await addBlock(road, 1, ["A"]);
    await c.pin({ road, subject: "A", year: 2027, term: "SPRING" });
    await c.pin({ road, subject: "P", year: 2026, term: "FALL" });
    expect(await satisfied(road)).toBe(false);
    await c.pin({ road, subject: "Q", year: 2026, term: "FALL" });
    expect(await satisfied(road)).toBe(true);
  });

  it("covers corequisites: later fails, same season passes, earlier passes", async () => {
    const road = await makeRoad();
    await addSubject("C", 6);
    await addSubject("A", 6);
    await prerequisite("A", ["C"], 1, "COREQUISITE");
    await addBlock(road, 1, ["A"]);
    await c.pin({ road, subject: "A", year: 2027, term: "SPRING" });
    await c.pin({ road, subject: "C", year: 2027, term: "FALL" });
    expect(await satisfied(road)).toBe(false);
    await c.pin({ road, subject: "C", year: 2027, term: "SPRING" });
    expect(await satisfied(road)).toBe(true);
    await c.pin({ road, subject: "C", year: 2026, term: "FALL" });
    expect(await satisfied(road)).toBe(true);
  });

  it("covers total cap exceeded, then exempted by locking the semester", async () => {
    const road = await makeRoad();
    await addSubject("A", 12);
    await addSubject("B", 12);
    await addBlock(road, 2, ["A", "B"]);
    await c.pin({ road, subject: "A", year: 2026, term: "FALL" });
    await c.pin({ road, subject: "B", year: 2026, term: "FALL" });
    expect(await satisfied(road)).toBe(true);
    await c.setCap({ road, year: 2026, term: "FALL", capType: "total", limit: 12 });
    expect(await satisfied(road)).toBe(false);
    await c.setLocked({ road, year: 2026, term: "FALL", locked: true });
    expect(await satisfied(road)).toBe(true);
  });

  it("covers total cap met exactly", async () => {
    const road = await makeRoad();
    await addSubject("A", 12);
    await addBlock(road, 1, ["A"]);
    await c.pin({ road, subject: "A", year: 2026, term: "FALL" });
    await c.setCap({ road, year: 2026, term: "FALL", capType: "total", limit: 12 });
    expect(await satisfied(road)).toBe(true);
  });

  it("covers technical cap counting only subjects of technical blocks", async () => {
    const road = await makeRoad();
    await addSubject("T1", 12, FS);
    await addSubject("T2", 12, FS);
    await addSubject("N", 12, FS);
    await addBlock(road, 2, ["T1", "T2"], true);
    await addBlock(road, 1, ["N"], false);
    for (const s of ["T1", "T2", "N"]) await c.pin({ road, subject: s, year: 2026, term: "FALL" });
    await c.setCap({ road, year: 2026, term: "FALL", capType: "technical", limit: 12 });
    expect(await satisfied(road)).toBe(false);
    await c.setCap({ road, year: 2026, term: "FALL", capType: "technical", limit: 24 });
    expect(await satisfied(road)).toBe(true);
  });

  it("covers the default IAP cap of 12 units on a season with no Semester", async () => {
    const road = await makeRoad();
    await addSubject("BIG", 15, ["IAP"]);
    await addBlock(road, 1, ["BIG"]);
    await c.pin({ road, subject: "BIG", year: 2027, term: "IAP" });
    expect(await satisfied(road)).toBe(false);
    await c.setCap({ road, year: 2027, term: "IAP", capType: "total", limit: 15 });
    expect(await satisfied(road)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// _options
// ---------------------------------------------------------------------------

describe("_options", () => {
  it("covers includeIAPAndSummer false/true, subjects outside blocks, and seasons past the end", async () => {
    const road = await makeRoad();
    await c.setEnd({ road, year: 2027, term: "SPRING" });
    await addSubject("A", 6, ALL_TERMS);
    await addSubject("NOTINBLOCK", 6);
    await addBlock(road, 1, ["A"]);
    expect(sorted(keys(await c._options({ road, includeIAPAndSummer: false })))).toEqual([
      "2026-FALL-A",
      "2027-SPRING-A",
    ]);
    expect(sorted(keys(await c._options({ road, includeIAPAndSummer: true })))).toEqual([
      "2026-FALL-A",
      "2027-IAP-A",
      "2027-SPRING-A",
    ]);
  });

  it("covers a road with no blocks", async () => {
    const road = await makeRoad();
    await addSubject("A", 6);
    expect(await c._options({ road, includeIAPAndSummer: true })).toEqual([]);
  });

  it("covers terms, cancellations, pinned subjects, prior credit, and locked seasons", async () => {
    const road = await makeRoad();
    await c.setEnd({ road, year: 2027, term: "SPRING" });
    await addSubject("F", 6, ["FALL"]);
    await addSubject("X", 6);
    await addSubject("PINNED", 6);
    await addSubject("OLD", 6);
    await addBlock(road, 1, ["F", "X", "PINNED", "OLD"]);
    await c.markCancelled({ subject: "X", year: 2026, term: "FALL" });
    await c.pin({ road, subject: "PINNED", year: 2027, term: "SPRING" });
    await listed("OLD");
    await c.addPrior({ road, subject: "OLD" });

    expect(sorted(keys(await c._options({ road, includeIAPAndSummer: false })))).toEqual([
      "2026-FALL-F",
      "2027-SPRING-X",
    ]);
    await c.setLocked({ road, year: 2026, term: "FALL", locked: true });
    expect(keys(await c._options({ road, includeIAPAndSummer: false }))).toEqual(["2027-SPRING-X"]);
  });

  it("covers prerequisite and corequisite availability", async () => {
    const road = await makeRoad();
    await c.setEnd({ road, year: 2027, term: "SPRING" });
    for (const s of ["P", "C", "A", "B"]) await addSubject(s, 6);
    await prerequisite("A", ["P"]);
    await prerequisite("B", ["C"], 1, "COREQUISITE");
    await addBlock(road, 2, ["A", "B"]);

    // A and B wait for P and C; P and C are candidates as their dependencies.
    expect(sorted(keys(await c._options({ road, includeIAPAndSummer: false })))).toEqual([
      "2026-FALL-C",
      "2026-FALL-P",
      "2027-SPRING-C",
      "2027-SPRING-P",
    ]);
    await c.pin({ road, subject: "P", year: 2026, term: "FALL" });
    await c.pin({ road, subject: "C", year: 2026, term: "FALL" });
    expect(sorted(keys(await c._options({ road, includeIAPAndSummer: false })))).toEqual([
      "2026-FALL-B",
      "2027-SPRING-A",
      "2027-SPRING-B",
    ]);
  });

  it("covers a transitive prerequisite outside every block: only the first link is available", async () => {
    const road = await makeRoad();
    await c.setEnd({ road, year: 2027, term: "SPRING" });
    for (const s of ["X", "Y", "Z"]) await addSubject(s, 6);
    await prerequisite("Y", ["X"]);
    await prerequisite("Z", ["Y"]);
    await addBlock(road, 1, ["Z"]);
    expect(sorted(keys(await c._options({ road, includeIAPAndSummer: false })))).toEqual(["2026-FALL-X", "2027-SPRING-X"]);
  });

  it("covers a prerequisite met by prior credit, available from the first season", async () => {
    const road = await makeRoad();
    await c.setEnd({ road, year: 2027, term: "SPRING" });
    await addSubject("A", 6);
    await prerequisite("A", ["P"]);
    await addBlock(road, 1, ["A"]);
    await listed("P");
    await c.addPrior({ road, subject: "P" });
    expect(sorted(keys(await c._options({ road, includeIAPAndSummer: false })))).toEqual(["2026-FALL-A", "2027-SPRING-A"]);
  });

  it("covers total cap exceeded, cap raised, and a cap of 0", async () => {
    const road = await makeRoad();
    await c.setEnd({ road, year: 2027, term: "SPRING" });
    await addSubject("A", 12);
    await addSubject("B", 12);
    await addBlock(road, 1, ["B"]);
    await c.pin({ road, subject: "A", year: 2026, term: "FALL" });
    await c.setCap({ road, year: 2026, term: "FALL", capType: "total", limit: 12 });
    expect(keys(await c._options({ road, includeIAPAndSummer: false }))).toEqual(["2027-SPRING-B"]);
    await c.setCap({ road, year: 2026, term: "FALL", capType: "total", limit: 24 });
    expect(keys(await c._options({ road, includeIAPAndSummer: false }))).toContain("2026-FALL-B");
    await c.setCap({ road, year: 2027, term: "SPRING", capType: "total", limit: 0 });
    expect(keys(await c._options({ road, includeIAPAndSummer: false }))).toEqual(["2026-FALL-B"]);
  });

  it("covers technical cap affecting technical but not non-technical subjects", async () => {
    const road = await makeRoad();
    await c.setEnd({ road, year: 2027, term: "SPRING" });
    await addSubject("T", 9, FS);
    await addSubject("T2", 9, FS);
    await addSubject("N", 3, FS);
    await addBlock(road, 1, ["T", "T2"], true); // T and T2 are technical for this road
    await addBlock(road, 1, ["N"], false);
    // The first block is met by the pin below, so only T2 and N are left to take.
    await c.pin({ road, subject: "T", year: 2026, term: "FALL" });
    await c.setCap({ road, year: 2026, term: "FALL", capType: "technical", limit: 10 });
    const result = keys(await c._options({ road, includeIAPAndSummer: false }));
    expect(result).not.toContain("2026-FALL-T2");
    expect(result).toContain("2026-FALL-N");
    expect(result).toContain("2027-SPRING-T2");
  });

  it("covers the default IAP cap of 12 units, overriding it, and clearing it", async () => {
    const road = await makeRoad();
    await c.setEnd({ road, year: 2027, term: "SPRING" });
    await addSubject("BIG", 15, ["IAP"]);
    await addSubject("OK", 12, ["IAP"]);
    await addBlock(road, 1, ["BIG", "OK"]);
    expect(await c._options({ road, includeIAPAndSummer: false })).toEqual([]);
    expect(keys(await c._options({ road, includeIAPAndSummer: true }))).toEqual(["2027-IAP-OK"]);
    await c.setCap({ road, year: 2027, term: "IAP", capType: "total", limit: 6 });
    expect(await c._options({ road, includeIAPAndSummer: true })).toEqual([]);
    await c.clearCap({ road, year: 2027, term: "IAP", capType: "total" });
    expect(sorted(keys(await c._options({ road, includeIAPAndSummer: true })))).toEqual(["2027-IAP-BIG", "2027-IAP-OK"]);
  });

  it("covers fitsByEnd true and false", async () => {
    const road = await makeRoad();
    await c.setEnd({ road, year: 2027, term: "SPRING" }); // only FALL 2026 and SPRING 2027
    await addSubject("X", 6, ["FALL", "SPRING"]);
    await addSubject("Y", 6, ["SPRING"]);
    await prerequisite("Y", ["X"]);
    await addBlock(road, 1, ["X"]);
    await addBlock(road, 1, ["Y"]);

    const rows = await c._options({ road, includeIAPAndSummer: false });
    expect(sorted(keys(rows))).toEqual(["2026-FALL-X", "2027-SPRING-X"]);
    expect(rows.find((r) => r.term === "FALL")!.fitsByEnd).toBe(true);
    expect(rows.find((r) => r.term === "SPRING")!.fitsByEnd).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// _findPath
// ---------------------------------------------------------------------------

describe("_findPath", () => {
  it("covers a prerequisite chain outside every block: the plan adds it in order", async () => {
    const road = await makeRoad();
    for (const s of ["X", "Y", "Z"]) await addSubject(s, 6);
    await prerequisite("Y", ["X"]);
    await prerequisite("Z", ["Y"]);
    await addBlock(road, 1, ["Z"]);
    const plans = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 3 }));
    expect(plans).toHaveLength(1);
    expect(sorted(keys(plans[0]))).toEqual(["2026-FALL-X", "2027-FALL-Z", "2027-SPRING-Y"]);
    await pinPlan(road, plans[0]);
    expect(await satisfied(road)).toBe(true);
  });

  it("covers a prerequisite that is not a block option: it is added but does not count toward the block", async () => {
    const road = await makeRoad();
    for (const s of ["A", "B", "P"]) await addSubject(s, 6);
    await prerequisite("A", ["P"]);
    await addBlock(road, 2, ["A", "B"]);
    const plans = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 5 }));
    expect(plans.length).toBeGreaterThanOrEqual(1);
    for (const p of plans) {
      // P alone with B would not meet "2 of A, B": A must be there too.
      expect(sorted(p.map((r) => r.subject))).toEqual(["A", "B", "P"]);
      expect(lastSeason(p)).toBe(rank(2027, "SPRING"));
    }
  });

  it("covers a pin whose prerequisite is in no block: the plan adds it before the pin", async () => {
    const road = await makeRoad();
    await addSubject("P", 6);
    await addSubject("A", 6);
    await prerequisite("A", ["P"]);
    await c.pin({ road, subject: "A", year: 2027, term: "SPRING" });
    const plans = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 3 }));
    expect(plans).toHaveLength(1);
    expect(sorted(keys(plans[0]))).toEqual(["2026-FALL-P", "2027-SPRING-A"]);
  });

  it("covers a pin in the first semester whose prerequisite is not prior credit: no plan", async () => {
    const road = await makeRoad();
    await addSubject("P", 6);
    await addSubject("A", 6);
    await prerequisite("A", ["P"]);
    await c.pin({ road, subject: "A", year: 2026, term: "FALL" });
    expect(await c._findPath({ road, includeIAPAndSummer: false, limit: 3 })).toEqual([]);
    await listed("P");
    await c.addPrior({ road, subject: "P" });
    expect(groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 3 }))).toHaveLength(1);
  });

  it("covers no cap: everything fits in the first semester", async () => {
    const road = await makeRoad();
    await addSubject("A", 6);
    await addSubject("B", 6);
    await addBlock(road, 2, ["A", "B"]);
    const plans = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 5 }));
    expect(plans).toHaveLength(1);
    expect(sorted(keys(plans[0]))).toEqual(["2026-FALL-A", "2026-FALL-B"]);
    expect(plans[0].every((r) => r.plan === 1)).toBe(true);
  });

  it("covers a binding cap: plans finish at the same, later season and are valid when pinned", async () => {
    const road = await makeRoad();
    await addSubject("A", 6);
    await addSubject("B", 6);
    await addBlock(road, 2, ["A", "B"]);
    await c.setCap({ road, year: 2026, term: "FALL", capType: "total", limit: 6 });

    const rows = await c._findPath({ road, includeIAPAndSummer: false, limit: 5 });
    const plans = groupPlans(rows);
    expect(plans.length).toBeGreaterThanOrEqual(1);
    expect(plans.length).toBeLessThanOrEqual(5);
    expect(sorted([...new Set(rows.map((r) => String(r.plan)))])).toEqual(plans.map((_, i) => String(i + 1)));
    for (const p of plans) {
      expect(sorted(p.map((r) => r.subject))).toEqual(["A", "B"]);
      expect(lastSeason(p)).toBe(rank(2027, "SPRING"));
      // the 6-unit cap leaves room for at most one of them in FALL 2026
      expect(p.filter((r) => r.year === 2026 && r.term === "FALL").length).toBeLessThanOrEqual(1);
    }
    await pinPlan(road, plans[0]);
    expect(await satisfied(road)).toBe(true);
  });

  it("covers limit 1 against several available plans", async () => {
    const road = await makeRoad();
    await addSubject("A", 6);
    await addSubject("B", 6);
    await addBlock(road, 2, ["A", "B"]);
    await c.setCap({ road, year: 2026, term: "FALL", capType: "total", limit: 6 });
    expect(groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 1 }))).toHaveLength(1);
  });

  it("covers pins in a block and pins outside every block", async () => {
    const road = await makeRoad();
    await addSubject("A", 6);
    await addSubject("B", 6);
    await addSubject("EXTRA", 6);
    await addBlock(road, 2, ["A", "B"]);
    await c.pin({ road, subject: "B", year: 2027, term: "SPRING" });
    await c.pin({ road, subject: "EXTRA", year: 2026, term: "FALL" });
    const plans = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 3 }));
    expect(plans.length).toBeGreaterThanOrEqual(1);
    for (const p of plans) {
      const ks = keys(p);
      expect(ks).toContain("2027-SPRING-B");
      expect(ks).toContain("2026-FALL-EXTRA");
      expect(ks.some((k) => k.endsWith("-A"))).toBe(true);
    }
  });

  it("covers a pin in IAP, kept even when includeIAPAndSummer is false", async () => {
    const road = await makeRoad();
    await addSubject("I", 6, ["IAP"]);
    await addSubject("A", 6);
    await addBlock(road, 2, ["I", "A"]);
    await c.pin({ road, subject: "I", year: 2027, term: "IAP" });
    const plans = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 3 }));
    expect(plans.length).toBeGreaterThanOrEqual(1);
    for (const p of plans) expect(sorted(keys(p))).toEqual(["2026-FALL-A", "2027-IAP-I"]);
  });

  it("covers prior credit covering part of a block (prior credit has no rows)", async () => {
    const road = await makeRoad();
    await addSubject("A", 6);
    await addSubject("B", 6);
    await addBlock(road, 2, ["A", "B"]);
    await listed("A");
    await c.addPrior({ road, subject: "A" });
    const plans = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 3 }));
    expect(plans).toHaveLength(1);
    expect(keys(plans[0])).toEqual(["2026-FALL-B"]);
  });

  it("covers a prerequisite between two block options", async () => {
    const road = await makeRoad();
    await addSubject("X", 6);
    await addSubject("Y", 6);
    await prerequisite("Y", ["X"]);
    await addBlock(road, 1, ["X"]);
    await addBlock(road, 1, ["Y"]);
    const plans = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 3 }));
    expect(plans.length).toBeGreaterThanOrEqual(1);
    for (const p of plans) expect(sorted(keys(p))).toEqual(["2026-FALL-X", "2027-SPRING-Y"]);
  });

  it("covers plans that can only finish after the end of the road", async () => {
    const road = await makeRoad();
    await c.setEnd({ road, year: 2027, term: "SPRING" }); // two semesters
    await addSubject("X", 6);
    await addSubject("Y", 6);
    await addSubject("Z", 6);
    await prerequisite("Y", ["X"]);
    await prerequisite("Z", ["Y"]);
    for (const s of ["X", "Y", "Z"]) await addBlock(road, 1, [s]);
    const plans = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 3 }));
    expect(plans.length).toBeGreaterThanOrEqual(1);
    for (const p of plans) {
      expect(sorted(keys(p))).toEqual(["2026-FALL-X", "2027-FALL-Z", "2027-SPRING-Y"]);
      expect(lastSeason(p)).toBeGreaterThan(rank(2027, "SPRING"));
    }
  });

  it("covers a locked semester with pins: it appears as pinned and gains nothing", async () => {
    const road = await makeRoad();
    await addSubject("A", 6);
    await addSubject("B", 6);
    await addBlock(road, 2, ["A", "B"]);
    await c.pin({ road, subject: "A", year: 2026, term: "FALL" });
    await c.setLocked({ road, year: 2026, term: "FALL", locked: true });
    const plans = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 3 }));
    expect(plans.length).toBeGreaterThanOrEqual(1);
    for (const p of plans) {
      expect(p.filter((r) => r.year === 2026 && r.term === "FALL").map((r) => r.subject)).toEqual(["A"]);
      expect(sorted(keys(p))).toEqual(["2026-FALL-A", "2027-SPRING-B"]);
    }
  });

  it("covers includeIAPAndSummer false (no plan) and true (IAP plan)", async () => {
    const road = await makeRoad();
    await addSubject("I", 6, ["IAP"]);
    await addBlock(road, 1, ["I"]);
    expect(await c._findPath({ road, includeIAPAndSummer: false, limit: 3 })).toEqual([]);
    const plans = groupPlans(await c._findPath({ road, includeIAPAndSummer: true, limit: 3 }));
    expect(plans).toHaveLength(1);
    expect(keys(plans[0])).toEqual(["2027-IAP-I"]);
  });

  it("covers no valid plan", async () => {
    const road = await makeRoad();
    await addSubject("NEVER", 6, []);
    await addBlock(road, 1, ["NEVER"]);
    expect(await c._findPath({ road, includeIAPAndSummer: true, limit: 3 })).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Listed blocks, groups, technical per road, and subjects that must be known
// ---------------------------------------------------------------------------

/*
 * addListedBlock / removeListedBlocks / _blocks fields
 *   partition on blocks of road: listed only, the student's only, both
 *   partition on count: < 1, >= 1; road: exists, does not exist
 * addOption / addPrior
 *   partition on subject: has a Listing, has none
 * covered with groups
 *   partition on a subject shared by two blocks: same group, different groups
 * technical(road, subject)
 *   partition on subject: option of a technical block, of a non-technical block only, of none;
 *   the same subject in two roads with different blocks
 * _findPath
 *   partition on plans: some finish by the end and some only after it; all only after it
 *   partition on a dependency with several options: the cheapest is taken, not all of them
 */
describe("listed blocks", () => {
  it("covers addListedBlock refusals, fields in _blocks, and order (listed first)", async () => {
    const road = await makeRoad();
    await expectRefusal("addListedBlock", "BAD_COUNT",
      c.addListedBlock({ road, count: 0, title: "T", technical: true, group: "g", origin: "o", early: false }));
    await expectRefusal("addListedBlock", "NO_SUCH_ROAD",
      c.addListedBlock({ road: "nope", count: 1, title: "T", technical: true, group: "g", origin: "o", early: false }));

    const mine = await addBlock(road, 1, ["A"], true);
    const { block: listedBlock } = await c.addListedBlock({ road, count: 1, title: "Foundation", technical: false, group: "major6-3/4", origin: "major6-3/4", early: false });
    await listed("B");
    await c.addOption({ block: listedBlock, subject: "B" });
    expect(await c._blocks({ road })).toEqual([
      { block: listedBlock, count: 1, subject: "B", title: "Foundation", technical: false, group: "major6-3/4", origin: "major6-3/4", early: false },
      { block: mine, count: 1, subject: "A", title: "", technical: true, group: "", origin: "", early: false },
    ]);
  });

  it("covers removeListedBlocks keeping the student's blocks, and on a road with no listed blocks", async () => {
    const road = await makeRoad();
    await expectRefusal("removeListedBlocks", "NO_SUCH_ROAD", c.removeListedBlocks({ road: "nope" }));
    const mine = await addBlock(road, 1, ["A"]);
    expect(await c.removeListedBlocks({ road })).toEqual({});
    const { block } = await c.addListedBlock({ road, count: 1, title: "", technical: true, group: "g", origin: "o", early: false });
    await listed("B");
    await c.addOption({ block, subject: "B" });
    await c.removeListedBlocks({ road });
    expect((await c._blocks({ road })).map((r) => r.block)).toEqual([mine]);
    expect(await c._roadOfBlock({ block })).toEqual([]);
  });
});

describe("subjects must be known", () => {
  it("covers addOption and addPrior of a subject with no Listing", async () => {
    const road = await makeRoad();
    const { block } = await c.addBlock({ road, count: 1, technical: false });
    await expectRefusal("addOption", "NO_LISTING", c.addOption({ block, subject: "6.O1O" }));
    await expectRefusal("addOption", "NO_SUCH_BLOCK", c.addOption({ block: "nope", subject: "6.O1O" }));
    await expectRefusal("addPrior", "NO_LISTING", c.addPrior({ road, subject: "6.O1O" }));
    await expectRefusal("addPrior", "NO_SUCH_ROAD", c.addPrior({ road: "nope", subject: "6.O1O" }));
    expect(await c._prior({ road })).toEqual([]);

    await addSubject("6.010", 12);
    expect(await c.addOption({ block, subject: "6.010" })).toEqual({});
    expect(await c.addPrior({ road, subject: "6.010" })).toEqual({});
  });
});

describe("groups", () => {
  it("covers a subject shared by two blocks: not within a group, but across groups", async () => {
    const road = await makeRoad();
    await addSubject("S", 6);
    for (const group of ["g1", "g1"]) {
      const { block } = await c.addListedBlock({ road, count: 1, title: "", technical: false, group, origin: "o", early: false });
      await c.addOption({ block, subject: "S" });
    }
    await c.pin({ road, subject: "S", year: 2026, term: "FALL" });
    expect(await satisfied(road)).toBe(false); // one subject cannot meet two blocks of g1

    const other = await makeRoad();
    for (const group of ["g1", "g2"]) {
      const { block } = await c.addListedBlock({ road: other, count: 1, title: "", technical: false, group, origin: "o", early: false });
      await c.addOption({ block, subject: "S" });
    }
    await c.pin({ road: other, subject: "S", year: 2026, term: "FALL" });
    expect(await satisfied(other)).toBe(true);
  });
});

describe("technical per road", () => {
  it("covers the same subject technical in one road and not in another", async () => {
    await addSubject("M", 12);
    const music = await makeRoad();
    const cs = await makeRoad();
    await addBlock(music, 1, ["M"], true);
    await addBlock(cs, 1, ["M"], false);
    for (const road of [music, cs]) {
      await c.pin({ road, subject: "M", year: 2026, term: "FALL" });
      await c.setCap({ road, year: 2026, term: "FALL", capType: "technical", limit: 0 });
    }
    expect(await satisfied(music)).toBe(false);
    expect(await satisfied(cs)).toBe(true);
  });

  it("covers a subject in no technical block: a pin outside every block is not technical", async () => {
    const road = await makeRoad();
    await addSubject("X", 12);
    await c.pin({ road, subject: "X", year: 2026, term: "FALL" });
    await c.setCap({ road, year: 2026, term: "FALL", capType: "technical", limit: 0 });
    expect(await satisfied(road)).toBe(true);
  });
});

describe("_findPath plans", () => {
  it("covers plans finishing by the end preferred over plans that need extra semesters", async () => {
    const road = await makeRoad();
    await c.setEnd({ road, year: 2027, term: "SPRING" });
    await addSubject("EARLY", 6);
    await addSubject("LATE", 6);
    await addSubject("P1", 6);
    await addSubject("P2", 6);
    await prerequisite("LATE", ["P1"]);
    await prerequisite("P1", ["P2"]); // LATE needs three semesters
    await addBlock(road, 1, ["EARLY", "LATE"]);
    const plans = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 5 }));
    expect(plans.length).toBeGreaterThanOrEqual(1);
    for (const p of plans) expect(lastSeason(p)).toBeLessThanOrEqual(rank(2027, "SPRING"));
    expect(plans[0].map((r) => r.subject)).toEqual(["EARLY"]);
  });

  it("covers every plan needing extra semesters: the earliest are answered, in order of finish", async () => {
    const road = await makeRoad();
    await c.setEnd({ road, year: 2027, term: "SPRING" });
    for (const s of ["A", "B", "C"]) await addSubject(s, 6);
    await prerequisite("B", ["A"]);
    await prerequisite("C", ["B"]);
    await addBlock(road, 1, ["C"]);
    const plans = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 3 }));
    expect(plans).toHaveLength(1);
    expect(lastSeason(plans[0])).toBe(rank(2027, "FALL")); // one semester past the end
  });

  it("covers a dependency with several options: one is taken, the cheapest", async () => {
    const road = await makeRoad();
    for (const s of ["T", "EASY", "HARD", "HARD0"]) await addSubject(s, 6);
    await prerequisite("HARD", ["HARD0"]);
    await prerequisite("T", ["HARD", "EASY"]);
    await addBlock(road, 1, ["T"]);
    const plans = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 1 }));
    expect(sorted(plans[0].map((r) => r.subject))).toEqual(["EASY", "T"]);
  });

  it("covers plans ordered by finishing season", async () => {
    const road = await makeRoad();
    for (const s of ["A", "B", "Q"]) await addSubject(s, 6);
    await prerequisite("B", ["Q"]);
    await addBlock(road, 1, ["A", "B"]);
    const plans = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 5 }));
    const finishes = plans.map(lastSeason);
    expect(finishes).toEqual([...finishes].sort((a, b) => a - b));
    expect(plans[0].map((r) => r.subject)).toEqual(["A"]);
  });
});

// ---------------------------------------------------------------------------
// Open blocks and slots, and plans that differ
// ---------------------------------------------------------------------------

/*
 * open blocks (more than 100 options) in _findPath
 *   partition on open blocks: one; nested in another of a different group; partly met by a pin
 *   partition on caps: none, binding (a slot takes room)
 * _slotOptions
 *   partition on a subject: option of every block of the slot or not; runs in the season or not;
 *     prerequisites met or not; taken or not
 * groups in _findPath: two blocks of one group sharing options get distinct subjects
 * plans that differ: a block with spare options gives a plan with none of the first plan's picks
 */
describe("open blocks and slots", () => {
  const A = Array.from({ length: 101 }, (_, i) => `HA.${i}`);
  const S = Array.from({ length: 101 }, (_, i) => `HS.${i}`);

  async function listedBlock(road: string, count: number, title: string, group: string, options: string[]) {
    const { block } = await c.addListedBlock({ road, count, title, technical: false, group, origin: title, early: false });
    for (const s of options) {
      if (!known.has(s)) await addSubject(s, 12);
      await c.addOption({ block, subject: s });
    }
    return block;
  }

  /** HASS-A and HASS-S (one subject each) inside 3 HASS subjects, each its own group, as in the GIRs. */
  async function hassRoad() {
    const road = await makeRoad();
    const a = await listedBlock(road, 1, "A", "a", A);
    const s = await listedBlock(road, 1, "S", "s", S);
    const hass = await listedBlock(road, 3, "HASS", "hass", [...A, ...S]);
    return { road, a, s, hass };
  }

  const slotsOf = (plan: (PlanRow & { slot: string; title: string })[]) => plan.filter((r) => r.slot);

  it("covers an open block: slots instead of subjects, one per semester in turn", async () => {
    const road = await makeRoad();
    const hass = await listedBlock(road, 2, "HASS", "hass", A);
    const [plan] = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 3 })) as any;
    expect(plan).toEqual([
      { plan: 1, year: 2026, term: "FALL", subject: "", slot: hass, title: "HASS", units: 12, counts: hass },
      { plan: 1, year: 2027, term: "SPRING", subject: "", slot: hass, title: "HASS", units: 12, counts: hass },
    ]);
    expect(await satisfied(road)).toBe(false); // slots are not subjects
  });

  it("covers nested open blocks sharing slots, and a pin filling part of them", async () => {
    const { road, a, s, hass } = await hassRoad();
    const [plan] = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 1 })) as any;
    // A and S have as many options, so either may come first.
    expect(sorted(slotsOf(plan).map((r) => r.slot))).toEqual(sorted([`${a},${hass}`, `${s},${hass}`, hass]));
    expect(sorted(slotsOf(plan).map((r) => r.title))).toEqual(["A · HASS", "HASS", "S · HASS"]);

    await c.pin({ road, subject: "HA.5", year: 2026, term: "FALL" });
    const [after] = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 1 })) as any;
    expect(sorted(slotsOf(after).map((r) => r.title))).toEqual(["HASS", "S · HASS"]);
  });

  it("covers a slot taking room under a cap", async () => {
    const road = await makeRoad();
    await listedBlock(road, 1, "HASS", "hass", A);
    await addSubject("X", 12, ["FALL"]);
    await addBlock(road, 1, ["X"]);
    await c.setCap({ road, year: 2026, term: "FALL", capType: "total", limit: 12 });
    const [plan] = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 1 }));
    expect(keys(plan)).toEqual(["2026-FALL-", "2027-FALL-X"]);
  });

  it("covers _slotOptions: common options that can go in the season", async () => {
    const { road, a, hass } = await hassRoad();
    await c.removeListingTerm({ subject: "HA.0", term: "FALL" }); // does not run in the fall
    await addSubject("Z", 12);
    await prerequisite("HA.1", ["Z"]); // needs Z first
    await c.pin({ road, subject: "HA.2", year: 2027, term: "SPRING" }); // taken
    const fall = (await c._slotOptions({ road, blocks: `${a},${hass}`, year: 2026, term: "FALL" })).map((r) => r.subject);
    expect(fall).toHaveLength(98);
    expect(fall.slice(0, 3)).toEqual(["HA.3", "HA.4", "HA.5"]);
    expect(fall.some((x) => x.startsWith("HS."))).toBe(false); // not an option of A
    const spring = (await c._slotOptions({ road, blocks: a, year: 2027, term: "SPRING" })).map((r) => r.subject);
    expect(spring.slice(0, 2)).toEqual(["HA.0", "HA.3"]);
    expect(await c._slotOptions({ road, blocks: "nope", year: 2026, term: "FALL" })).toEqual([]);
  });

  it("covers two blocks of one group sharing options: distinct subjects", async () => {
    const road = await makeRoad();
    await listedBlock(road, 1, "Application CI-M", "major", ["P", "Q"]);
    await listedBlock(road, 1, "Mandatory Application CI-M", "major", ["P", "Q"]);
    const [plan] = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 1 }));
    expect(sorted(plan.map((r) => r.subject))).toEqual(["P", "Q"]);
  });

  it("covers plans that differ: the next plan takes other options of a block", async () => {
    const road = await makeRoad();
    for (const x of ["A", "B", "C", "D"]) await addSubject(x, 12);
    await addBlock(road, 2, ["A", "B", "C", "D"]);
    const plans = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 2 }));
    expect(sorted(plans[0].map((r) => r.subject))).toEqual(["A", "B"]);
    expect(sorted(plans[1].map((r) => r.subject))).toEqual(["C", "D"]);
  });
});

// ---------------------------------------------------------------------------
// Which options plans prefer, and early blocks
// ---------------------------------------------------------------------------

/*
 * setPopularity: partition on subject: has a Listing, has none
 * choosing: partition on equal-cost options: different popularity
 *   partition on a group that may share: shares a subject chosen for another group; none to share
 *   partition on an elective's prerequisite: a subject every plan takes, a new subject
 * early blocks: partition on room: enough for early subjects first; only if the plan finishes later
 */
describe("preferences and early blocks", () => {
  async function listedBlock(road: string, count: number, group: string, options: string[], early = false) {
    const { block } = await c.addListedBlock({ road, count, title: group, technical: !early, group, origin: group, early });
    for (const s of options) await c.addOption({ block, subject: s });
    return block;
  }

  it("covers setPopularity, and the more popular of two equal options taken", async () => {
    await expectRefusal("setPopularity", "NO_LISTING", c.setPopularity({ subject: "nope", popularity: 3 }));
    const road = await makeRoad();
    await addSubject("A.1", 12);
    await addSubject("Z.9", 12);
    expect(await c.setPopularity({ subject: "Z.9", popularity: 300 })).toEqual({});
    await addBlock(road, 1, ["A.1", "Z.9"]);
    const [plan] = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 1 }));
    expect(plan.map((r) => r.subject)).toEqual(["Z.9"]);
  });

  it("covers a group that may share taking a subject chosen for another group", async () => {
    const road = await makeRoad();
    for (const s of ["CORE", "CIM.A", "CIM.B"]) await addSubject(s, 12);
    await c.setPopularity({ subject: "CIM.A", popularity: 1000 }); // would win on its own
    await listedBlock(road, 1, "major", ["CORE", "CIM.B"]);
    await listedBlock(road, 1, "cim", ["CIM.A", "CIM.B"]); // fewer spare options: chosen first
    await c.setPopularity({ subject: "CIM.B", popularity: 10 });
    const [plan] = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 1 }));
    expect(plan.map((r) => r.subject)).toEqual(["CIM.B"]); // one subject meets both
  });

  it("covers an elective whose prerequisite every plan takes costing no more than one without", async () => {
    const road = await makeRoad();
    for (const s of ["CORE", "AFTER", "ALONE", "LAST"]) await addSubject(s, 12);
    await prerequisite("AFTER", ["CORE"]);
    await c.setPopularity({ subject: "AFTER", popularity: 50 });
    await addBlock(road, 1, ["CORE"]);
    await addBlock(road, 1, ["AFTER", "ALONE"]);
    await c.pin({ road, subject: "LAST", year: 2027, term: "SPRING" }); // both choices finish then
    const [plan] = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 1 }));
    expect(sorted(plan.map((r) => r.subject))).toEqual(["AFTER", "CORE", "LAST"]);
  });

  it("covers early subjects placed first when room allows, but not at the cost of finishing later", async () => {
    const road = await makeRoad();
    await addSubject("GIR", 12);
    await addSubject("M1", 12, ["FALL"]);
    await addSubject("M2", 12, ["FALL"]);
    await prerequisite("M2", ["M1"]);
    await listedBlock(road, 1, "girs/1", ["GIR"], true);
    await addBlock(road, 1, ["M2"]);
    for (const [year, term] of [[2026, "FALL"], [2027, "SPRING"], [2027, "FALL"]] as const) {
      await c.setCap({ road, year, term, capType: "total", limit: 12 });
    }
    await c.setEnd({ road, year: 2027, term: "FALL" });
    // Room for one subject a semester, and M1 and M2 only run in the fall: GIR first
    // would push them a year later, past the end, so it waits.
    let [plan] = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 1 }));
    expect(keys(plan)).toEqual(["2026-FALL-M1", "2027-SPRING-GIR", "2027-FALL-M2"]);

    await c.setCap({ road, year: 2026, term: "FALL", capType: "total", limit: 24 });
    [plan] = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 1 }));
    expect(keys(plan).slice(0, 2).sort()).toEqual(["2026-FALL-GIR", "2026-FALL-M1"]);
  });
});

// ---------------------------------------------------------------------------
// Electives last, and what each subject counts toward
// ---------------------------------------------------------------------------

/*
 * electives in _findPath: partition on an elective: nothing waits on it (placed from the end
 *   backwards); another subject needs it (placed as early as it can go); only if it finishes later
 * counts in _findPath rows: partition on a subject: counted toward a block; only a prerequisite
 */
describe("electives and counts", () => {
  it("covers an elective nothing waits on placed in the last semester, a required subject first", async () => {
    const road = await makeRoad();
    for (const s of ["CORE", "E1", "E2"]) await addSubject(s, 12);
    await addBlock(road, 1, ["CORE"]);
    await addBlock(road, 1, ["E1", "E2"]);
    const [plan] = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 1 }));
    expect(keys(plan)).toEqual(["2026-FALL-CORE", "2030-SPRING-E1"]);
  });

  it("covers an elective another subject needs placed early, and counts of each subject", async () => {
    const road = await makeRoad();
    for (const s of ["E1", "E2", "LATER", "PRE"]) await addSubject(s, 12);
    await prerequisite("LATER", ["E1"]);
    await prerequisite("E1", ["PRE"]);
    const electives = await addBlock(road, 1, ["E1", "E2"]);
    const later = await addBlock(road, 1, ["LATER"]);
    const rows = (await c._findPath({ road, includeIAPAndSummer: false, limit: 1 })) as (PlanRow & { counts: string })[];
    expect(keys(rows)).toEqual(["2026-FALL-PRE", "2027-SPRING-E1", "2027-FALL-LATER"]);
    expect(Object.fromEntries(rows.map((r) => [r.subject, r.counts]))).toEqual({ PRE: "", E1: electives, LATER: later });
  });

  it("covers electives taken early when deferring them would finish later", async () => {
    const road = await makeRoad();
    await c.setEnd({ road, year: 2027, term: "SPRING" });
    for (const s of ["A", "B", "E1", "E2"]) await addSubject(s, 12);
    await addBlock(road, 2, ["A", "B"]);
    await addBlock(road, 1, ["E1", "E2"]);
    for (const [year, term] of [[2026, "FALL"], [2027, "SPRING"]] as const) {
      await c.setCap({ road, year, term, capType: "total", limit: 24 });
    }
    // Deferred, E1 would wait for SPRING 2027, which A and B fill: it goes in FALL 2026 instead.
    const [plan] = groupPlans(await c._findPath({ road, includeIAPAndSummer: false, limit: 1 }));
    expect(lastSeason(plan)).toBe(rank(2027, "SPRING"));
    expect(plan).toHaveLength(3);
  });
});
