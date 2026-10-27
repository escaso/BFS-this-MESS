/**
 * Tests for the History concept, written from History.md (the spec), not from History.ts.
 * The clock is fixed, so the current season is known: 2026-10-26 is in FALL 2026.
 * Refusals are checked by the code and sentence the spec declares for each action.
 *
 * Run with: bun test test/History.test.ts (needs MongoDB at MONGODB_URI)
 *
 * =====================================================================================
 * TESTING STRATEGY (partitions)
 * =====================================================================================
 *
 * ---- current season (seasonAt) ----
 *   month: January (IAP) / February, May (SPRING) / June, August (SUMMER) / September, December (FALL)
 *
 * ---- addPrior / removePrior / finishPrior ----
 *   user: no Profile / Profile; subject: new / already prior / in a Record
 *   finishPrior: with no prior credit / with some
 *
 * ---- setStart ----
 *   term: FALL / SPRING / IAP / SUMMER; start: before / at / after the current season
 *   Records: none / inside the new range (kept) / before the new start (deleted)
 *
 * ---- addTaken / removeTaken / lock / unlock ----
 *   season: before the start / past / current / future; user: no start / start set
 *   Record: none / unlocked / locked / answered then unlocked
 *   subject: new / already in another season / in prior credit / not in the season
 *   lock with no subjects ("nothing this term")
 *
 * ---- queries ----
 *   _profile: no Profile / partial (resume) / complete; _seasons: includes IAP and SUMMER, ends before the current
 *   _pending: first unanswered / none / no start; _encoded: answered Records only, ordered
 */

import { beforeEach, describe, expect, it } from "bun:test";
import { HistoryConcept, seasonAt } from "../src/concepts/History.ts";
import { refusalsOf, useFreshDb } from "./support.ts";

const freshDb = useFreshDb("history_test");
const expectRefusal = refusalsOf("History");
const TODAY = new Date(2026, 9, 26); // FALL 2026

let h: HistoryConcept;
beforeEach(() => {
  h = new HistoryConcept(freshDb(), () => TODAY);
});

describe("seasonAt", () => {
  it("covers each part of the year", () => {
    expect(seasonAt(new Date(2027, 0, 15))).toEqual({ year: 2027, term: "IAP" });
    expect(seasonAt(new Date(2027, 1, 1))).toEqual({ year: 2027, term: "SPRING" });
    expect(seasonAt(new Date(2027, 4, 31))).toEqual({ year: 2027, term: "SPRING" });
    expect(seasonAt(new Date(2027, 5, 1))).toEqual({ year: 2027, term: "SUMMER" });
    expect(seasonAt(new Date(2027, 7, 31))).toEqual({ year: 2027, term: "SUMMER" });
    expect(seasonAt(new Date(2027, 8, 1))).toEqual({ year: 2027, term: "FALL" });
    expect(seasonAt(new Date(2027, 11, 31))).toEqual({ year: 2027, term: "FALL" });
  });
});

describe("prior credit", () => {
  it("covers adding, listing, removing and finishing", async () => {
    expect(await h._profile({ user: "u" })).toEqual({
      started: false, startYear: 0, startTerm: "FALL", priorDone: false, currentYear: 2026, currentTerm: "FALL", complete: false,
    });
    await h.addPrior({ user: "u", subject: "18.01" });
    await h.addPrior({ user: "u", subject: "8.01" });
    expect(await h._prior({ user: "u" })).toEqual([{ subject: "18.01" }, { subject: "8.01" }]);
    await expectRefusal("addPrior", "ALREADY_TAKEN", h.addPrior({ user: "u", subject: "18.01" }));
    await h.removePrior({ user: "u", subject: "8.01" });
    expect(await h._prior({ user: "u" })).toEqual([{ subject: "18.01" }]);
    await expectRefusal("removePrior", "NOT_PRIOR", h.removePrior({ user: "u", subject: "8.01" }));
    await expectRefusal("removePrior", "NOT_PRIOR", h.removePrior({ user: "nobody", subject: "8.01" }));
    await h.finishPrior({ user: "u" });
    expect((await h._profile({ user: "u" })).priorDone).toBe(true);
  });

  it("covers finishing with no prior credit", async () => {
    await h.finishPrior({ user: "u" });
    expect(await h._prior({ user: "u" })).toEqual([]);
    expect((await h._profile({ user: "u" })).priorDone).toBe(true);
  });
});

