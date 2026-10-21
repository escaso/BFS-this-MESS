// Tests for turning Fireroad's catalog into a catalog snapshot (src/catalog/fireroad.ts).
//
// Run with: bun test test/fireroad.test.ts   (no database needed)

import { describe, expect, test } from "bun:test";
import {
  academicYearOf, dependenciesOf, fromFireroad, offeringOf, parseRequirement, scheduleOf, toClauses, unitsOf,
  type BuildStats, type FireroadCourse,
} from "../src/catalog/fireroad.ts";

/*
 * Testing strategy
 *
 * parseRequirement / toClauses:
 *   partition on shape: one subject; and; or; nested or-of-ands; GIR; quoted text; unquoted text;
 *     "AND"/"OR" written as words; malformed (unbalanced parentheses, dangling operator)
 * dependenciesOf:
 *   partition on groups: all subjects; some free text (dropped); some unknown subjects (dropped);
 *     a group left empty (dropped); empty or missing source; unparsable source (counted)
 * offeringOf: historical; not offered this year; next year; an earlier year; normal
 * unitsOf: fixed; variable; zero
 * scheduleOf: lecture plus other sections; no lecture; evening; empty
 * fromFireroad: whole snapshot fields, GIR expansion (LAB includes LAB2), duplicates, ordering
 */

const stats = (): BuildStats => ({ freeTextGroups: 0, unknownSubjects: 0, unparsed: [], tooLarge: [] });
const noGir = () => [];
const clauses = (source: string, gir: (a: string) => string[] = noGir) =>
  toClauses(parseRequirement(source), gir).map((c) => [...c].sort((a, b) => String(a).localeCompare(String(b))));

describe("parseRequirement and toClauses", () => {
  test("one subject -> one group", () => {
    expect(clauses("6.100A")).toEqual([["6.100A"]]);
  });

  test("and -> one group per part; or -> one group with every option", () => {
    expect(clauses("2.003, 2.016, 2.678")).toEqual([["2.003"], ["2.016"], ["2.678"]]);
    expect(clauses("6.1000/6.1210")).toEqual([["6.1000", "6.1210"]]);
  });

  test("nested or of ands is distributed exactly (6.1210)", () => {
    const groups = clauses("6.100A, (6.1200/(6.120A, (6.3700/6.3800/18.05/18.600)))");
    expect(groups).toHaveLength(3);
    expect(groups).toContainEqual(["6.100A"]);
    expect(groups).toContainEqual(["6.1200", "6.120A"]);
    expect(groups).toContainEqual(["18.05", "18.600", "6.1200", "6.3700", "6.3800"]);
  });

  test("a group implied by a smaller one is dropped", () => {
    expect(clauses("A.1, (A.1/B.1)")).toEqual([["A.1"]]);
  });

  test("GIR expands to the subjects that satisfy it; an unknown GIR does not block", () => {
    expect(clauses("GIR:CAL1", (a) => (a === "CAL1" ? ["18.01", "18.01A"] : []))).toEqual([["18.01", "18.01A"]]);
    expect(clauses("GIR:XYZ")).toEqual([[null]]);
  });

  test("quoted and unquoted free text are text", () => {
    expect(parseRequirement("''permission of instructor''")).toEqual({ kind: "text", text: "permission of instructor" });
    expect(parseRequirement("3.202, permission of instructor")).toEqual({
      kind: "and",
      parts: [{ kind: "subject", id: "3.202" }, { kind: "text", text: "permission of instructor" }],
    });
    expect(parseRequirement("8.044 recommended but not necessary").kind).toBe("text");
  });

  test("AND / OR written as words between subjects are operators", () => {
    expect(clauses("(5.601 AND 5.602)")).toEqual([["5.601"], ["5.602"]]);
    expect(clauses("5.601 or 5.602")).toEqual([["5.601", "5.602"]]);
  });

  test("malformed -> throws", () => {
    expect(() => parseRequirement("(6.1010, 6.1200")).toThrow();
    expect(() => parseRequirement("6.1010,")).toThrow();
    expect(() => parseRequirement("/6.1010")).toThrow();
  });
});

