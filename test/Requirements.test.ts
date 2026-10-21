// Tests for the Requirements concept, written against design/concepts/Requirements.md.
//
// Run with: bun test test/Requirements.test.ts (needs MongoDB at MONGODB_URI)

import { beforeEach, describe, expect, test } from "bun:test";
import { RequirementsConcept, type RequirementItem, type RequirementList } from "../src/concepts/Requirements.ts";
import { refusalsOf, useFreshDb } from "./support.ts";

/*
 * Testing strategy
 *
 * load(snapshot)
 *   partition on snapshot: well formed; not JSON; missing id; an item whose parent is missing,
 *     in another list, or of the wrong kind; a BLOCK with too few options; a GROUP with a count
 *   partition on prior state: nothing loaded; loaded before (lists and items replaced);
 *     selections still valid / no longer valid
 * choose(road, choice, alternative)
 *   partition on choice: not an item, an item that is not a CHOICE, a CHOICE
 *   partition on alternative: a child, not a child
 *   partition on count: 1 (replaces), 2 (keeps the latest two); already chosen
 * forget(road)
 *   partition on selections: some, none; other roads keep theirs
 * _lists / _list
 *   partition: none loaded, majors and GIRs (majors first, numeric order), unknown list
 * _activeBlocks / _outline
 *   partition on choices: no selection (first count alternatives), a selection, nested choices
 *   partition on list: unknown, known; per road
 * _options: item with options, item without, unknown item
 */

const db = useFreshDb("requirements_test");
const expectRefusal = refusalsOf("Requirements");
let concept: RequirementsConcept;

beforeEach(() => {
  concept = new RequirementsConcept(db());
});

const list = (id: string, kind: "MAJOR" | "GIRS" = "MAJOR", shortTitle = id): RequirementList => ({
  id, title: `Title of ${id}`, shortTitle, mediumTitle: `${shortTitle} Major`, kind,
});

let order = 0;
const item = (key: string, kind: RequirementItem["kind"], fields: Partial<RequirementItem> = {}): RequirementItem => ({
  key,
  list: key.split("/")[0],
  parent: null,
  kind,
  title: key,
  count: kind === "GROUP" ? 0 : 1,
  options: [],
  approximate: false,
  technical: true,
  order: order++,
  ...fields,
});

// major1: a block, a note, and a track choice (pick 1 of 3); major2: a pick-2 choice with a nested pick-1 choice.
const MAJOR1 = [
  item("major1/1", "BLOCK", { title: "Core", options: ["A.1"] }),
  item("major1/2", "NOTE", { title: "2 history subjects", count: 2 }),
  item("major1/3", "CHOICE", { title: "Track" }),
  item("major1/3.1", "GROUP", { parent: "major1/3", title: "Theory" }),
  item("major1/3.1.1", "BLOCK", { parent: "major1/3.1", options: ["T.1", "T.2"], count: 2 }),
  item("major1/3.2", "GROUP", { parent: "major1/3", title: "Systems" }),
  item("major1/3.2.1", "BLOCK", { parent: "major1/3.2", options: ["S.1"] }),
  item("major1/3.3", "GROUP", { parent: "major1/3", title: "AI" }),
  item("major1/3.3.1", "BLOCK", { parent: "major1/3.3", options: ["I.1"] }),
];
const MAJOR2 = [
  item("major2/1", "CHOICE", { count: 2 }),
  item("major2/1.1", "GROUP", { parent: "major2/1" }),
  item("major2/1.1.1", "BLOCK", { parent: "major2/1.1", options: ["X.1"] }),
  item("major2/1.2", "GROUP", { parent: "major2/1" }),
  item("major2/1.2.1", "CHOICE", { parent: "major2/1.2" }),
  item("major2/1.2.1.1", "GROUP", { parent: "major2/1.2.1" }),
  item("major2/1.2.1.1.1", "BLOCK", { parent: "major2/1.2.1.1", options: ["Y.1"] }),
  item("major2/1.2.1.2", "GROUP", { parent: "major2/1.2.1" }),
  item("major2/1.2.1.2.1", "BLOCK", { parent: "major2/1.2.1.2", options: ["Y.2"] }),
  item("major2/1.3", "GROUP", { parent: "major2/1" }),
  item("major2/1.3.1", "BLOCK", { parent: "major2/1.3", options: ["Z.1"] }),
];
const GIRS = [item("girs/1", "BLOCK", { title: "Calculus", options: ["18.01", "18.01A"], technical: false })];

