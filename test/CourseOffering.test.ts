/**
 * Tests for the CourseOffering concept, derived from CourseOffering.md (the spec),
 * not from the implementation. Each operation has a testing strategy that
 * partitions its inputs/outputs (MIT 6.102 style), and each test notes which
 * partitions it covers.
 *
 * Run with: bun test test/CourseOffering.test.ts (needs MongoDB at MONGODB_URI)
 *
 * The only way to put courses into this concept is `load`, which takes a catalog
 * snapshot (the JSON written by scripts/build-catalog.ts). The fixtures below build
 * snapshots; `loadFall`/`loadSpring` load one for the academic year a Fall or an
 * IAP/Spring listing belongs to.
 */
import { beforeEach, describe, expect, test } from "bun:test";
import { CourseOfferingConcept, type SnapshotCourse } from "../src/concepts/CourseOffering.ts";
import { refusalsOf, useFreshDb } from "./support.ts";

// ───────────────────────── HARNESS ─────────────────────────

type Offering = "Offered normally" | "Not offered THIS year" | "Not offered NEXT year" | "Not currently listed";
type Term = "IAP" | "SPRING" | "SUMMER" | "FALL";

interface SubjectFixture {
  subject: string;
  name?: string;
  courseId?: string;
  description?: string;
  lecturer?: string;
  level?: string;
  terms?: Term[];
  offering?: Offering;
  canBeRepeated?: boolean;
  units?: string;
  meetingTimes?: string;
  location?: string;
  prerequisites?: { count: number; options: string[] }[];
  corequisites?: { count: number; options: string[] }[];
  prerequisitesText?: string;
  corequisitesText?: string;
}
interface RatingFixture { course: string; classRating: number; url: string }

const db = useFreshDb("course_offering_test");
const expectRefusal = refusalsOf("CourseOffering");
let concept: CourseOfferingConcept;
let snapshots = 0;

beforeEach(() => {
  concept = new CourseOfferingConcept(db());
});

/** The JSON of a snapshot of the academic year starting in FALL of academicYear. */
function snapshot(subjects: SubjectFixture[], ratings: RatingFixture[], academicYear: number, id = `test-${++snapshots}`) {
  const courses: SnapshotCourse[] = subjects.map((s) => {
    const rating = ratings.find((r) => r.course === s.subject);
    return {
      name: "", courseId: s.subject, description: "", lecturer: "", level: "", terms: [], offering: "Offered normally",
      canBeRepeated: false, prerequisitesText: "", corequisitesText: "", prerequisites: [], corequisites: [],
      totalUnits: 12, technical: true,
      ...s,
      ...(rating ? { rating: { classRating: rating.classRating, url: rating.url } } : {}),
    };
  });
  return JSON.stringify({ id, source: "test", academicYear, courses });
}

// A Fall Y listing and an IAP/Spring Y+1 listing both belong to the academic year starting in FALL of Y.
async function loadFall(subjects: SubjectFixture[], ratings: RatingFixture[] = [], year = 2026) {
  return concept.load({ snapshot: snapshot(subjects, ratings, year) });
}
async function loadSpring(subjects: SubjectFixture[], year = 2027) {
  return concept.load({ snapshot: snapshot(subjects, [], year - 1) });
}

const normal = (subject: string, extra: Partial<SubjectFixture> = {}): SubjectFixture => ({
  subject,
  name: `Name of ${subject}`,
  courseId: subject,
  description: `Description of ${subject}`,
  lecturer: "Prof. X",
  level: "Undergraduate",
  terms: ["FALL"],
  offering: "Offered normally",
  ...extra,
});

// ───────────────────────── load ─────────────────────────
/**
 * Testing strategy for load
 *
 * Partition on the snapshot:
 *   well formed; not JSON; JSON of the wrong shape (missing id, bad term, bad offering,
 *   bad dependency count, duplicate subject)
 * Partition on listing half the academic year was taken from:
 *   Fall Y listing; IAP/Spring Y+1 listing
 * Partition on offering of a subject:
 *   "Offered normally"; "Not offered THIS year"; "Not offered NEXT year"; "Not currently listed"
 * Partition on prior state of a subject:
 *   never loaded; loaded before (reload)
 * Partition on ratings:
 *   subject has a rating entry; subject has none
 * Partition on number of subjects in the snapshot:
 *   0, 1, many
 */
