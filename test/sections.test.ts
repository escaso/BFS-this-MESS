// Tests for the section picker (src/concepts/sections.ts), written from pick in
// design/concepts/TimeBudget.md.
//
// Run with: bun test test/sections.test.ts
//
// Testing strategy
//   a conflict-free pick: exists (found) / exists only for a later section (found) /
//     needs every part to give way (found)
//   none exists: the fewest conflicts, with each conflict listed
//   conflicts with: a block / another class / two blocks at once / a part of the same class
//   hand picks: kept even when they conflict; the rest fit around them
//   order: deterministic, and ties go to the earlier section
//   the cap: steps used up -> the best so far, complete false
//   nothing to pick: no parts / a part with no sections

import { describe, expect, test } from "bun:test";
import { pickSections, type BlockedSlots, type PartToPick } from "../src/concepts/sections.ts";

const at = (hour: number, minute = 0) => hour * 4 + minute / 15;
const m = (day: number, hour: number, hours: number) => ({ day, start: at(hour), slots: hours * 4 });
const section = (...meetings: ReturnType<typeof m>[]) => ({ room: "1-1", meetings });

/** The week with these blocks: [block id, category, day, from hour, hours]. */
function week(...blocks: [string, string, number, number, number][]): BlockedSlots {
  const slots: BlockedSlots = Array(672).fill(undefined);
  for (const [block, category, day, from, hours] of blocks) {
    for (let s = at(from); s < at(from) + hours * 4; s++) slots[day * 96 + s] = { block, category };
  }
  return slots;
}

describe("pickSections", () => {
  test("finds a pick with no conflicts when there is one", () => {
    const parts: PartToPick[] = [
      { subject: "6.1210", kind: "LECTURE", sections: [section(m(1, 11, 1.5), m(3, 11, 1.5))] },
      // WF 10 clashes with work on Wednesday mornings; WF 11 is free.
      { subject: "6.1210", kind: "RECITATION", sections: [section(m(2, 10, 1), m(4, 10, 1)), section(m(2, 11, 1), m(4, 11, 1))] },
      // 18.06 MWF 10 or MWF 11: 11 clashes with the recitation, 10 with work.
      { subject: "18.06", kind: "LECTURE", sections: [section(m(0, 10, 1), m(2, 10, 1), m(4, 10, 1)), section(m(0, 12, 1), m(2, 12, 1), m(4, 12, 1))] },
    ];
    const p = pickSections(parts, week(["w", "system:work", 2, 9, 2]));
    expect(p.sections).toEqual([1, 2, 2]);
    expect(p.conflicts).toEqual([]);
    expect(p.complete).toBe(true);
  });

  test("when every pick conflicts, takes the one with the fewest, and lists them", () => {
    const parts: PartToPick[] = [
      { subject: "A", kind: "LECTURE", sections: [section(m(0, 8, 2)), section(m(0, 9, 1))] }, // 8-10 overlaps sleep and breakfast
      { subject: "B", kind: "LECTURE", sections: [section(m(0, 9, 1))] },
    ];
    const blocked = week(["s", "system:sleep", 0, 7, 1.5], ["e", "system:eating", 0, 9.5, 0.5]);
    const p = pickSections(parts, blocked);
    // A at 8-10 overlaps sleep (to 8:30), breakfast (9:30) and B: 3. A at 9-10 overlaps breakfast and B: 2.
    expect(p.sections).toEqual([2, 1]);
    expect(p.conflicts).toEqual([
      { subject: "A", kind: "LECTURE", meeting: m(0, 9, 1), withBlock: true, with: "system:eating" },
      { subject: "B", kind: "LECTURE", meeting: m(0, 9, 1), withBlock: true, with: "system:eating" },
      { subject: "A", kind: "LECTURE", meeting: m(0, 9, 1), withBlock: false, with: "B" },
    ]);
  });

  test("a meeting over two blocks is two conflicts", () => {
    const p = pickSections([{ subject: "A", kind: "LAB", sections: [section(m(0, 7, 2))] }],
      week(["s", "system:sleep", 0, 6, 1.5], ["c", "system:care", 0, 7.5, 1]));
    expect(p.conflicts.map((c) => c.with)).toEqual(["system:sleep", "system:care"]);
  });

  test("parts of one class conflict with each other too", () => {
    const parts: PartToPick[] = [
      { subject: "A", kind: "LECTURE", sections: [section(m(1, 10, 1))] },
      { subject: "A", kind: "RECITATION", sections: [section(m(1, 10, 1)), section(m(1, 11, 1))] },
    ];
    expect(pickSections(parts, week()).sections).toEqual([1, 2]);
  });

  test("keeps hand picks, even with conflicts, and fits the rest around them", () => {
    const parts: PartToPick[] = [
      { subject: "A", kind: "LECTURE", sections: [section(m(0, 10, 1)), section(m(0, 11, 1))], chosen: 2 },
      { subject: "B", kind: "LECTURE", sections: [section(m(0, 11, 1)), section(m(0, 10, 1))] },
    ];
    expect(pickSections(parts, week()).sections).toEqual([2, 2]);
    const bad = pickSections([{ ...parts[0]!, chosen: 1 }], week(["w", "system:work", 0, 10, 1]));
    expect(bad.sections).toEqual([1]);
    expect(bad.conflicts).toHaveLength(1);
  });

  test("is deterministic, and ties go to the earlier section", () => {
    const parts: PartToPick[] = [{ subject: "A", kind: "LECTURE", sections: [section(m(0, 10, 1)), section(m(0, 11, 1))] }];
    expect(pickSections(parts, week()).sections).toEqual([1]);
    const many: PartToPick[] = Array.from({ length: 6 }, (_, i) => ({
      subject: `S${i}`, kind: "LECTURE",
      sections: Array.from({ length: 5 }, (_, j) => section(m(j % 5, 9 + i, 1))),
    }));
    expect(pickSections(many, week()).sections).toEqual(pickSections(many, week()).sections);
  });

  test("stops at the cap with the best pick so far", () => {
    // 8 classes that all meet at the same hour in each of their 6 sections: no pick is free.
    const parts: PartToPick[] = Array.from({ length: 8 }, (_, i) => ({
      subject: `S${i}`, kind: "LECTURE", sections: Array.from({ length: 6 }, (_, d) => section(m(d, 10, 1))),
    }));
    const p = pickSections(parts, week(), 500);
    expect(p.complete).toBe(false);
    expect(p.steps).toBeGreaterThan(500);
    expect(p.sections).toHaveLength(8);
    // 6 days for 8 classes: at least two share a day.
    expect(p.conflicts.length).toBeGreaterThanOrEqual(2);
    const full = pickSections(parts, week());
    expect(full.conflicts).toHaveLength(2);
  });

  test("nothing to pick", () => {
    expect(pickSections([], week())).toMatchObject({ sections: [], conflicts: [], complete: true });
  });
});
