// Tests for the Weekly time budget part of the BFSThisMess composition
// (design/compositions/BFSThisMess.md), through the assembled application and a local
// client, written from the design. The local client answers refusal codes; over HTTP each
// becomes its category (src/http.ts).
//
// Run with: bun test test/week.test.ts (needs MongoDB at MONGODB_URI)

import { beforeEach, describe, expect, test } from "bun:test";
import { createLocalClient } from "@mit-sdg/sync-engine/client";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import type { BFSThisMessWire } from "../generated/wire.ts";
import { assembleApplication } from "../src/assembly.ts";
import { useFreshDb } from "./support.ts";

/*
 * Testing strategy
 *
 * ViewWeek: first time (the default week is made) / again (the same week)
 * Semester weeks: none (the regular week) / overridden (its own copy) / reset
 * Blocks: painted, moved, resized, removed; past midnight (hours split across days);
 *   overlapping (OVERLAP, nothing changes); the managed In class (MANAGED_CATEGORY)
 * Reconciliation: blocked + free = 168, and the rollup adds up to blocked
 * Categories: add, rename, recolor, delete (its blocks go); a system one (NOT_YOUR_CATEGORY);
 *   a name taken (NAME_TAKEN)
 * Privacy: another person's week, block or category is refused as not there or not theirs
 * Sessions: none (NO_SUCH_SESSION)
 */

const db = useFreshDb("week_test");
type Client = ReturnType<typeof createLocalClient<BFSThisMessWire>>;
let api: Client["bfsthismess"];