describe("load refusals", () => {
  test("covers: not JSON -> refuses LOAD_FAILED and stores nothing", async () => {
    await expectRefusal("load", "LOAD_FAILED", concept.load({ snapshot: "not json" }));
    expect(await concept._search({})).toEqual([]);
    expect(await concept._loadedSnapshot({})).toEqual({ found: false, id: "" });
  });

  test("covers: wrong shape (no id, no courses) -> refuses LOAD_FAILED", async () => {
    await expectRefusal("load", "LOAD_FAILED", concept.load({ snapshot: JSON.stringify({ academicYear: 2026, courses: [] }) }));
    await expectRefusal("load", "LOAD_FAILED", concept.load({ snapshot: JSON.stringify({ id: "x", academicYear: 2026 }) }));
    await expectRefusal("load", "LOAD_FAILED", concept.load({ snapshot: "[]" }));
  });

  test("covers: a course with a bad term, offering or dependency count -> refuses LOAD_FAILED and stores no courses", async () => {
    for (const bad of [
      { terms: ["WINTER" as Term] },
      { offering: "Sometimes" as Offering },
      { prerequisites: [{ count: 0, options: ["6.1010"] }] },
    ]) {
      await expectRefusal("load", "LOAD_FAILED", concept.load({ snapshot: snapshot([normal("6.1020", bad)], [], 2026) }));
    }
    expect(await concept._search({})).toEqual([]);
  });

  test("covers: the same subject twice -> refuses LOAD_FAILED", async () => {
    await expectRefusal("load", "LOAD_FAILED", concept.load({ snapshot: snapshot([normal("6.1010"), normal("6.1010")], [], 2026) }));
    expect(await concept._search({})).toEqual([]);
  });
});

