/**
 * Tests for the TimeBudget concept, written from TimeBudget.md (the spec), not from TimeBudget.ts.
 * Refusals are checked by the code and sentence the spec declares for each action.
 *
 * Run with: bun test test/TimeBudget.test.ts (needs MongoDB at MONGODB_URI)
 *
 * =====================================================================================
 * TESTING STRATEGY (partitions)
 * =====================================================================================
 *
 * ---- slot math (covers) ----
 *   block: inside a day / past midnight / past the end of Sunday into Monday / 1 slot / 671 slots
 *
 * ---- ensureDefault / override / resetToDefault ----
 *   default: none / exists (same template returned); override: none / exists / no default
 *   override is a copy: changing it leaves the default alone; reset goes back to the default
 *
 * ---- addBlock / setBlock / removeBlock ----
 *   template: own / another user's / missing; category: system / own / another user's / managed
 *   slot: valid / day, start or length out of range or not whole
 *   overlap: none / with another block / across midnight / with itself when moved
 *
 * ---- categories ----
 *   name: new / empty / taken (system, own, ignoring case) / renamed to its own name
 *   owner: own / system / another user's; delete removes its blocks
 *
 * ---- settings ----
 *   buffer: default 10 / 0 / 50 / below / above; factor: default 2 / 2 / 3 / outside
 *   subject factor: set / replace / clear / clear missing
 *   road settings: defaults / mode / buffer and clearing it / share mode / bad values / forgetRoad
 *
 * ---- queries ----
 *   _rollup: hours per category per day, a block past midnight split across days
 *   _blocked: blocked + free = 168; the default week is 12 hours a day
 */

import { beforeEach, describe, expect, it } from "bun:test";
import { covers, TimeBudgetConcept } from "../src/concepts/TimeBudget.ts";
import { refusalsOf, useFreshDb } from "./support.ts";

const freshDb = useFreshDb("timebudget_test");
const expectRefusal = refusalsOf("TimeBudget");
const SLEEP = "system:sleep";
const WORK = "system:work";
const CLASS = "system:class";

let t: TimeBudgetConcept;
beforeEach(() => {
  t = new TimeBudgetConcept(freshDb());
});

/** An empty override to paint on: a copy of a default with its blocks removed. */
async function emptyWeek(user = "u") {
  await t.ensureDefault({ user });
  const { template } = await t.override({ user, year: 2027, term: "SPRING" });
  for (const b of await t._blocks({ template })) await t.removeBlock({ user, block: b.block });
  return template;
}

describe("slot math", () => {
  it("covers blocks inside a day, past midnight and past the end of the week", () => {
    expect(covers(0, 36, 4)).toEqual([36, 37, 38, 39]); // Monday 9:00 to 10:00
    expect(covers(0, 92, 8)).toEqual([92, 93, 94, 95, 96, 97, 98, 99]); // Monday 23:00 to Tuesday 1:00
    expect(covers(6, 94, 4)).toEqual([670, 671, 0, 1]); // Sunday 23:30 to Monday 0:30
    expect(covers(3, 0, 1)).toEqual([288]);
    expect(covers(0, 0, 671)).toHaveLength(671);
  });
});