const snapshot = (id = "s1", lists = [list("major10", "MAJOR", "10"), list("major2", "MAJOR", "2"), list("major1", "MAJOR", "1"), list("girs", "GIRS", "GIRs")], items = [...MAJOR1, ...MAJOR2, ...GIRS]) =>
  JSON.stringify({ id, source: "test", lists, items });

const blocks = async (l: string, road: string) => (await concept._activeBlocks({ list: l, road })).map((b) => b.item);

describe("load", () => {
  test("covers: well formed -> lists and items, count of lists, snapshot id", async () => {
    expect(await concept._loadedSnapshot({})).toEqual({ found: false, id: "" });
    expect(await concept.load({ snapshot: snapshot() })).toEqual({ count: 4 });
    expect(await concept._loadedSnapshot({})).toEqual({ found: true, id: "s1" });
    expect((await concept._outline({ list: "major1", road: "r" })).map((o) => o.item)).toEqual(MAJOR1.map((i) => i.key));
  });

  test("covers: malformed snapshots -> LOAD_FAILED, nothing changes", async () => {
    await concept.load({ snapshot: snapshot() });
    const bad = [
      "not json",
      JSON.stringify({ lists: [], items: [] }),
      snapshot("x", [list("major1")], [item("major1/1", "BLOCK", { parent: "major1/0", options: ["A"] })]), // missing parent
      snapshot("x", [list("major1"), list("major2")], [item("major1/1", "GROUP"), item("major2/1", "BLOCK", { parent: "major1/1", options: ["A"] })]), // other list
      snapshot("x", [list("major1")], [item("major1/1", "CHOICE"), item("major1/1.1", "BLOCK", { parent: "major1/1", options: ["A"] })]), // choice holds a block
      snapshot("x", [list("major1")], [item("major1/1", "BLOCK", { count: 2, options: ["A"] })]), // too few options
      snapshot("x", [list("major1")], [item("major1/1", "GROUP", { count: 1 })]), // group with a count
    ];
    for (const s of bad) await expectRefusal("load", "LOAD_FAILED", concept.load({ snapshot: s }));
    expect(await concept._loadedSnapshot({})).toEqual({ found: true, id: "s1" });
  });

  test("covers: a reload replaces items, keeps valid selections and drops stale ones", async () => {
    await concept.load({ snapshot: snapshot() });
    await concept.choose({ road: "r", choice: "major1/3", alternative: "major1/3.2" });
    await concept.choose({ road: "r", choice: "major2/1", alternative: "major2/1.3" });
    // major2's choice is gone in the new form; major1's is unchanged.
    await concept.load({ snapshot: snapshot("s2", [list("major1"), list("major2")], [...MAJOR1, item("major2/1", "BLOCK", { options: ["X.1"] })]) });
    expect(await blocks("major1", "r")).toEqual(["major1/1", "major1/3.2.1"]);
    expect(await blocks("major2", "r")).toEqual(["major2/1"]);
    expect((await concept._lists({})).map((l) => l.list)).toEqual(["major1", "major2"]);
  });
});