describe("load", () => {
  test("covers: well formed, Fall, many subjects; returns the number of subjects loaded", async () => {
    const res = await loadFall([normal("6.1010"), normal("6.1020"), normal("6.1200")]);
    expect(res).toEqual({ count: 3 });
    expect((await concept._search({})).map((r) => r.course).sort()).toEqual(["6.1010", "6.1020", "6.1200"]);
  });

  test("covers: 0 subjects", async () => {
    expect(await loadFall([])).toEqual({ count: 0 });
    expect(await concept._search({})).toEqual([]);
  });

  test("covers: 1 subject; stores metadata visible through queries", async () => {
    await loadFall([
      normal("6.1010", { name: "Fundamentals of Programming", level: "Undergraduate", units: "2-4-6", terms: ["FALL", "SPRING"] }),
    ]);
    const [row] = await concept._search({ query: "Fundamentals" });
    expect(row).toMatchObject({ course: "6.1010", name: "Fundamentals of Programming", level: "Undergraduate", units: "2-4-6" });
    expect((await concept._terms({ course: "6.1010" })).map((t) => t.term).sort()).toEqual(["FALL", "SPRING"]);
  });

  test("covers: subject with a rating / subject without one", async () => {
    await loadFall([normal("6.1010"), normal("6.1020")], [
      { course: "6.1010", classRating: 6.1, url: "https://eval.test/6.1010" },
    ]);
    expect(await concept._ratings({ course: "6.1010" })).toEqual({
      found: true, classRating: 6.1, url: "https://eval.test/6.1010",
    });
    expect((await concept._ratings({ course: "6.1020" })).found).toBe(false);
  });

  test("covers: offering = 'Offered normally' adds no cancellations", async () => {
    await loadFall([normal("6.1010")]);
    expect(await concept._cancellations({ course: "6.1010" })).toEqual([]);
  });

  test("covers: 'Not offered THIS year' (Fall 2026 listing) cancels FALL 2026, IAP/SPRING/SUMMER 2027 only", async () => {
    await loadFall([normal("6.1010", { offering: "Not offered THIS year" })], [], 2026);
    expect(await concept._cancellations({ course: "6.1010" })).toEqual([
      { year: 2026, term: "FALL" },
      { year: 2027, term: "IAP" },
      { year: 2027, term: "SPRING" },
      { year: 2027, term: "SUMMER" },
    ]);
  });

  test("covers: 'Not offered NEXT year' cancels the following academic year only", async () => {
    await loadFall([normal("6.1010", { offering: "Not offered NEXT year" })], [], 2026);
    expect(await concept._cancellations({ course: "6.1010" })).toEqual([
      { year: 2027, term: "FALL" },
      { year: 2028, term: "IAP" },
      { year: 2028, term: "SPRING" },
      { year: 2028, term: "SUMMER" },
    ]);
  });

  test("covers: 'Not currently listed' cancels both academic years (8 seasons)", async () => {
    await loadFall([normal("6.1010", { offering: "Not currently listed" })], [], 2026);
    const c = await concept._cancellations({ course: "6.1010" });
    expect(c).toHaveLength(8);
    expect(c[0]).toEqual({ year: 2026, term: "FALL" });
    expect(c[7]).toEqual({ year: 2028, term: "SUMMER" });
  });

  test("covers: IAP/Spring Y+1 listing is the academic year starting FALL Y (same seasons as Fall Y listing)", async () => {
    await loadSpring([normal("6.1010", { offering: "Not offered THIS year", terms: ["SPRING"] })], 2027);
    expect(await concept._cancellations({ course: "6.1010" })).toEqual([
      { year: 2026, term: "FALL" },
      { year: 2027, term: "IAP" },
      { year: 2027, term: "SPRING" },
      { year: 2027, term: "SUMMER" },
    ]);
  });

  test("covers: reload replaces the terms of a subject (a snapshot covers every term)", async () => {
    await loadFall([normal("6.1010", { terms: ["FALL"] })]);
    await loadSpring([normal("6.1010", { terms: ["IAP", "SPRING"] })]);
    expect((await concept._terms({ course: "6.1010" })).map((t) => t.term)).toEqual(["IAP", "SPRING"]);
  });

  test("covers: reload with no terms empties them", async () => {
    await loadFall([normal("6.1010", { terms: ["FALL"] })]);
    await loadFall([normal("6.1010", { terms: [] })]);
    expect(await concept._terms({ course: "6.1010" })).toEqual([]);
  });

  test("covers: reload replaces cancellations in the covered years (offering changes to normal)", async () => {
    await loadFall([normal("6.1010", { offering: "Not offered THIS year" })]);
    await loadFall([normal("6.1010", { offering: "Offered normally" })]);
    expect(await concept._cancellations({ course: "6.1010" })).toEqual([]);
  });

  test("covers: reload replaces dependencies rather than accumulating them", async () => {
    await loadFall([normal("6.1020", { prerequisites: [{ count: 1, options: ["6.1010"] }] })]);
    await loadFall([normal("6.1020", { prerequisites: [{ count: 1, options: ["6.1200"] }] })]);
    const rows = await concept._prerequisites({ course: "6.1020" });
    expect(rows.map((r) => r.prerequisite)).toEqual(["6.1200"]);
  });

  test("covers: a refused load leaves the courses and snapshot of an earlier load in place", async () => {
    await concept.load({ snapshot: snapshot([normal("6.1010")], [], 2026, "first") });
    await expectRefusal("load", "LOAD_FAILED", concept.load({ snapshot: "{" }));
    expect((await concept._search({})).map((r) => r.course)).toEqual(["6.1010"]);
    expect(await concept._loadedSnapshot({})).toEqual({ found: true, id: "first" });
  });

  test("covers: a subject left out of a later snapshot is kept", async () => {
    await loadFall([normal("6.1010"), normal("6.1020")]);
    await loadFall([normal("6.1020")]);
    expect((await concept._search({})).map((r) => r.course)).toEqual(["6.1010", "6.1020"]);
  });
});

// ───────────────────────── _loadedSnapshot / _course ─────────────────────────
/**
 * Testing strategy for _loadedSnapshot
 *
 * Partition on loads: none; one; several (answers the last)
 *
 * Testing strategy for _course
 *
 * Partition on course: in Courses; not in Courses
 * Partition on units: present; absent
 * Partition on requirement text: empty; present
 */
describe("_loadedSnapshot", () => {
  test("covers: none loaded -> found = false", async () => {
    expect(await concept._loadedSnapshot({})).toEqual({ found: false, id: "" });
  });

  test("covers: one, then several loaded -> the id of the last", async () => {
    await concept.load({ snapshot: snapshot([normal("6.1010")], [], 2026, "fall") });
    expect(await concept._loadedSnapshot({})).toEqual({ found: true, id: "fall" });
    await concept.load({ snapshot: snapshot([], [], 2026, "spring") });
    expect(await concept._loadedSnapshot({})).toEqual({ found: true, id: "spring" });
  });
});

