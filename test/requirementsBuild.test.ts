// Tests for turning Fireroad's requirement lists into a requirements snapshot
// (src/catalog/requirements.ts), following the table in the Requirements design.
//
// Run with: bun test test/requirementsBuild.test.ts   (no database needed)

import { describe, expect, test } from "bun:test";
import { indexCatalog, type FireroadCourse } from "../src/catalog/fireroad.ts";
import { BROAD, fromFireroadRequirements, isPlannedList, type FireroadRequirement } from "../src/catalog/requirements.ts";

/*
 * Testing strategy (one list per test, flattened with fromFireroadRequirements)
 *
 * partition on a node:
 *   subject leaf; renumbered or joint subject leaf; leaf not in the catalog; attribute leaf
 *   (with and without a count); free-text leaf (plain-string); "any" over subjects (with and
 *   without a threshold); "any" over subjects and small pairs; "any" over groups with no
 *   threshold (a choice); "any" over groups with a threshold (a union); distinct-threshold
 *   (a choice of categories); "all" (a heading); "all" whose threshold equals its children;
 *   "all" whose threshold is less than its children; "all" with optional children; units
 *   threshold; "at most" threshold; a block over BROAD options
 * partition on the list: a major (technical), the GIRs (not technical)
 * partition on keys and order: nested keys, depth-first order, parents before children
 */

const subjects = (ids: string[], extra: Partial<FireroadCourse> = {}): FireroadCourse[] =>
  ids.map((subject_id) => ({ subject_id, title: subject_id, ...extra }));

const CATALOG: FireroadCourse[] = [
  ...subjects(["A.1", "A.2", "A.3", "B.1", "B.2", "B.3", "C.1", "C.2"]),
  { subject_id: "N.1", title: "New", old_id: "O.1" },
  { subject_id: "J.1", title: "Joint", joint_subjects: ["J.2"] },
  { subject_id: "J.2", title: "Joint", joint_subjects: ["J.1"] },
  ...subjects(["CAL.1", "CAL.2"], { gir_attribute: "CAL1" }),
  ...Array.from({ length: BROAD + 1 }, (_, i): FireroadCourse => ({ subject_id: `H.${i}`, title: "H", hass_attribute: "HASS-H" })),
];
const index = indexCatalog(CATALOG);

function flatten(reqs: FireroadRequirement[], id = "majorX") {
  const { snapshot } = fromFireroadRequirements({ [id]: { title: "Test degree", "short-title": "X", reqs } }, index, { id: "test" });
  return snapshot.items.map(({ key, parent, kind, title, count, options, approximate, technical }) => ({
    key, parent, kind, title, count, options, approximate, technical,
  }));
}
const only = (reqs: FireroadRequirement[]) => {
  const items = flatten(reqs);
  expect(items).toHaveLength(1);
  return items[0];
};

describe("leaves", () => {
  test("a subject -> a block of one", () => {
    expect(only([{ req: "A.1" }])).toMatchObject({ kind: "BLOCK", count: 1, options: ["A.1"], title: "A.1", approximate: false });
  });

  test("an old number is the current subject; a joint subject is an option too", () => {
    expect(only([{ req: "O.1" }]).options).toEqual(["N.1"]);
    expect(only([{ req: "J.1" }]).options).toEqual(["J.1", "J.2"]);
  });

  test("a subject not in the catalog -> a note", () => {
    expect(only([{ req: "Z.9", title: "Gone" }])).toMatchObject({ kind: "NOTE", options: [] });
  });

  test("an attribute, with and without a count", () => {
    expect(only([{ req: "GIR:CAL1" }])).toMatchObject({ kind: "BLOCK", count: 1, options: ["CAL.1", "CAL.2"] });
    expect(only([{ req: "GIR:CAL1", threshold: { cutoff: 2, criterion: "subjects", type: "GTE" } }]))
      .toMatchObject({ kind: "BLOCK", count: 2 });
  });

  test("free text -> a note", () => {
    expect(only([{ req: "2 history subjects", "plain-string": true }])).toMatchObject({ kind: "NOTE", title: "2 history subjects", options: [] });
  });

  test(`more than ${BROAD} options -> a note that keeps them, not a block`, () => {
    const item = only([{ req: "HASS-H" }]);
    expect(item.kind).toBe("NOTE");
    expect(item.options).toHaveLength(BROAD + 1);
  });
});