describe("dependenciesOf", () => {
  const known = new Set(["6.100A", "6.1200", "18.03", "18.06", "6.1000", "6.1210"]);

  test("all subjects -> one dependency per group, count 1", () => {
    expect(dependenciesOf("(6.1000/6.1210), (18.03/18.06)", known, noGir, stats())).toEqual([
      { count: 1, options: ["6.1000", "6.1210"] },
      { count: 1, options: ["18.03", "18.06"] },
    ]);
  });

  test("a group that can be met by permission is dropped and counted", () => {
    const s = stats();
    expect(dependenciesOf("6.100A, (18.03/''permission of instructor'')", known, noGir, s)).toEqual([
      { count: 1, options: ["6.100A"] },
    ]);
    expect(s.freeTextGroups).toBe(1);
  });

  test("unknown subjects are dropped from a group, and an emptied group is dropped", () => {
    const s = stats();
    expect(dependenciesOf("(6.100A/9.999), 9.998", known, noGir, s)).toEqual([{ count: 1, options: ["6.100A"] }]);
    expect(s.unknownSubjects).toBe(2);
  });

  test("empty or missing -> none; unparsable -> none, and recorded", () => {
    expect(dependenciesOf(undefined, known, noGir, stats())).toEqual([]);
    expect(dependenciesOf("  ", known, noGir, stats())).toEqual([]);
    const s = stats();
    expect(dependenciesOf("(6.100A", known, noGir, s)).toEqual([]);
    expect(s.unparsed).toEqual(["(6.100A"]);
  });
});

const course = (fields: Partial<FireroadCourse> = {}): FireroadCourse => ({ subject_id: "6.1010", title: "T", ...fields });

describe("offeringOf", () => {
  test("relative to the academic year starting in FALL 2026", () => {
    expect(offeringOf(course({ is_historical: true }), 2026)).toBe("Not currently listed");
    expect(offeringOf(course({ not_offered_year: "2026-2027" }), 2026)).toBe("Not offered THIS year");
    expect(offeringOf(course({ not_offered_year: "2027-2028" }), 2026)).toBe("Not offered NEXT year");
    expect(offeringOf(course({ not_offered_year: "2021-2022" }), 2026)).toBe("Offered normally");
    expect(offeringOf(course(), 2026)).toBe("Offered normally");
  });
});

describe("unitsOf", () => {
  test("fixed units -> lecture-(lab+design)-preparation and the total", () => {
    expect(unitsOf(course({ total_units: 12, lecture_units: 3, lab_units: 2, design_units: 1, preparation_units: 6 })))
      .toEqual({ units: "3-3-6", totalUnits: 12 });
  });

  test("variable or zero units -> Arrange, and 12 assumed", () => {
    expect(unitsOf(course({ total_units: 12, is_variable_units: true }))).toEqual({ units: "Arrange", totalUnits: 12 });
    expect(unitsOf(course({ total_units: 0 }))).toEqual({ units: "Arrange", totalUnits: 12 });
  });
});

describe("scheduleOf", () => {
  test("the lecture is chosen over other sections, and repeated rooms or times appear once", () => {
    expect(scheduleOf("Lecture,26-100/TR/0/11-12.30;Recitation,34-304/WF/0/10,35-310/WF/0/11")).toEqual({
      meetingTimes: "TR11-12.30", location: "26-100",
    });
    expect(scheduleOf("Lecture,32-082/MW/0/9-10.30,32-082/MW/0/10.30-12")).toEqual({
      meetingTimes: "MW9-10.30, MW10.30-12", location: "32-082",
    });
  });

  test("no lecture -> the first kind of section; evening sections are marked", () => {
    expect(scheduleOf("Lab,4-402/T/1/7-10")).toEqual({ meetingTimes: "T7-10 PM", location: "4-402" });
  });

  test("empty -> nothing", () => {
    expect(scheduleOf(undefined)).toEqual({});
    expect(scheduleOf("")).toEqual({});
  });
});