describe("_course", () => {
  test("covers: not in Courses -> found = false", async () => {
    expect((await concept._course({ course: "6.1010" })).found).toBe(false);
  });

  test("covers: in Courses, units and requirement text present -> every attribute", async () => {
    await loadFall([normal("6.1020", {
      name: "Software Construction", units: "3-0-9", canBeRepeated: true,
      prerequisitesText: "6.1010/''permission of instructor''", corequisitesText: "18.02",
    })]);
    expect(await concept._course({ course: "6.1020" })).toEqual({
      found: true, name: "Software Construction", courseId: "6.1020", description: "Description of 6.1020",
      lecturer: "Prof. X", level: "Undergraduate", units: "3-0-9", offering: "Offered normally", canBeRepeated: true,
      prerequisitesText: "6.1010/''permission of instructor''", corequisitesText: "18.02",
    });
  });

  test("covers: units absent, no requirement text -> empty strings", async () => {
    await loadFall([normal("6.1010")]);
    expect(await concept._course({ course: "6.1010" })).toMatchObject({ found: true, units: "", prerequisitesText: "", corequisitesText: "" });
  });
});

// ───────────────────────── _prerequisites / _corequisites ─────────────────────────
/**
 * Testing strategy for _prerequisites and _corequisites
 *
 * Partition on number of dependencies of that kind: 0, 1, >1
 * Partition on a dependency's count: 1, >1
 * Partition on a dependency's number of options: 1, >1
 * Partition on other kind present: yes (must not leak), no
 * Partition on transitivity: prerequisite has its own prerequisites (must not be listed)
 */
describe("_prerequisites", () => {
  test("covers: 0 dependencies -> no rows", async () => {
    await loadFall([normal("6.1010")]);
    expect(await concept._prerequisites({ course: "6.1010" })).toEqual([]);
  });

  test("covers: 1 dependency, count 1, 1 option", async () => {
    await loadFall([normal("6.1020", { prerequisites: [{ count: 1, options: ["6.1010"] }] })]);
    const rows = await concept._prerequisites({ course: "6.1020" });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ count: 1, prerequisite: "6.1010" });
  });

  test("covers: 'or' group: one dependency, count 1, >1 options -> one row per option sharing the dependency and count", async () => {
    await loadFall([normal("6.1020", { prerequisites: [{ count: 1, options: ["6.1010", "6.100A"] }] })]);
    const rows = await concept._prerequisites({ course: "6.1020" });
    expect(rows.map((r) => r.prerequisite).sort()).toEqual(["6.100A", "6.1010"]);
    expect(new Set(rows.map((r) => r.dependency)).size).toBe(1);
    expect(rows.every((r) => r.count === 1)).toBe(true);
  });

  test("covers: 'and': >1 dependencies -> distinct dependency ids", async () => {
    await loadFall([normal("6.1020", {
      prerequisites: [{ count: 1, options: ["6.1010"] }, { count: 1, options: ["18.01"] }],
    })]);
    const rows = await concept._prerequisites({ course: "6.1020" });
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.dependency)).size).toBe(2);
  });

  test("covers: count > 1 (need at least 2 of 3 options)", async () => {
    await loadFall([normal("6.9999", { prerequisites: [{ count: 2, options: ["A", "B", "C"] }] })]);
    const rows = await concept._prerequisites({ course: "6.9999" });
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.count === 2)).toBe(true);
  });

  test("covers: rows are ordered by dependency (rows of one dependency are not interleaved with another)", async () => {
    await loadFall([normal("6.1020", {
      prerequisites: [{ count: 1, options: ["A", "B"] }, { count: 1, options: ["C", "D"] }],
    })]);
    const ids = (await concept._prerequisites({ course: "6.1020" })).map((r) => r.dependency);
    const runs = ids.filter((id, i) => i === 0 || ids[i - 1] !== id);
    expect(runs).toHaveLength(2);
  });

  test("covers: not recursive — only direct prerequisites", async () => {
    await loadFall([
      normal("6.1010"),
      normal("6.1020", { prerequisites: [{ count: 1, options: ["6.1010"] }] }),
      normal("6.1200", { prerequisites: [{ count: 1, options: ["6.1020"] }] }),
    ]);
    expect((await concept._prerequisites({ course: "6.1200" })).map((r) => r.prerequisite)).toEqual(["6.1020"]);
  });

  test("covers: other kind present — corequisites are not returned as prerequisites", async () => {
    await loadFall([normal("6.1020", {
      prerequisites: [{ count: 1, options: ["6.1010"] }],
      corequisites: [{ count: 1, options: ["18.02"] }],
    })]);
    expect((await concept._prerequisites({ course: "6.1020" })).map((r) => r.prerequisite)).toEqual(["6.1010"]);
  });
});