describe("any", () => {
  test("over subjects -> one block; its threshold is the count", () => {
    expect(only([{ "connection-type": "any", title: "Math", reqs: [{ req: "A.1" }, { req: "A.2" }, { req: "A.3" }] }]))
      .toMatchObject({ kind: "BLOCK", title: "Math", count: 1, options: ["A.1", "A.2", "A.3"], approximate: false });
    expect(only([{ "connection-type": "any", threshold: { cutoff: 2, criterion: "subjects", type: "GTE" }, reqs: [{ req: "A.1" }, { req: "A.2" }, { req: "A.3" }] }]))
      .toMatchObject({ kind: "BLOCK", count: 2, title: "A.1 or A.2 or A.3" });
  });

  test("over subjects and a small pair -> one approximate block", () => {
    expect(only([{ "connection-type": "any", reqs: [{ req: "A.1" }, { "connection-type": "all", reqs: [{ req: "B.1" }, { req: "B.2" }] }] }]))
      .toMatchObject({ kind: "BLOCK", count: 1, options: ["A.1", "B.1", "B.2"], approximate: true });
  });

  test("over groups with no threshold -> a choice of groups, each an alternative", () => {
    const items = flatten([{
      "connection-type": "any", title: "Track",
      reqs: [
        { title: "Theory", "connection-type": "all", reqs: [{ req: "A.1" }, { req: "A.2" }] },
        { title: "Systems", "connection-type": "all", reqs: [{ req: "B.1" }, { req: "B.2" }] },
      ],
    }]);
    expect(items.map((i) => [i.key, i.parent, i.kind, i.title])).toEqual([
      ["majorX/1", null, "CHOICE", "Track"],
      ["majorX/1.1", "majorX/1", "GROUP", "Theory"],
      ["majorX/1.1.1", "majorX/1.1", "BLOCK", "A.1"],
      ["majorX/1.1.2", "majorX/1.1", "BLOCK", "A.2"],
      ["majorX/1.2", "majorX/1", "GROUP", "Systems"],
      ["majorX/1.2.1", "majorX/1.2", "BLOCK", "B.1"],
      ["majorX/1.2.2", "majorX/1.2", "BLOCK", "B.2"],
    ]);
    expect(items[0].count).toBe(1);
  });

  test("over groups with a threshold of several subjects -> their union, approximate", () => {
    expect(only([{
      "connection-type": "any", title: "Two from anywhere", threshold: { cutoff: 2, criterion: "subjects", type: "GTE" },
      reqs: [{ title: "G1", "connection-type": "all", reqs: [{ req: "A.1" }, { req: "A.2" }] }, { title: "G2", reqs: [{ req: "B.1" }] }],
    }])).toMatchObject({ kind: "BLOCK", count: 2, options: ["A.1", "A.2", "B.1"], approximate: true });
  });
});

describe("distinct-threshold", () => {
  test("pick categories -> a choice whose count is the number of categories; an optional category means one subject", () => {
    const items = flatten([{
      title: "Areas", "distinct-threshold": { cutoff: 2, criterion: "subjects", type: "GTE" },
      reqs: [
        { title: "Fluids", req: "A.1", threshold: { cutoff: 0, criterion: "subjects", type: "GTE" } },
        { title: "Structures", "connection-type": "any", threshold: { cutoff: 2, criterion: "subjects", type: "GTE" }, reqs: [{ req: "B.1" }, { req: "B.2" }, { req: "B.3" }] },
        { title: "Control", req: "C.1" },
      ],
    }]);
    expect(items[0]).toMatchObject({ kind: "CHOICE", count: 2, title: "Areas" });
    const blocks = items.filter((i) => i.kind === "BLOCK");
    expect(blocks.map((b) => [b.title, b.count])).toEqual([["Fluids", 1], ["Structures", 2], ["Control", 1]]);
    expect(items.filter((i) => i.parent === items[0].key).every((i) => i.kind === "GROUP")).toBe(true);
  });
});