beforeEach(() => {
  const application = assembleApplication(db(), () => new Date(2026, 9, 26));
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

const at = (hour: number, minute = 0) => hour * 4 + minute / 15;
const perWeek = (rollup: { category: string; hours: number }[], category: string) =>
  rollup.filter((r) => r.category === category).reduce((n, r) => n + r.hours, 0);

describe("the regular week", () => {
  test("is made with the worksheet's defaults the first time, and stays the same", async () => {
    const s = await signUp("omar");
    const first = value(await api.viewWeek({ session: s }));
    expect(first.week).toMatchObject({ blocked: 84, free: 84 });
    expect(perWeek(first.week.rollup, "system:sleep")).toBe(56);
    expect(first.setup).toMatchObject({ currentYear: 2026, currentTerm: "FALL", overrides: [] });
    expect(first.setup.categories.find((c) => c.category === "system:class")).toMatchObject({ managed: true });
    const again = value(await api.viewWeek({ session: s }));
    expect(again.week.template).toBe(first.week.template);
  });

  test("blocks: painted, past midnight, moved, resized, removed; totals reconcile to 168", async () => {
    const s = await signUp("omar");
    const { template } = value(await api.viewWeek({ session: s })).week;
    // Work Saturday 13:00-17:00, then a late study group Sunday 23:00, when the sleep block is.
    const { block } = value(await api.addTimeBlock({ session: s, template, category: "system:work", day: 5, start: at(13), slots: 16 }));
    expect(refusal(await api.addTimeBlock({ session: s, template, category: "system:social", day: 6, start: at(23), slots: 4 })))
      .toBe("OVERLAP");
    value(await api.setTimeBlock({ session: s, block, category: "system:work", day: 5, start: at(13), slots: 20 }));
    let week = value(await api.viewWeek({ session: s })).week;
    expect(week.blocked + week.free).toBe(168);
    expect(week.rollup.reduce((n, r) => n + r.hours, 0)).toBe(week.blocked);
    expect(week.blocked).toBe(84 + 5);
    // Sleep from 23:00 to 7:00 counts 1 hour on Sunday and 7 on Monday.
    expect(week.rollup.filter((r) => r.category === "system:sleep" && (r.day === 0 || r.day === 6)))
      .toEqual([{ category: "system:sleep", day: 0, hours: 8 }, { category: "system:sleep", day: 6, hours: 8 }]);
    value(await api.removeTimeBlock({ session: s, block }));
    week = value(await api.viewWeek({ session: s })).week;
    expect(week.blocked).toBe(84);
    expect(refusal(await api.addTimeBlock({ session: s, template, category: "system:class", day: 0, start: at(10), slots: 4 })))
      .toBe("MANAGED_CATEGORY");
    expect(refusal(await api.addTimeBlock({ session: s, template, category: "system:work", day: 0, start: 96, slots: 4 })))
      .toBe("BAD_SLOT");
  });
});

describe("semester weeks", () => {
  test("use the regular week until overridden, then their own copy, until reset", async () => {
    const s = await signUp("omar");
    const regular = value(await api.viewWeek({ session: s })).week.template;
    let spring = value(await api.viewSemesterWeek({ session: s, year: 2027, term: "SPRING" })).week;
    expect(spring).toMatchObject({ overridden: false, template: regular });
    const { template } = value(await api.overrideWeek({ session: s, year: 2027, term: "SPRING" }));
    value(await api.addTimeBlock({ session: s, template, category: "system:work", day: 1, start: at(14), slots: 12 }));
    spring = value(await api.viewSemesterWeek({ session: s, year: 2027, term: "SPRING" })).week;
    expect(spring).toMatchObject({ overridden: true, template, blocked: 87 });
    expect(value(await api.viewWeek({ session: s })).week.blocked).toBe(84);
    expect(value(await api.viewWeek({ session: s })).setup.overrides).toEqual([{ year: 2027, term: "SPRING", template }]);
    value(await api.resetWeek({ session: s, year: 2027, term: "SPRING" }));
    expect(value(await api.viewSemesterWeek({ session: s, year: 2027, term: "SPRING" })).week).toMatchObject({ overridden: false, blocked: 84 });
    expect(refusal(await api.resetWeek({ session: s, year: 2027, term: "SPRING" }))).toBe("NOT_OVERRIDDEN");
  });

  test("a semester asked for before the regular week exists still has one", async () => {
    const s = await signUp("omar");
    expect(value(await api.viewSemesterWeek({ session: s, year: 2027, term: "FALL" })).week).toMatchObject({ overridden: false, blocked: 84 });
  });
});

describe("categories", () => {
  test("own ones are added, renamed, recolored and deleted with their blocks; system ones are fixed", async () => {
    const s = await signUp("omar");
    const { template } = value(await api.viewWeek({ session: s })).week;
    const { category } = value(await api.addCategory({ session: s, name: "Crew", color: "#0b7a75" }));
    value(await api.addTimeBlock({ session: s, template, category, day: 0, start: at(19, 30), slots: 8 }));
    expect(refusal(await api.addCategory({ session: s, name: "crew", color: "#000" }))).toBe("NAME_TAKEN");
    value(await api.renameCategory({ session: s, category, name: "Rowing" }));
    value(await api.recolorCategory({ session: s, category, color: "#123456" }));
    let { setup, week } = value(await api.viewWeek({ session: s }));
    expect(setup.categories.at(-1)).toEqual({ category, name: "Rowing", color: "#123456", own: true, managed: false });
    expect(perWeek(week.rollup, category)).toBe(2);
    expect(refusal(await api.renameCategory({ session: s, category: "system:sleep", name: "Nap" }))).toBe("NOT_YOUR_CATEGORY");
    value(await api.deleteCategory({ session: s, category }));
    ({ setup, week } = value(await api.viewWeek({ session: s })));
    expect(setup.categories.some((c) => c.category === category)).toBe(false);
    expect(week.blocked).toBe(84);
  });
});

describe("privacy and sessions", () => {
  test("another person's week, blocks and categories cannot be used", async () => {
    const omar = await signUp("omar");
    const ada = await signUp("ada");
    const { template, blocks } = value(await api.viewWeek({ session: omar })).week;
    const { category } = value(await api.addCategory({ session: omar, name: "Therapy", color: "#000" }));
    expect(refusal(await api.addTimeBlock({ session: ada, template, category: "system:work", day: 2, start: at(14), slots: 4 })))
      .toBe("NO_SUCH_TEMPLATE");
    expect(refusal(await api.setTimeBlock({ session: ada, block: blocks[0]!.block, category: "system:work", day: 2, start: at(14), slots: 4 })))
      .toBe("NO_SUCH_BLOCK");
    expect(refusal(await api.removeTimeBlock({ session: ada, block: blocks[0]!.block }))).toBe("NO_SUCH_BLOCK");
    expect(refusal(await api.renameCategory({ session: ada, category, name: "x" }))).toBe("NOT_YOUR_CATEGORY");
    const adaWeek = value(await api.viewWeek({ session: ada }));
    expect(adaWeek.setup.categories.some((c) => c.name === "Therapy")).toBe(false);
    const adaTemplate = adaWeek.week.template;
    expect(refusal(await api.addTimeBlock({ session: ada, template: adaTemplate, category, day: 2, start: at(14), slots: 4 })))
      .toBe("NO_SUCH_CATEGORY");
  });

  test("requests without a session", async () => {
    for (const r of [
      await api.viewWeek({ session: "x" }),
      await api.viewSemesterWeek({ session: "x", year: 2027, term: "SPRING" }),
      await api.overrideWeek({ session: "x", year: 2027, term: "SPRING" }),
      await api.addTimeBlock({ session: "x", template: "t", category: "system:work", day: 0, start: 0, slots: 1 }),
      await api.addCategory({ session: "x", name: "A", color: "#000" }),
    ]) expect(refusal(r)).toBe("NO_SUCH_SESSION");
  });
});