describe("_corequisites", () => {
  test("covers: 0 dependencies -> no rows", async () => {
    await loadFall([normal("6.1010")]);
    expect(await concept._corequisites({ course: "6.1010" })).toEqual([]);
  });

  test("covers: 1 dependency, 1 option, count 1", async () => {
    await loadFall([normal("6.1020", { corequisites: [{ count: 1, options: ["18.02"] }] })]);
    const rows = await concept._corequisites({ course: "6.1020" });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ count: 1, corequisite: "18.02" });
  });

  test("covers: >1 dependencies, >1 options, count > 1", async () => {
    await loadFall([normal("6.1020", {
      corequisites: [{ count: 2, options: ["A", "B", "C"] }, { count: 1, options: ["D"] }],
    })]);
    const rows = await concept._corequisites({ course: "6.1020" });
    expect(rows).toHaveLength(4);
    expect(new Set(rows.map((r) => r.dependency)).size).toBe(2);
    expect(rows.filter((r) => r.count === 2)).toHaveLength(3);
  });

  test("covers: other kind present — prerequisites are not returned as corequisites", async () => {
    await loadFall([normal("6.1020", {
      prerequisites: [{ count: 1, options: ["6.1010"] }],
      corequisites: [{ count: 1, options: ["18.02"] }],
    })]);
    expect((await concept._corequisites({ course: "6.1020" })).map((r) => r.corequisite)).toEqual(["18.02"]);
  });
});

// ───────────────────────── _isOffered ─────────────────────────
/**
 * Testing strategy for _isOffered
 *
 * Partition on whether term is in the course's terms: yes, no
 * Partition on whether the (year, term) season is cancelled: yes, no
 * Partition on the season relative to loaded years: inside a covered academic year; outside any (e.g. 2035)
 * Partition on term: IAP, SPRING, SUMMER, FALL
 *
 * Spec: offered iff terms include term AND there is no cancellation for that season.
 */
describe("_isOffered", () => {
  test("covers: term listed, not cancelled -> offered", async () => {
    await loadFall([normal("6.1010", { terms: ["FALL"] })]);
    expect(await concept._isOffered({ course: "6.1010", year: 2026, term: "FALL" })).toEqual({ offered: true });
  });

  test("covers: term not listed, not cancelled -> not offered", async () => {
    await loadFall([normal("6.1010", { terms: ["FALL"] })]);
    expect(await concept._isOffered({ course: "6.1010", year: 2026, term: "SPRING" })).toEqual({ offered: false });
  });

  test("covers: term listed, cancelled -> not offered", async () => {
    await loadFall([normal("6.1010", { terms: ["FALL"], offering: "Not offered THIS year" })]);
    expect(await concept._isOffered({ course: "6.1010", year: 2026, term: "FALL" })).toEqual({ offered: false });
  });

  test("covers: term not listed AND cancelled -> not offered", async () => {
    await loadFall([normal("6.1010", { terms: ["FALL"], offering: "Not offered THIS year" })]);
    expect(await concept._isOffered({ course: "6.1010", year: 2027, term: "SPRING" })).toEqual({ offered: false });
  });

  test("covers: cancellation is per season — same term in the next year is still offered", async () => {
    await loadFall([normal("6.1010", { terms: ["FALL"], offering: "Not offered THIS year" })]);
    expect((await concept._isOffered({ course: "6.1010", year: 2027, term: "FALL" })).offered).toBe(true);
  });

  test("covers: 'Not offered NEXT year' leaves this year offered and cancels the next", async () => {
    await loadFall([normal("6.1010", { terms: ["FALL"], offering: "Not offered NEXT year" })]);
    expect((await concept._isOffered({ course: "6.1010", year: 2026, term: "FALL" })).offered).toBe(true);
    expect((await concept._isOffered({ course: "6.1010", year: 2027, term: "FALL" })).offered).toBe(false);
  });

  test("covers: season outside any loaded academic year, no cancellation -> offered if term listed", async () => {
    await loadFall([normal("6.1010", { terms: ["FALL"] })]);
    expect((await concept._isOffered({ course: "6.1010", year: 2035, term: "FALL" })).offered).toBe(true);
  });

  test.each(["IAP", "SPRING", "SUMMER", "FALL"] as Term[])("covers: term %s listed and not cancelled", async (term) => {
    await loadFall([normal("6.1010", { terms: [term] })]);
    const year = term === "FALL" ? 2026 : 2027;
    expect((await concept._isOffered({ course: "6.1010", year, term })).offered).toBe(true);
  });
});