describe("all", () => {
  test("no threshold -> a heading with each child inside", () => {
    const items = flatten([{ title: "Core", "connection-type": "all", reqs: [{ req: "A.1" }, { "connection-type": "any", reqs: [{ req: "B.1" }, { req: "B.2" }] }] }]);
    expect(items.map((i) => [i.kind, i.parent, i.title])).toEqual([
      ["GROUP", null, "Core"],
      ["BLOCK", "majorX/1", "A.1"],
      ["BLOCK", "majorX/1", "B.1 or B.2"],
    ]);
  });

  test("a threshold equal to what its children ask -> the children", () => {
    const items = flatten([{
      title: "Both", "connection-type": "all", threshold: { cutoff: 2, criterion: "subjects", type: "GTE" },
      reqs: [{ "connection-type": "any", reqs: [{ req: "A.1" }, { req: "A.2" }] }, { "connection-type": "any", reqs: [{ req: "B.1" }, { req: "B.2" }] }],
    }]);
    expect(items.filter((i) => i.kind === "BLOCK")).toHaveLength(2);
  });

  test("a threshold below what its children ask, or optional children -> one block of their union", () => {
    expect(only([{
      title: "Two of these", "connection-type": "all", threshold: { cutoff: 2, criterion: "subjects", type: "GTE" },
      reqs: [{ req: "A.1" }, { req: "A.2" }, { req: "A.3" }],
    }])).toMatchObject({ kind: "BLOCK", count: 2, options: ["A.1", "A.2", "A.3"], approximate: false });
    expect(only([{
      title: "Some", "connection-type": "all", threshold: { cutoff: 1, criterion: "subjects", type: "GTE" },
      reqs: [{ req: "A.1", threshold: { cutoff: 0, criterion: "subjects", type: "GTE" } }, { req: "A.2", threshold: { cutoff: 0, criterion: "subjects", type: "GTE" } }],
    }])).toMatchObject({ kind: "BLOCK", count: 1, options: ["A.1", "A.2"] });
  });

  test("a units threshold -> subjects of 12 units, approximate", () => {
    expect(only([{
      title: "Electives", "connection-type": "any", threshold: { cutoff: 30, criterion: "units", type: "GTE" },
      reqs: [{ req: "A.1" }, { req: "A.2" }, { req: "A.3" }, { req: "B.1" }],
    }])).toMatchObject({ kind: "BLOCK", count: 3, approximate: true });
  });

  test("an 'at most' threshold -> a note", () => {
    expect(only([{ title: "Limit", "connection-type": "any", threshold: { cutoff: 1, criterion: "subjects", type: "LTE" }, reqs: [{ req: "A.1" }] }]))
      .toMatchObject({ kind: "NOTE" });
  });
});

describe("lists", () => {
  test("majors are technical and the GIRs are not; only majors and the GIRs are planned", () => {
    expect(flatten([{ req: "A.1" }], "majorX")[0].technical).toBe(true);
    expect(flatten([{ req: "A.1" }], "girs")[0].technical).toBe(false);
    expect(["major6-3", "girs", "minor21M", "master6"].filter(isPlannedList)).toEqual(["major6-3", "girs"]);
  });

  test("list titles and kinds", () => {
    const { snapshot } = fromFireroadRequirements(
      {
        major6: { title: "Bachelor of Science in X", "short-title": "6", "medium-title": "6 Major", reqs: [] },
        girs: { title: "General Institute Requirements", reqs: [] },
      },
      index,
      { id: "test" },
    );
    expect(snapshot.lists).toEqual([
      { id: "girs", title: "General Institute Requirements", shortTitle: "girs", mediumTitle: "girs", kind: "GIRS" },
      { id: "major6", title: "Bachelor of Science in X", shortTitle: "6", mediumTitle: "6 Major", kind: "MAJOR" },
    ]);
  });
});