describe("templates", () => {
  it("covers the default week: sleep, personal care and meals, 12 hours a day", async () => {
    const { template } = await t.ensureDefault({ user: "u" });
    expect(await t.ensureDefault({ user: "u" })).toEqual({ template });
    expect(await t._default({ user: "u" })).toEqual([{ template }]);
    expect(await t._blocked({ template })).toEqual({ blocked: 84, free: 84 });
    const rollup = await t._rollup({ template });
    const perWeek = (category: string) => rollup.filter((r) => r.category === category).reduce((n, r) => n + r.hours, 0);
    expect(perWeek(SLEEP)).toBe(56);
    expect(perWeek("system:care")).toBe(7);
    expect(perWeek("system:eating")).toBe(21);
    // Sleep from 23:00 counts 1 hour on Monday (and 7 on Tuesday, from Monday night).
    expect(rollup.find((r) => r.category === SLEEP && r.day === 0)?.hours).toBe(8);
    expect(rollup.find((r) => r.category === SLEEP && r.day === 1)?.hours).toBe(8);
  });

  it("covers overriding a season with a copy, and resetting it", async () => {
    await expectRefusal("override", "NO_DEFAULT", t.override({ user: "u", year: 2027, term: "SPRING" }));
    const { template: base } = await t.ensureDefault({ user: "u" });
    const { template } = await t.override({ user: "u", year: 2027, term: "SPRING" });
    expect(template).not.toBe(base);
    expect(await t.override({ user: "u", year: 2027, term: "SPRING" })).toEqual({ template });
    expect(await t._blocks({ template })).toHaveLength(35);
    expect(await t._templateFor({ user: "u", year: 2027, term: "SPRING" })).toEqual([{ template, overridden: true }]);
    expect(await t._templateFor({ user: "u", year: 2027, term: "FALL" })).toEqual([{ template: base, overridden: false }]);
    const [first] = await t._blocks({ template });
    await t.removeBlock({ user: "u", block: first!.block });
    expect(await t._blocks({ template: base })).toHaveLength(35); // the default is untouched
    await t.override({ user: "u", year: 2026, term: "FALL" });
    expect((await t._overrides({ user: "u" })).map((o) => `${o.term} ${o.year}`)).toEqual(["FALL 2026", "SPRING 2027"]);
    await t.resetToDefault({ user: "u", year: 2027, term: "SPRING" });
    expect(await t._blocks({ template })).toEqual([]);
    expect(await t._templateFor({ user: "u", year: 2027, term: "SPRING" })).toEqual([{ template: base, overridden: false }]);
    await expectRefusal("resetToDefault", "NOT_OVERRIDDEN", t.resetToDefault({ user: "u", year: 2027, term: "SPRING" }));
  });

  it("covers a user with no template", async () => {
    expect(await t._default({ user: "x" })).toEqual([]);
    expect(await t._templateFor({ user: "x", year: 2027, term: "SPRING" })).toEqual([]);
    expect(await t._blocked({ template: "nope" })).toEqual({ blocked: 0, free: 168 });
    expect(await t._blocks({ template: "nope" })).toEqual([]);
  });
});

describe("blocks", () => {
  it("covers painting, moving, resizing and removing", async () => {
    const template = await emptyWeek();
    const { block } = await t.addBlock({ user: "u", template, category: WORK, day: 5, start: 36, length: 16 });
    expect(await t._blocks({ template })).toEqual([{ block, category: WORK, day: 5, start: 36, length: 16 }]);
    await t.setBlock({ user: "u", block, category: WORK, day: 5, start: 32, length: 24 });
    expect(await t._blocked({ template })).toEqual({ blocked: 6, free: 162 });
    await t.removeBlock({ user: "u", block });
    expect(await t._blocks({ template })).toEqual([]);
    await expectRefusal("removeBlock", "NO_SUCH_BLOCK", t.removeBlock({ user: "u", block }));
  });

  it("covers overlaps, also across midnight, and a block moved over itself", async () => {
    const template = await emptyWeek();
    const { block } = await t.addBlock({ user: "u", template, category: SLEEP, day: 6, start: 92, length: 32 }); // Sun 23:00 to Mon 7:00
    await expectRefusal("addBlock", "OVERLAP",
      t.addBlock({ user: "u", template, category: WORK, day: 0, start: 24, length: 4 })); // Mon 6:00
    await t.addBlock({ user: "u", template, category: WORK, day: 0, start: 28, length: 4 }); // Mon 7:00, just after
    await t.setBlock({ user: "u", block, category: SLEEP, day: 6, start: 88, length: 36 }); // overlaps only itself
    await expectRefusal("setBlock", "OVERLAP", t.setBlock({ user: "u", block, category: SLEEP, day: 6, start: 88, length: 37 }));
    const rollup = await t._rollup({ template });
    expect(rollup.filter((r) => r.category === SLEEP)).toEqual([
      { category: SLEEP, day: 0, hours: 7 },
      { category: SLEEP, day: 6, hours: 2 },
    ]);
  });

  it("covers slots out of range", async () => {
    const template = await emptyWeek();
    for (const [day, start, length] of [[7, 0, 1], [-1, 0, 1], [0, 96, 1], [0, 0, 0], [0, 0, 672], [0, 1.5, 4], [0.5, 0, 4]]) {
      await expectRefusal("addBlock", "BAD_SLOT", t.addBlock({ user: "u", template, category: WORK, day: day!, start: start!, length: length! }));
    }
  });

  it("covers whose template and category it is, and the managed category", async () => {
    const template = await emptyWeek();
    const mine = await emptyWeek("v");
    await expectRefusal("addBlock", "NO_SUCH_TEMPLATE", t.addBlock({ user: "u", template: mine, category: WORK, day: 0, start: 0, length: 1 }));
    await expectRefusal("addBlock", "NO_SUCH_TEMPLATE", t.addBlock({ user: "u", template: "nope", category: WORK, day: 0, start: 0, length: 1 }));
    const { category } = await t.addCategory({ user: "v", name: "Rowing", color: "#123456" });
    await expectRefusal("addBlock", "NO_SUCH_CATEGORY", t.addBlock({ user: "u", template, category, day: 0, start: 0, length: 1 }));
    await expectRefusal("addBlock", "MANAGED_CATEGORY", t.addBlock({ user: "u", template, category: CLASS, day: 0, start: 0, length: 1 }));
    const { block } = await t.addBlock({ user: "v", template: mine, category, day: 0, start: 0, length: 1 });
    await expectRefusal("setBlock", "NO_SUCH_BLOCK", t.setBlock({ user: "u", block, category: WORK, day: 0, start: 0, length: 1 }));
    await expectRefusal("setBlock", "MANAGED_CATEGORY", t.setBlock({ user: "v", block, category: CLASS, day: 0, start: 0, length: 1 }));
    await expectRefusal("setBlock", "BAD_SLOT", t.setBlock({ user: "v", block, category, day: 0, start: 0, length: 0 }));
    await expectRefusal("removeBlock", "NO_SUCH_BLOCK", t.removeBlock({ user: "u", block }));
  });
});