// ───────────────────────── _cancellations ─────────────────────────
/**
 * Testing strategy for _cancellations
 *
 * Partition on number of cancellations: 0, 1+ (see load for 4 / 8)
 * Partition on ordering: within one calendar year (IAP<SPRING<SUMMER<FALL);
 *   across years (FALL Y precedes IAP Y+1 because year compares first)
 * Partition on other subjects: another course has cancellations (must not leak)
 */
describe("_cancellations", () => {
  test("covers: none -> no rows", async () => {
    await loadFall([normal("6.1010")]);
    expect(await concept._cancellations({ course: "6.1010" })).toEqual([]);
  });

  test("covers: ordered by year, then IAP < SPRING < SUMMER < FALL", async () => {
    await loadFall([normal("6.1010", { offering: "Not currently listed" })], [], 2026);
    const c = await concept._cancellations({ course: "6.1010" });
    expect(c.map((s) => `${s.year} ${s.term}`)).toEqual([
      "2026 FALL",
      "2027 IAP", "2027 SPRING", "2027 SUMMER", "2027 FALL",
      "2028 IAP", "2028 SPRING", "2028 SUMMER",
    ]);
  });

  test("covers: only the requested course's cancellations", async () => {
    await loadFall([
      normal("6.1010", { offering: "Not offered THIS year" }),
      normal("6.1020", { offering: "Offered normally" }),
    ]);
    expect(await concept._cancellations({ course: "6.1020" })).toEqual([]);
    expect(await concept._cancellations({ course: "6.1010" })).toHaveLength(4);
  });
});

// ───────────────────────── _ratings ─────────────────────────
/**
 * Testing strategy for _ratings
 *
 * Partition on whether course has a Ratings entry: yes, no
 * Partition on rating values: typical, boundary (0 / max)
 */
describe("_ratings", () => {
  test("covers: course in Ratings -> found with class rating and url", async () => {
    await loadFall([normal("6.1010")], [{ course: "6.1010", classRating: 5.5, url: "https://eval.test/a" }]);
    expect(await concept._ratings({ course: "6.1010" })).toEqual({
      found: true, classRating: 5.5, url: "https://eval.test/a",
    });
  });

  test("covers: course not in Ratings -> found = false", async () => {
    await loadFall([normal("6.1010")]);
    expect((await concept._ratings({ course: "6.1010" })).found).toBe(false);
  });

  test("covers: boundary rating values 0 and 7 are preserved", async () => {
    await loadFall([normal("A"), normal("B")], [
      { course: "A", classRating: 0, url: "u1" },
      { course: "B", classRating: 7, url: "u2" },
    ]);
    expect(await concept._ratings({ course: "A" })).toMatchObject({ found: true, classRating: 0 });
    expect(await concept._ratings({ course: "B" })).toMatchObject({ found: true, classRating: 7 });
  });
});

// ───────────────────────── _search ─────────────────────────
/**
 * Testing strategy for _search
 *
 * Partition on catalog: empty, non-empty
 * Partition on query: absent; empty string; matches name only; matches description only;
 *   matches courseId only; matches several fields; matches none;
 *   differs only in case; contains regex metacharacters
 * Partition on level: absent; matches some; matches none; differs only in case
 * Partition on term: absent; some courses have it; none have it
 * Partition on combination: no filters; one filter; all three (intersection)
 * Partition on units: numeric total ("3-0-9", "12"); non-numeric ("Arrange"); absent
 * Partition on result size: 0, 1, many
 */
describe("_search on an empty catalog", () => {
  test("covers: empty catalog -> no rows, with or without filters", async () => {
    expect(await concept._search({})).toEqual([]);
    expect(await concept._search({ query: "6.1010", level: "Undergraduate", term: "FALL" })).toEqual([]);
  });
});

