// Slot math for the weekly time budget, as in TimeBudget.md: 7 days of 96 slots of
// 15 minutes, day 0 is Monday, and a block past the end of a day (or of Sunday)
// continues into the next one.

export const SLOTS_PER_DAY = 96;
export const SLOTS_PER_WEEK = 7 * SLOTS_PER_DAY;
export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** A slot of the day as a time, e.g. 30 -> "7:30am", 0 and 96 -> "12am". */
export function timeOf(slot: number): string {
  const minutes = (slot % SLOTS_PER_DAY) * 15;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
}

/** A slot of the week as a day and time, e.g. 124 -> "Tuesday 7am". */
export const weekTimeOf = (weekSlot: number) =>
  `${DAYS[Math.floor(((weekSlot % SLOTS_PER_WEEK) + SLOTS_PER_WEEK) % SLOTS_PER_WEEK / SLOTS_PER_DAY)]} ${timeOf(weekSlot)}`;

export type BlockLike = { day: number; start: number; slots: number };

/** Where a block starts in the week. */
export const firstSlot = (b: BlockLike) => b.day * SLOTS_PER_DAY + b.start;

/** The block as one piece per day it touches: { day, start, slots, first, last }. */
export function segments(b: BlockLike) {
  const out: { day: number; start: number; slots: number; first: boolean; last: boolean }[] = [];
  let at = firstSlot(b);
  let left = b.slots;
  while (left > 0) {
    const day = Math.floor(at / SLOTS_PER_DAY) % 7;
    const start = at % SLOTS_PER_DAY;
    const n = Math.min(left, SLOTS_PER_DAY - start);
    out.push({ day, start, slots: n, first: out.length === 0, last: left === n });
    at = (at + n) % SLOTS_PER_WEEK;
    left -= n;
  }
  return out;
}

/** "Sleep, Monday 11pm to Tuesday 7am (8 h)"; the end day is named only when it differs. */
export function describe(name: string, b: BlockLike) {
  const start = firstSlot(b);
  const end = start + b.slots;
  const sameDay = Math.floor(start / SLOTS_PER_DAY) === Math.floor((end - 1) / SLOTS_PER_DAY);
  return `${name}, ${weekTimeOf(start)} to ${sameDay ? timeOf(end) : weekTimeOf(end)} (${b.slots / 4} h)`;
}

/** Dark or light text, whichever reads better on a background colour such as "#5b4a8a". */
export function textOn(color: string) {
  const hex = color.replace("#", "");
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  if ([r, g, b].some((v) => Number.isNaN(v))) return "#ffffff";
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const lum = 0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!);
  return lum > 0.4 ? "#21286d" : "#ffffff";
}