describe("categories", () => {
  it("covers the system categories first, then the user's own", async () => {
    const { category } = await t.addCategory({ user: "u", name: "Rowing", color: "#123456" });
    await t.addCategory({ user: "u", name: "Band", color: "#654321" });
    const all = await t._categories({ user: "u" });
    expect(all.slice(0, 3).map((c) => c.name)).toEqual(["Sleep", "Personal care", "Eating (including preparation)"]);
    expect(all.find((c) => c.category === CLASS)).toMatchObject({ name: "In class", own: false, managed: true });
    expect(all.slice(-2)).toEqual([
      expect.objectContaining({ name: "Band", own: true, managed: false }),
      { category, name: "Rowing", color: "#123456", own: true, managed: false },
    ]);
    expect(await t._categories({ user: "v" })).toHaveLength(16);
  });

  it("covers names: empty, taken (ignoring case) and renaming", async () => {
    await expectRefusal("addCategory", "EMPTY_NAME", t.addCategory({ user: "u", name: "  ", color: "#000" }));
    await expectRefusal("addCategory", "NAME_TAKEN", t.addCategory({ user: "u", name: "sleep", color: "#000" }));
    const { category } = await t.addCategory({ user: "u", name: "Rowing", color: "#000" });
    await expectRefusal("addCategory", "NAME_TAKEN", t.addCategory({ user: "u", name: "ROWING", color: "#000" }));
    await t.addCategory({ user: "v", name: "Rowing", color: "#000" }); // another user's names are theirs
    await t.renameCategory({ user: "u", category, name: "rowing" }); // its own name, in another case
    await expectRefusal("renameCategory", "NAME_TAKEN", t.renameCategory({ user: "u", category, name: "Work" }));
    await expectRefusal("renameCategory", "EMPTY_NAME", t.renameCategory({ user: "u", category, name: "" }));
    await t.recolorCategory({ user: "u", category, color: "#fff" });
    expect((await t._categories({ user: "u" })).at(-1)).toMatchObject({ name: "rowing", color: "#fff" });
  });

  it("covers system and other users' categories, and deleting with blocks", async () => {
    await expectRefusal("renameCategory", "NOT_YOUR_CATEGORY", t.renameCategory({ user: "u", category: SLEEP, name: "Nap" }));
    await expectRefusal("recolorCategory", "NOT_YOUR_CATEGORY", t.recolorCategory({ user: "u", category: SLEEP, color: "#000" }));
    await expectRefusal("deleteCategory", "NOT_YOUR_CATEGORY", t.deleteCategory({ user: "u", category: SLEEP }));
    const { category } = await t.addCategory({ user: "v", name: "Therapy", color: "#000" });
    await expectRefusal("deleteCategory", "NOT_YOUR_CATEGORY", t.deleteCategory({ user: "u", category }));
    const template = await emptyWeek("v");
    await t.addBlock({ user: "v", template, category, day: 2, start: 64, length: 4 });
    await t.deleteCategory({ user: "v", category });
    expect(await t._blocks({ template })).toEqual([]);
  });
});