describe("_search", () => {
  const catalog = () => [
    normal("6.1010", { name: "Fundamentals of Programming", description: "Python and testing", courseId: "6.1010", level: "Undergraduate", terms: ["FALL", "SPRING"], units: "2-4-6" }),
    normal("6.8200", { name: "Advanced Robotics", description: "Planning and control", courseId: "6.8200", level: "Graduate", terms: ["SPRING"], units: "3-0-9" }),
    normal("21M.301", { name: "Harmony", description: "Music theory; includes C++ (sic) notation", courseId: "21M.301", level: "Undergraduate", terms: ["FALL"], units: "Arrange" }),
    normal("18.01", { name: "Calculus", description: "Differential calculus", courseId: "18.01", level: "Undergraduate", terms: ["IAP", "FALL"] }),
  ];
  const ids = (rows: { course: string }[]) => rows.map((r) => r.course).sort();

  beforeEach(async () => { await loadFall(catalog()); });

  test("covers: no filters -> every course", async () => {
    expect(ids(await concept._search({}))).toEqual(["18.01", "21M.301", "6.1010", "6.8200"]);
  });

  test("covers: empty query is treated as not given", async () => {
    expect(ids(await concept._search({ query: "" }))).toEqual(["18.01", "21M.301", "6.1010", "6.8200"]);
  });

  test("covers: query matches name only", async () => {
    expect(ids(await concept._search({ query: "Robotics" }))).toEqual(["6.8200"]);
  });

  test("covers: query matches description only", async () => {
    expect(ids(await concept._search({ query: "Python" }))).toEqual(["6.1010"]);
  });

  test("covers: query matches courseId only", async () => {
    expect(ids(await concept._search({ query: "21M" }))).toEqual(["21M.301"]);
  });

  test("covers: query matches substrings (contains, not equals)", async () => {
    expect(ids(await concept._search({ query: "calc" }))).toEqual(["18.01"]);
  });

  test("covers: query is case-insensitive", async () => {
    expect(ids(await concept._search({ query: "fUnDaMeNtAlS" }))).toEqual(["6.1010"]);
  });

  test("covers: query matching several fields of different courses", async () => {
    expect(ids(await concept._search({ query: "ing" }))).toEqual(["6.1010", "6.8200"]);
  });

  test("covers: query matches none -> empty", async () => {
    expect(await concept._search({ query: "zzzzzz" })).toEqual([]);
  });

  test("covers: regex metacharacters in query are literal", async () => {
    expect(ids(await concept._search({ query: "C++ (sic)" }))).toEqual(["21M.301"]);
    expect(await concept._search({ query: ".*" })).toEqual([]);
  });

  test("covers: level matches some", async () => {
    expect(ids(await concept._search({ level: "Graduate" }))).toEqual(["6.8200"]);
  });

  test("covers: level is case-insensitive but must match the whole level", async () => {
    expect(ids(await concept._search({ level: "graduate" }))).toEqual(["6.8200"]);
    expect(await concept._search({ level: "Grad" })).toEqual([]);
  });

  test("covers: level matches none", async () => {
    expect(await concept._search({ level: "Postdoc" })).toEqual([]);
  });

  test("covers: term filter keeps courses whose terms include it", async () => {
    expect(ids(await concept._search({ term: "FALL" }))).toEqual(["18.01", "21M.301", "6.1010"]);
    expect(ids(await concept._search({ term: "IAP" }))).toEqual(["18.01"]);
  });

  test("covers: term that no course has -> empty", async () => {
    expect(await concept._search({ term: "SUMMER" })).toEqual([]);
  });

  test("covers: all three filters -> intersection", async () => {
    expect(ids(await concept._search({ query: "programming", level: "Undergraduate", term: "SPRING" }))).toEqual(["6.1010"]);
    expect(await concept._search({ query: "programming", level: "Graduate", term: "SPRING" })).toEqual([]);
  });

  test("covers: result fields; units numeric -> unitsKnown true", async () => {
    const [r] = await concept._search({ query: "Robotics" });
    expect(r).toEqual({
      course: "6.8200", name: "Advanced Robotics", courseId: "6.8200", level: "Graduate", units: "3-0-9", unitsKnown: true,
      terms: "SPRING",
    });
  });

  test("covers: terms are in season order, separated by spaces", async () => {
    const [r] = await concept._search({ query: "Calculus" });
    expect(r.terms).toBe("IAP FALL");
  });

  test("covers: rows are ordered by course Id, numbers compared as numbers", async () => {
    expect((await concept._search({})).map((r) => r.courseId)).toEqual(["6.1010", "6.8200", "18.01", "21M.301"]);
  });

  test("covers: units 'Arrange' -> unitsKnown false", async () => {
    const [r] = await concept._search({ query: "Harmony" });
    expect(r.units).toBe("Arrange");
    expect(r.unitsKnown).toBe(false);
  });

  test("covers: units absent -> units '' and unitsKnown false", async () => {
    const [r] = await concept._search({ query: "Calculus" });
    expect(r.units).toBe("");
    expect(r.unitsKnown).toBe(false);
  });

  test("covers: single plain total e.g. '12' counts as known", async () => {
    await loadFall([normal("X.1", { units: "12" })]);
    const [r] = await concept._search({ query: "X.1" });
    expect(r.unitsKnown).toBe(true);
  });
});