describe("start and past seasons", () => {
  it("covers a start before now: every season, IAP and summer included, up to the current one", async () => {
    await h.setStart({ user: "u", year: 2025, term: "FALL" });
    expect((await h._seasons({ user: "u" })).map(({ year, term }) => `${term} ${year}`)).toEqual([
      "FALL 2025", "IAP 2026", "SPRING 2026", "SUMMER 2026",
    ]);
    expect(await h._pending({ user: "u" })).toEqual([{ year: 2025, term: "FALL" }]);
  });

  it("covers a start now or later: nothing to backfill", async () => {
    await h.setStart({ user: "u", year: 2026, term: "FALL" });
    expect(await h._seasons({ user: "u" })).toEqual([]);
    expect(await h._pending({ user: "u" })).toEqual([]);
    await h.finishPrior({ user: "u" });
    expect((await h._profile({ user: "u" })).complete).toBe(true);
    await h.setStart({ user: "u", year: 2027, term: "SPRING" });
    expect(await h._seasons({ user: "u" })).toEqual([]);
  });

  it("covers a start that is not Fall or Spring", async () => {
    await expectRefusal("setStart", "BAD_START", h.setStart({ user: "u", year: 2025, term: "IAP" }));
    await expectRefusal("setStart", "BAD_START", h.setStart({ user: "u", year: 2025, term: "SUMMER" }));
  });

  it("covers moving the start later, which deletes Records before it", async () => {
    await h.setStart({ user: "u", year: 2025, term: "FALL" });
    await h.addTaken({ user: "u", year: 2025, term: "FALL", subject: "6.100A" });
    await h.lock({ user: "u", year: 2025, term: "FALL" });
    await h.lock({ user: "u", year: 2026, term: "SPRING" });
    await h.setStart({ user: "u", year: 2026, term: "SPRING" });
    expect(await h._taken({ user: "u", year: 2025, term: "FALL" })).toEqual([]);
    expect(await h._seasons({ user: "u" })).toEqual([
      { year: 2026, term: "SPRING", answered: true, locked: true, count: 0 },
      { year: 2026, term: "SUMMER", answered: false, locked: false, count: 0 },
    ]);
    // 6.100A is no longer in the history, so it may be added again.
    await h.addPrior({ user: "u", subject: "6.100A" });
  });
});