describe("choose", () => {
  beforeEach(async () => {
    await concept.load({ snapshot: snapshot() });
  });

  test("covers: refusals", async () => {
    await expectRefusal("choose", "NO_SUCH_CHOICE", concept.choose({ road: "r", choice: "nope", alternative: "major1/3.1" }));
    await expectRefusal("choose", "NO_SUCH_CHOICE", concept.choose({ road: "r", choice: "major1/1", alternative: "major1/3.1" }));
    await expectRefusal("choose", "NOT_AN_ALTERNATIVE", concept.choose({ road: "r", choice: "major1/3", alternative: "major1/1" }));
    await expectRefusal("choose", "NOT_AN_ALTERNATIVE", concept.choose({ road: "r", choice: "major1/3", alternative: "major1/3.1.1" }));
  });

  test("covers: count 1 -> the new alternative replaces the old; per road", async () => {
    expect(await blocks("major1", "r")).toEqual(["major1/1", "major1/3.1.1"]); // first alternative by default
    expect(await concept.choose({ road: "r", choice: "major1/3", alternative: "major1/3.3" })).toEqual({});
    expect(await blocks("major1", "r")).toEqual(["major1/1", "major1/3.3.1"]);
    expect(await blocks("major1", "other")).toEqual(["major1/1", "major1/3.1.1"]);
  });

  test("covers: count 2 -> the latest two are kept; choosing a chosen one changes nothing", async () => {
    // Default: the first two alternatives, and the first alternative of the nested choice.
    expect(await blocks("major2", "r")).toEqual(["major2/1.1.1", "major2/1.2.1.1.1"]);
    await concept.choose({ road: "r", choice: "major2/1", alternative: "major2/1.3" });
    expect(await blocks("major2", "r")).toEqual(["major2/1.2.1.1.1", "major2/1.3.1"]);
    await concept.choose({ road: "r", choice: "major2/1", alternative: "major2/1.3" });
    expect(await blocks("major2", "r")).toEqual(["major2/1.2.1.1.1", "major2/1.3.1"]);
    await concept.choose({ road: "r", choice: "major2/1.2.1", alternative: "major2/1.2.1.2" });
    expect(await blocks("major2", "r")).toEqual(["major2/1.2.1.2.1", "major2/1.3.1"]);
  });
});

describe("forget", () => {
  test("covers: selections of the road go back to the defaults; other roads keep theirs; none to forget", async () => {
    await concept.load({ snapshot: snapshot() });
    expect(await concept.forget({ road: "r" })).toEqual({});
    await concept.choose({ road: "r", choice: "major1/3", alternative: "major1/3.2" });
    await concept.choose({ road: "s", choice: "major1/3", alternative: "major1/3.2" });
    await concept.forget({ road: "r" });
    expect(await blocks("major1", "r")).toEqual(["major1/1", "major1/3.1.1"]);
    expect(await blocks("major1", "s")).toEqual(["major1/1", "major1/3.2.1"]);
  });
});

describe("queries", () => {
  test("covers: _lists and _list before and after loading", async () => {
    expect(await concept._lists({})).toEqual([]);
    expect(await concept._list({ list: "major1" })).toEqual({ found: false, title: "", shortTitle: "", mediumTitle: "", kind: "MAJOR" });
    await concept.load({ snapshot: snapshot() });
    expect((await concept._lists({})).map((l) => l.shortTitle)).toEqual(["1", "2", "10", "GIRs"]);
    expect(await concept._list({ list: "girs" })).toEqual({ found: true, title: "Title of girs", shortTitle: "GIRs", mediumTitle: "GIRs Major", kind: "GIRS" });
  });

  test("covers: _activeBlocks fields; unknown list", async () => {
    await concept.load({ snapshot: snapshot() });
    expect(await concept._activeBlocks({ list: "girs", road: "r" })).toEqual([{ item: "girs/1", title: "Calculus", count: 1, technical: false }]);
    expect(await concept._activeBlocks({ list: "nope", road: "r" })).toEqual([]);
  });

  test("covers: _options of an item with options, without, and unknown", async () => {
    await concept.load({ snapshot: snapshot() });
    expect(await concept._options({ item: "girs/1" })).toEqual([{ subject: "18.01" }, { subject: "18.01A" }]);
    expect(await concept._options({ item: "major1/3" })).toEqual([]);
    expect(await concept._options({ item: "nope" })).toEqual([]);
  });

  test("covers: _outline depth, active and chosen, following the road's choice", async () => {
    await concept.load({ snapshot: snapshot() });
    await concept.choose({ road: "r", choice: "major1/3", alternative: "major1/3.2" });
    const rows = await concept._outline({ list: "major1", road: "r" });
    const row = (key: string) => rows.find((r) => r.item === key)!;
    expect(row("major1/2")).toEqual({
      item: "major1/2", parent: "", depth: 0, kind: "NOTE", title: "2 history subjects", count: 2, approximate: false, active: true, chosen: false,
    });
    expect([row("major1/3.1").chosen, row("major1/3.1").active, row("major1/3.1.1").active, row("major1/3.1.1").depth]).toEqual([false, false, false, 2]);
    expect([row("major1/3.2").chosen, row("major1/3.2").active, row("major1/3.2.1").active]).toEqual([true, true, true]);
    expect(row("major1/3.2.1").parent).toBe("major1/3.2");
    expect(await concept._outline({ list: "nope", road: "r" })).toEqual([]);
  });
});