// ───────────────────────── _terms ─────────────────────────
/**
 * Testing strategy for _terms
 *
 * Partition on number of terms: 0, 1, many (up to all 4)
 * Partition on the snapshot's listing half: Fall; Spring
 * Partition on order: terms are answered in season order
 */
describe("_terms", () => {
  const names = async (c: string) => (await concept._terms({ course: c })).map((t) => t.term).sort();

  test("covers: 0 terms -> no rows", async () => {
    await loadFall([normal("6.1010", { terms: [] })]);
    expect(await concept._terms({ course: "6.1010" })).toEqual([]);
  });

  test("covers: 1 term", async () => {
    await loadFall([normal("6.1010", { terms: ["FALL"] })]);
    expect(await names("6.1010")).toEqual(["FALL"]);
  });

  test("covers: Spring listing only", async () => {
    await loadSpring([normal("6.1010", { terms: ["SPRING"] })]);
    expect(await names("6.1010")).toEqual(["SPRING"]);
  });

  test("covers: all four terms, in season order", async () => {
    await loadFall([normal("6.1010", { terms: ["FALL", "SUMMER", "IAP", "SPRING"] })]);
    expect((await concept._terms({ course: "6.1010" })).map((t) => t.term)).toEqual(["IAP", "SPRING", "SUMMER", "FALL"]);
  });
});

// ───────────────────────── _schedule ─────────────────────────
/**
 * Testing strategy for _schedule
 *
 * Partition on meetingTimes: present; absent/empty
 * Partition on units: present; absent (with meetingTimes present)
 * Partition on location: present; absent (with meetingTimes present)
 */
describe("_schedule", () => {
  test("covers: meetingTimes present -> found with units, meetingTimes, location", async () => {
    await loadFall([normal("6.1010", { units: "2-4-6", meetingTimes: "TR2.30-4", location: "36-153" })]);
    expect(await concept._schedule({ course: "6.1010" })).toEqual({
      found: true, units: "2-4-6", meetingTimes: "TR2.30-4", location: "36-153",
    });
  });

  test("covers: no meetingTimes -> found = false", async () => {
    await loadFall([normal("6.1010", { units: "2-4-6" })]);
    expect((await concept._schedule({ course: "6.1010" })).found).toBe(false);
  });

  test("covers: empty meetingTimes counts as absent", async () => {
    await loadFall([normal("6.1010", { meetingTimes: "" })]);
    expect((await concept._schedule({ course: "6.1010" })).found).toBe(false);
  });

  test("covers: meetingTimes present but units / location absent -> still found", async () => {
    await loadFall([normal("6.1010", { meetingTimes: "MWF10" })]);
    const res = await concept._schedule({ course: "6.1010" });
    expect(res.found).toBe(true);
    expect(res.meetingTimes).toBe("MWF10");
  });
});

// ───────────────────────── principle ─────────────────────────
describe("principle", () => {
  test("the maintainer loads a snapshot, then a student searches and sees when a subject is offered, what it requires, and how it was rated", async () => {
    await loadFall(
      [
        normal("6.1010", { name: "Fundamentals of Programming", terms: ["FALL", "SPRING"] }),
        normal("6.1020", {
          name: "Elements of Software Construction",
          terms: ["FALL"],
          offering: "Not offered NEXT year",
          prerequisites: [{ count: 1, options: ["6.1010"] }],
        }),
      ],
      [{ course: "6.1020", classRating: 5.8, url: "https://eval.test/6.1020" }],
    );

    const [hit] = await concept._search({ query: "software construction" });
    expect(hit.course).toBe("6.1020");
    expect((await concept._isOffered({ course: "6.1020", year: 2026, term: "FALL" })).offered).toBe(true);
    expect((await concept._isOffered({ course: "6.1020", year: 2027, term: "FALL" })).offered).toBe(false);
    expect((await concept._prerequisites({ course: "6.1020" })).map((r) => r.prerequisite)).toEqual(["6.1010"]);
    expect(await concept._ratings({ course: "6.1020" })).toMatchObject({ found: true, classRating: 5.8 });
  });
});
