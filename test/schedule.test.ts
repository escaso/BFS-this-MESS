// Tests for the Fireroad schedule parser (src/catalog/schedule.ts). The strings are real
// ones from https://fireroad.mit.edu/courses/all?full=true (fall 2026), plus malformed
// ones made up to test what is left out.
//
// Run with: bun test test/schedule.test.ts
//
// Testing strategy
//   time: whole hour / half hour / range / range ending past noon / afternoon hours 1-7 /
//     evening flag with PM / PM without the flag / noon / malformed
//   days: one / several (MWF, TR, MTWRF) / not a day
//   section: one group / several groups (MW + F) / same times in two rooms (one choice) / TBA
//   components: lecture only / lecture + recitation (many options) / lab TBA / design /
//     names that are free text ("wed,", "Fridays,") / a kind with no sections / empty string
//   scheduledHours: one component / several / sections of different lengths / arranged / none

import { describe, expect, test } from "bun:test";
import { parseSchedule, parseTime, scheduledHours, type Meeting } from "../src/catalog/schedule.ts";

const h = (hour: number, minute = 0) => hour * 60 + minute;
const at = (day: number, start: number, end: number): Meeting => ({ day, start, end });

describe("parseTime", () => {
  test("whole and half hours, ranges and the afternoon rule", () => {
    expect(parseTime("10", false)).toEqual({ start: h(10), end: h(11) });
    expect(parseTime("9.30", false)).toEqual({ start: h(9, 30), end: h(10, 30) });
    expect(parseTime("11-12.30", false)).toEqual({ start: h(11), end: h(12, 30) });
    expect(parseTime("12", false)).toEqual({ start: h(12), end: h(13) });
    expect(parseTime("1", false)).toEqual({ start: h(13), end: h(14) });
    expect(parseTime("2.30-4", false)).toEqual({ start: h(14, 30), end: h(16) });
    expect(parseTime("8.30-10", false)).toEqual({ start: h(8, 30), end: h(10) });
    expect(parseTime("11-1", false)).toEqual({ start: h(11), end: h(13) });
  });

  test("evening times", () => {
    expect(parseTime("7-9 PM", true)).toEqual({ start: h(19), end: h(21) });
    expect(parseTime("4.30-7 PM", true)).toEqual({ start: h(16, 30), end: h(19) });
    expect(parseTime("7 PM", true)).toEqual({ start: h(19), end: h(20) });
    expect(parseTime("7.30-10 PM", false)).toEqual({ start: h(19, 30), end: h(22) }); // PM without the flag
  });

  test("malformed times", () => {
    for (const bad of ["", "noon", "13", "0", "9.75", "9-10-11", "9-", "-10", "9:3"]) expect(parseTime(bad, false)).toBeNull();
  });
});