describe("settings", () => {
  it("covers the buffer and factor, with their defaults and ranges", async () => {
    expect(await t._settings({ user: "u" })).toEqual({ buffer: 10, factor: 2 });
    await t.setBuffer({ user: "u", buffer: 0 });
    expect(await t._settings({ user: "u" })).toEqual({ buffer: 0, factor: 2 });
    await t.setFactor({ user: "u", factor: 3 });
    await t.setBuffer({ user: "u", buffer: 50 });
    expect(await t._settings({ user: "u" })).toEqual({ buffer: 50, factor: 3 });
    await t.setFactor({ user: "v", factor: 2.5 });
    expect(await t._settings({ user: "v" })).toEqual({ buffer: 10, factor: 2.5 });
    await expectRefusal("setBuffer", "BAD_BUFFER", t.setBuffer({ user: "u", buffer: -1 }));
    await expectRefusal("setBuffer", "BAD_BUFFER", t.setBuffer({ user: "u", buffer: 51 }));
    await expectRefusal("setFactor", "BAD_FACTOR", t.setFactor({ user: "u", factor: 1.9 }));
    await expectRefusal("setFactor", "BAD_FACTOR", t.setFactor({ user: "u", factor: 3.1 }));
  });

  it("covers factors per subject", async () => {
    await t.setSubjectFactor({ user: "u", subject: "6.1210", factor: 3 });
    await t.setSubjectFactor({ user: "u", subject: "18.06", factor: 2.5 });
    await t.setSubjectFactor({ user: "u", subject: "6.1210", factor: 2.75 });
    expect(await t._subjectFactors({ user: "u" })).toEqual([{ subject: "18.06", factor: 2.5 }, { subject: "6.1210", factor: 2.75 }]);
    await t.clearSubjectFactor({ user: "u", subject: "18.06" });
    await expectRefusal("clearSubjectFactor", "NO_SUBJECT_FACTOR", t.clearSubjectFactor({ user: "u", subject: "18.06" }));
    await expectRefusal("setSubjectFactor", "BAD_FACTOR", t.setSubjectFactor({ user: "u", subject: "18.06", factor: 4 }));
    expect(await t._subjectFactors({ user: "v" })).toEqual([]);
  });

  it("covers road settings: defaults, each change, bad values and forgetting", async () => {
    expect(await t._roadSettings({ road: "r" })).toEqual({ mode: "SOFT", hasBuffer: false, buffer: 0, shareMode: "METRICS" });
    await t.setMode({ road: "r", mode: "HARD" });
    expect(await t._roadSettings({ road: "r" })).toEqual({ mode: "HARD", hasBuffer: false, buffer: 0, shareMode: "METRICS" });
    await t.setRoadBuffer({ road: "r", buffer: 20 });
    await t.setShareMode({ road: "r", shareMode: "DETAILS" });
    expect(await t._roadSettings({ road: "r" })).toEqual({ mode: "HARD", hasBuffer: true, buffer: 20, shareMode: "DETAILS" });
    await t.clearRoadBuffer({ road: "r" });
    expect((await t._roadSettings({ road: "r" })).hasBuffer).toBe(false);
    await t.clearRoadBuffer({ road: "other" });
    await t.setShareMode({ road: "s", shareMode: "DETAILS" });
    expect(await t._roadSettings({ road: "s" })).toEqual({ mode: "SOFT", hasBuffer: false, buffer: 0, shareMode: "DETAILS" });
    await expectRefusal("setMode", "BAD_MODE", t.setMode({ road: "r", mode: "FIRM" }));
    await expectRefusal("setShareMode", "BAD_SHARE_MODE", t.setShareMode({ road: "r", shareMode: "ALL" }));
    await expectRefusal("setRoadBuffer", "BAD_BUFFER", t.setRoadBuffer({ road: "r", buffer: 60 }));
    await t.forgetRoad({ road: "r" });
    expect(await t._roadSettings({ road: "r" })).toEqual({ mode: "SOFT", hasBuffer: false, buffer: 0, shareMode: "METRICS" });
  });
});