describe("backfilling", () => {
  beforeEach(async () => {
    await h.setStart({ user: "u", year: 2025, term: "FALL" });
  });

  it("covers answering every season, with a resumable partial state", async () => {
    await h.addTaken({ user: "u", year: 2025, term: "FALL", subject: "18.01" });
    await h.addTaken({ user: "u", year: 2025, term: "FALL", subject: "8.01" });
    // Left half way: the season is not answered yet, so it is still the one to ask.
    expect(await h._pending({ user: "u" })).toEqual([{ year: 2025, term: "FALL" }]);
    expect((await h._seasons({ user: "u" }))[0]).toEqual({ year: 2025, term: "FALL", answered: false, locked: false, count: 2 });
    await h.lock({ user: "u", year: 2025, term: "FALL" });
    expect(await h._pending({ user: "u" })).toEqual([{ year: 2026, term: "IAP" }]);
    await h.lock({ user: "u", year: 2026, term: "IAP" }); // nothing this term
    await h.addTaken({ user: "u", year: 2026, term: "SPRING", subject: "18.02" });
    await h.lock({ user: "u", year: 2026, term: "SPRING" });
    await h.lock({ user: "u", year: 2026, term: "SUMMER" });
    expect(await h._pending({ user: "u" })).toEqual([]);
    expect((await h._profile({ user: "u" })).complete).toBe(false); // prior credit not finished
    await h.finishPrior({ user: "u" });
    expect((await h._profile({ user: "u" })).complete).toBe(true);
    expect(JSON.parse((await h._encoded({ user: "u" })).history)).toEqual({
      prior: [],
      seasons: [
        { year: 2025, term: "FALL", subjects: ["18.01", "8.01"] },
        { year: 2026, term: "IAP", subjects: [] },
        { year: 2026, term: "SPRING", subjects: ["18.02"] },
        { year: 2026, term: "SUMMER", subjects: [] },
      ],
    });
  });

  it("covers seasons that are not past", async () => {
    for (const [year, term] of [[2025, "SPRING"], [2026, "FALL"], [2027, "IAP"]] as const) {
      await expectRefusal("addTaken", "NOT_PAST", h.addTaken({ user: "u", year, term, subject: "X" }));
      await expectRefusal("lock", "NOT_PAST", h.lock({ user: "u", year, term }));
    }
    await expectRefusal("addTaken", "NOT_PAST", h.addTaken({ user: "nostart", year: 2025, term: "FALL", subject: "X" }));
  });

  it("covers a subject in one place only", async () => {
    await h.addPrior({ user: "u", subject: "18.01" });
    await h.addTaken({ user: "u", year: 2025, term: "FALL", subject: "8.01" });
    await expectRefusal("addTaken", "ALREADY_TAKEN", h.addTaken({ user: "u", year: 2026, term: "SPRING", subject: "8.01" }));
    await expectRefusal("addTaken", "ALREADY_TAKEN", h.addTaken({ user: "u", year: 2026, term: "SPRING", subject: "18.01" }));
    await expectRefusal("addPrior", "ALREADY_TAKEN", h.addPrior({ user: "u", subject: "8.01" }));
  });

  it("covers locked seasons, unlocking to correct them, and locking again", async () => {
    await h.addTaken({ user: "u", year: 2025, term: "FALL", subject: "18.01" });
    await h.lock({ user: "u", year: 2025, term: "FALL" });
    await expectRefusal("addTaken", "LOCKED", h.addTaken({ user: "u", year: 2025, term: "FALL", subject: "8.01" }));
    await expectRefusal("removeTaken", "LOCKED", h.removeTaken({ user: "u", year: 2025, term: "FALL", subject: "18.01" }));
    await h.unlock({ user: "u", year: 2025, term: "FALL" });
    await expectRefusal("unlock", "NOT_LOCKED", h.unlock({ user: "u", year: 2025, term: "FALL" }));
    await h.removeTaken({ user: "u", year: 2025, term: "FALL", subject: "18.01" });
    await h.addTaken({ user: "u", year: 2025, term: "FALL", subject: "18.01A" });
    // Still answered while unlocked, so it is not asked again, and still part of the history.
    expect(await h._pending({ user: "u" })).toEqual([{ year: 2026, term: "IAP" }]);
    expect(JSON.parse((await h._encoded({ user: "u" })).history).seasons).toEqual([
      { year: 2025, term: "FALL", subjects: ["18.01A"] },
    ]);
    await h.lock({ user: "u", year: 2025, term: "FALL" });
    expect((await h._seasons({ user: "u" }))[0]).toEqual({ year: 2025, term: "FALL", answered: true, locked: true, count: 1 });
    expect(await h._taken({ user: "u", year: 2025, term: "FALL" })).toEqual([{ subject: "18.01A" }]);
  });

  it("covers removing what is not there and unlocking what is not locked", async () => {
    await expectRefusal("removeTaken", "NOT_TAKEN", h.removeTaken({ user: "u", year: 2025, term: "FALL", subject: "X" }));
    await h.addTaken({ user: "u", year: 2025, term: "FALL", subject: "A" });
    await expectRefusal("removeTaken", "NOT_TAKEN", h.removeTaken({ user: "u", year: 2025, term: "FALL", subject: "B" }));
    await expectRefusal("unlock", "NOT_LOCKED", h.unlock({ user: "u", year: 2025, term: "FALL" }));
    await expectRefusal("unlock", "NOT_LOCKED", h.unlock({ user: "u", year: 2026, term: "IAP" }));
  });

  it("covers a user with no Profile", async () => {
    expect(await h._seasons({ user: "x" })).toEqual([]);
    expect(await h._pending({ user: "x" })).toEqual([]);
    expect(await h._taken({ user: "x", year: 2025, term: "FALL" })).toEqual([]);
    expect(JSON.parse((await h._encoded({ user: "x" })).history)).toEqual({ prior: [], seasons: [] });
  });

  it("covers histories being per user", async () => {
    await h.addTaken({ user: "u", year: 2025, term: "FALL", subject: "A" });
    await h.setStart({ user: "v", year: 2025, term: "FALL" });
    await h.addTaken({ user: "v", year: 2025, term: "FALL", subject: "A" });
    expect(await h._taken({ user: "v", year: 2025, term: "FALL" })).toEqual([{ subject: "A" }]);
  });
});