describe("parseSchedule", () => {
  test("a lecture and many recitation options (6.1210)", () => {
    const p = parseSchedule("Lecture,26-100/TR/0/11-12.30;Recitation,34-304/WF/0/10,35-310/WF/0/10,34-303/WF/0/10,34-304/WF/0/11,4-159/WF/0/12,34-304/WF/0/1,35-308/WF/0/3");
    expect(p.problems).toEqual([]);
    expect(p.components.map((c) => [c.kind, c.sections.length, c.arranged])).toEqual([["lecture", 1, false], ["recitation", 5, false]]);
    expect(p.components[0]!.sections[0]).toEqual({ room: "26-100", meetings: [at(1, h(11), h(12, 30)), at(3, h(11), h(12, 30))] });
    // The same time in three rooms is one choice.
    expect(p.components[1]!.sections.map((s) => s.meetings[0]!.start)).toEqual([h(10), h(11), h(12), h(13), h(15)]);
    expect(scheduledHours(p)).toBe(5);
  });

  test("a section that meets on different days at different times (8.01)", () => {
    const p = parseSchedule("Lecture,26-152/MW/0/9-10.30/F/0/9,26-152/TR/0/1-2.30/F/0/1");
    expect(p.components[0]!.sections).toEqual([
      { room: "26-152", meetings: [at(0, h(9), h(10, 30)), at(2, h(9), h(10, 30)), at(4, h(9), h(10))] },
      { room: "26-152", meetings: [at(1, h(13), h(14, 30)), at(3, h(13), h(14, 30)), at(4, h(13), h(14))] },
    ]);
    expect(scheduledHours(p)).toBe(4);
  });

  test("single times, MWF and a section in groups on one day", () => {
    const p = parseSchedule("Lecture,26-100/MWF/0/1;Recitation,2-135/TR/0/9,2-135/TR/0/10");
    expect(p.components[0]!.sections[0]!.meetings).toEqual([at(0, h(13), h(14)), at(2, h(13), h(14)), at(4, h(13), h(14))]);
    expect(scheduledHours(p)).toBe(5);
    expect(parseSchedule("Lecture,1-190/TR/0/1/F/0/2").components[0]!.sections[0]!.meetings)
      .toEqual([at(1, h(13), h(14)), at(3, h(13), h(14)), at(4, h(14), h(15))]);
    expect(parseSchedule("Lecture,4-370/MTWRF/0/10").components[0]!.sections[0]!.meetings).toHaveLength(5);
  });

  test("evening lectures", () => {
    const p = parseSchedule("Lecture,66-144/M/0/3-5,66-148/T/0/3-5,66-148/W/1/7-9 PM");
    expect(p.components[0]!.sections.map((s) => s.meetings[0])).toEqual([
      at(0, h(15), h(17)), at(1, h(15), h(17)), at(2, h(19), h(21)),
    ]);
    expect(parseSchedule("Lecture,E51-376/W/1/4-6.30 PM").components[0]!.sections[0]!.meetings)
      .toEqual([at(2, h(16), h(18, 30))]);
  });

  test("arranged components: hours are not known from the schedule", () => {
    const p = parseSchedule("Lecture,1-134/T/0/2-4;Lab,TBA");
    expect(p.components).toEqual([
      { kind: "lecture", sections: [{ room: "1-134", meetings: [at(1, h(14), h(16))] }], arranged: false },
      { kind: "lab", sections: [], arranged: true },
    ]);
    expect(scheduledHours(p)).toBeNull();
    expect(parseSchedule("Lecture,E52-432/R/1/4.30-7 PM;Recitation,TBA").components[1]).toMatchObject({ kind: "recitation", arranged: true });
  });

  test("design sections and joint subjects (same string under each number)", () => {
    const p = parseSchedule("Lecture,48-316/MW/0/10.30-12;Recitation,48-316/F/0/11;Design,7-434/TR/0/1-5");
    expect(p.components.map((c) => c.kind)).toEqual(["lecture", "recitation", "design"]);
    expect(scheduledHours(p)).toBe(3 + 1 + 8);
  });

  test("sections of different lengths: the most common one counts", () => {
    const p = parseSchedule("Recitation,1-1/M/0/10,1-1/T/0/10,1-1/W/0/10-12");
    expect(scheduledHours(p)).toBe(1);
  });

  test("free text where a kind should be, which Fireroad really has (1.83, 21M.460, 7.51)", () => {
    const p = parseSchedule("wed,;Fridays,;Lecture,48-308/MW/0/10.30-12;Recitation,48-311/F/0/11");
    expect(p.problems).toEqual(["wed,", "Fridays,"]);
    expect(p.components.map((c) => c.kind)).toEqual(["lecture", "recitation"]);
    expect(parseSchedule("Tues,")).toEqual({ components: [], problems: ["Tues,"] });
    expect(parseSchedule("Recit,")).toEqual({ components: [], problems: ["Recit,"] });
    expect(parseSchedule("Lectures,;Lecture,55-109/T/0/12").components).toHaveLength(1);
  });

  test("malformed sections are left out and reported", () => {
    const p = parseSchedule("Lecture,26-100/TR/0;Recitation,1-1/XY/0/10,1-2/M/0/noon,1-3/M/0/10");
    expect(p.problems).toEqual(["26-100/TR/0", "1-1/XY/0/10", "1-2/M/0/noon"]);
    expect(p.components).toEqual([{ kind: "recitation", sections: [{ room: "1-3", meetings: [at(0, h(10), h(11))] }], arranged: false }]);
  });

  test("nothing to read", () => {
    for (const empty of ["", undefined, null, ";", "Lecture,"]) expect(parseSchedule(empty).components).toEqual([]);
    expect(scheduledHours(parseSchedule(""))).toBeNull();
  });
});