describe("academicYearOf", () => {
  test("July to December is the fall of that year; January to June the spring of the next", () => {
    expect(academicYearOf(new Date(2026, 9, 20))).toBe(2026);
    expect(academicYearOf(new Date(2027, 1, 1))).toBe(2026);
    expect(academicYearOf(new Date(2027, 6, 1))).toBe(2027);
  });
});

describe("fromFireroad", () => {
  const raw: FireroadCourse[] = [
    {
      subject_id: "8.02", title: "Physics II", description: "Electromagnetism.", instructors: ["A. Prof"], level: "U",
      offered_fall: true, offered_spring: true, total_units: 12, lecture_units: 3, lab_units: 2, preparation_units: 7,
      prerequisites: "GIR:CAL1, GIR:PHY1", schedule: "Lecture,32-082/MW/0/9-10.30", rating: 5.38,
    },
    { subject_id: "18.01", title: "Calculus", level: "U", gir_attribute: "CAL1", offered_fall: true, total_units: 12 },
    { subject_id: "8.01", title: "Physics I", level: "U", gir_attribute: "PHY1", offered_fall: true, total_units: 12 },
    { subject_id: "18.01A", title: "Old Calculus", gir_attribute: "CAL1", is_historical: true, total_units: 12 },
    { subject_id: "1.015", title: "Robots", gir_attribute: "LAB2", total_units: 12, hass_attribute: undefined },
    { subject_id: "21M.301", title: "Harmony", level: "G", hass_attribute: "HASS-A", is_variable_units: true,
      description: "Can be repeated for credit.", prerequisites: "GIR:LAB" },
    { subject_id: "8.01", title: "Physics I (duplicate)", total_units: 12 },
  ];
  const { snapshot, stats } = fromFireroad(raw, { academicYear: 2026, id: "test" });
  const get = (id: string) => snapshot.courses.find((c) => c.subject === id)!;

  test("one course per subject, in subject order", () => {
    expect(snapshot.courses.map((c) => c.subject)).toEqual(["1.015", "8.01", "8.02", "18.01", "18.01A", "21M.301"]);
    expect(snapshot).toMatchObject({ id: "test", academicYear: 2026 });
  });

  test("a full course", () => {
    expect(get("8.02")).toEqual({
      subject: "8.02", name: "Physics II", courseId: "8.02", description: "Electromagnetism.", lecturer: "A. Prof",
      level: "Undergraduate", terms: ["FALL", "SPRING"], offering: "Offered normally", canBeRepeated: false,
      prerequisitesText: "GIR:CAL1, GIR:PHY1", corequisitesText: "", units: "3-2-7",
      meetingTimes: "MW9-10.30", location: "32-082",
      prerequisites: [{ count: 1, options: ["18.01"] }, { count: 1, options: ["8.01"] }],
      corequisites: [],
      rating: { classRating: 5.38, url: expect.stringContaining("subjectCode=8.02") },
      totalUnits: 12, technical: true,
    });
  });

  test("GIRs leave out historical subjects; GIR:LAB includes LAB2 subjects", () => {
    expect(get("21M.301").prerequisites).toEqual([{ count: 1, options: ["1.015"] }]);
  });

  test("missing attributes take defaults; HASS subjects are not technical", () => {
    expect(get("21M.301")).toMatchObject({
      lecturer: "Staff", level: "Graduate", units: "Arrange", totalUnits: 12, canBeRepeated: true, technical: false, terms: [],
    });
    expect(get("18.01A")).toMatchObject({ offering: "Not currently listed", level: "" });
    expect(get("18.01")).not.toHaveProperty("rating");
    expect(stats.unparsed).toEqual([]);
  });
});
