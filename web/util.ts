import type { Constraints, Term } from "./api.ts";

export const MAX_PATHS = 10;

// ---------- Seasons ----------
// A season is a year and a term. Within a year, IAP < SPRING < SUMMER < FALL
// (Constrain.md), so FALL 2026 comes before IAP 2027.

export type Season = { year: number; term: Term };

const ORDER: Term[] = ["IAP", "SPRING", "SUMMER", "FALL"];
const NAMES: Record<Term, string> = { IAP: "IAP", SPRING: "Spring", SUMMER: "Summer", FALL: "Fall" };

export const rank = (s: Season) => s.year * 4 + ORDER.indexOf(s.term);
export const key = (s: Season) => `${s.year}-${s.term}`;
export const label = (s: Season) => `${NAMES[s.term]} ${s.year}`;
export const sameSeason = (a: Season, b: Season) => a.year === b.year && a.term === b.term;

function fromRank(r: number): Season {
  return { year: Math.floor(r / 4), term: ORDER[r % 4] };
}

/** Every season from `from` through `to`, FALL and SPRING always, IAP and SUMMER only if asked. */
export function seasonsBetween(from: Season, to: Season, includeIAPAndSummer: boolean): Season[] {
  const out: Season[] = [];
  for (let r = rank(from); r <= rank(to); r++) {
    const s = fromRank(r);
    if (includeIAPAndSummer || s.term === "FALL" || s.term === "SPRING") out.push(s);
  }
  return out;
}

/** The seasons of a road, from its start through its end. */
export function seasonsOf(c: Constraints, includeIAPAndSummer: boolean): Season[] {
  return seasonsBetween(
    { year: c.startYear, term: c.startTerm },
    { year: c.endYear, term: c.endTerm },
    includeIAPAndSummer,
  );
}

// ---------- Display ----------

// MIT units look like "3-0-9" (= 12).
export function unitSum(u: unknown): number | null {
  if (!u) return null;
  const parts = String(u).split("-").map(Number);
  return parts.every((n) => !isNaN(n)) ? parts.reduce((a, b) => a + b, 0) : null;
}
