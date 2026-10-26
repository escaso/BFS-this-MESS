import { MongoServerError, type Collection, type Db } from "mongodb";

export class Refusal extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}
export class NoSuchRoad extends Refusal {
  constructor(message = "There is no such road.") {
    super("NO_SUCH_ROAD", message);
  }
}
export class PinNotFound extends Refusal {
  constructor(message = "That subject is not pinned in this road.") {
    super("NOT_PINNED", message);
  }
}
export class EmptyName extends Refusal {
  constructor(message = "A road needs a name.") {
    super("EMPTY_NAME", message);
  }
}
export class BadStart extends Refusal {
  constructor(message = "A road must start in a Fall or Spring semester.") {
    super("BAD_START", message);
  }
}
export class EndBeforeStart extends Refusal {
  constructor(message = "The end must come after the start.") {
    super("END_BEFORE_START", message);
  }
}
export class EmptyMajor extends Refusal {
  constructor(message = "A major cannot be empty.") {
    super("EMPTY_MAJOR", message);
  }
}
export class NotPrior extends Refusal {
  constructor(message = "That subject is not prior credit for this road.") {
    super("NOT_PRIOR", message);
  }
}
export class BadCount extends Refusal {
  constructor(message = "A block must require at least one subject.") {
    super("BAD_COUNT", message);
  }
}
export class NoSuchBlock extends Refusal {
  constructor(message = "There is no such block.") {
    super("NO_SUCH_BLOCK", message);
  }
}
export class NotAnOption extends Refusal {
  constructor(message = "That subject is not an option of this block.") {
    super("NOT_AN_OPTION", message);
  }
}
export class NoListing extends Refusal {
  constructor(message = "That subject is not known.") {
    super("NO_LISTING", message);
  }
}
export class NoSnapshot extends Refusal {
  constructor(message = "A catalog snapshot needs an id.") {
    super("NO_SNAPSHOT", message);
  }
}
export class AlreadyPrior extends Refusal {
  constructor(message = "That subject is already prior credit.") {
    super("ALREADY_PRIOR", message);
  }
}
export class OutOfSpan extends Refusal {
  constructor(message = "That semester is outside the road.") {
    super("OUT_OF_SPAN", message);
  }
}
export class LockedSeason extends Refusal {
  constructor(message = "That semester is locked.") {
    super("LOCKED_SEASON", message);
  }
}
export class BadCapType extends Refusal {
  constructor(message = "The cap type must be total or technical.") {
    super("BAD_CAP_TYPE", message);
  }
}
export class NegativeLimit extends Refusal {
  constructor(message = "A cap cannot be negative.") {
    super("NEGATIVE_LIMIT", message);
  }
}
export class NoSuchSemester extends Refusal {
  constructor(message = "That semester has no settings.") {
    super("NO_SUCH_SEMESTER", message);
  }
}
export class NotATerm extends Refusal {
  constructor(message = "That subject does not run in that term.") {
    super("NOT_A_TERM", message);
  }
}
export class NoSuchDependency extends Refusal {
  constructor(message = "There is no such dependency.") {
    super("NO_SUCH_DEPENDENCY", message);
  }
}
export class NotCancelled extends Refusal {
  constructor(message = "That subject is not marked as cancelled in that semester.") {
    super("NOT_CANCELLED", message);
  }
}

export type Term = "IAP" | "SPRING" | "SUMMER" | "FALL";
export type DependencyKind = "PREREQUISITE" | "COREQUISITE";

interface Pin {
  subject: string;
  year: number;
  term: Term;
}

interface Block {
  id: string;
  options: string[];
  count: number;
  // Absent on blocks made before these fields existed: those were the student's own, and technical.
  title?: string;
  technical?: boolean;
  group?: string;
  origin?: string;
  early?: boolean;
}

interface Semester {
  year: number;
  term: Term;
  locked: boolean;
  maxUnits: number | null; // null = no cap
  maxTechnicalUnits: number | null;
}

interface RoadRecord {
  _id: string; // road ID
  name: string;
  major: string;
  startYear: number;
  startTerm: Term;
  endYear: number;
  endTerm: Term;
  prior: string[];
  blocks: Block[];
  pins: Pin[];
  semesters: Semester[];
}

interface Listing {
  _id: string; // subject
  units: number;
  terms: Term[];
  popularity?: number; // absent on listings made before it existed: 0
}

interface DependencyRecord {
  _id: string;
  course: string;
  kind: DependencyKind;
  options: string[];
  count: number;
}

interface Cancellation {
  _id: string; // `${subject}|${year}|${term}`
  subject: string;
  year: number;
  term: Term;
}

// ---------------------------------------------------------------------------
// Seasons: ordered by year, then term (IAP < SPRING < SUMMER < FALL).
// ---------------------------------------------------------------------------

interface Season {
  year: number;
  term: Term;
}

const TERMS: Term[] = ["IAP", "SPRING", "SUMMER", "FALL"];
const keyOf = (year: number, term: Term): number => year * 4 + TERMS.indexOf(term);
const seasonOf = (key: number): Season => ({ year: Math.floor(key / 4), term: TERMS[((key % 4) + 4) % 4] });
const isFallOrSpring = (term: string): term is "FALL" | "SPRING" => term === "FALL" || term === "SPRING";
// SPRING Y = 2Y, FALL Y = 2Y + 1
const semesterIndex = (year: number, term: "FALL" | "SPRING") => year * 2 + (term === "FALL" ? 1 : 0);

function defaultEnd(startYear: number, startTerm: "FALL" | "SPRING"): Season {
  return startTerm === "FALL" ? { year: startYear + 4, term: "SPRING" } : { year: startYear + 3, term: "FALL" };
}

function shiftSeason(s: Season, delta: number): Season {
  if (isFallOrSpring(s.term)) {
    const idx = semesterIndex(s.year, s.term) + delta;
    return { year: Math.floor(idx / 2), term: ((idx % 2) + 2) % 2 === 1 ? "FALL" : "SPRING" };
  }
  // An IAP/SUMMER end has no FALL/SPRING index, so it moves by whole years.
  return { year: s.year + Math.round(delta / 2), term: s.term };
}

/** The end of the road moves by as many FALL/SPRING semesters as the start moves. */
function movedSpan(road: RoadRecord, year: number, term: "FALL" | "SPRING") {
  const delta = semesterIndex(year, term) - semesterIndex(road.startYear, road.startTerm as "FALL" | "SPRING");
  const end = shiftSeason({ year: road.endYear, term: road.endTerm }, delta);
  return { startKey: keyOf(year, term), endKey: keyOf(end.year, end.term), end };
}

const pinKey = (p: Pin) => keyOf(p.year, p.term);
const pinsOutside = (pins: Pin[], startKey: number, endKey: number) =>
  pins.filter((p) => pinKey(p) < startKey || pinKey(p) > endKey);
const sortPins = (pins: Pin[]) =>
  [...pins].sort((a, b) => pinKey(a) - pinKey(b) || (a.subject < b.subject ? -1 : 1));

function isLocked(record: RoadRecord, year: number, term: Term): boolean {
  return record.semesters.some((s) => s.year === year && s.term === term && s.locked);
}

/** Set fields of the Semester for a season, creating it (as in setLocked) if there is none. */
function upsertSemester(record: RoadRecord, year: number, term: Term, patch: Partial<Semester>): Semester[] {
  const semesters = record.semesters.map((s) => ({ ...s }));
  let sem = semesters.find((s) => s.year === year && s.term === term);
  if (!sem) {
    sem = { year, term, locked: false, maxUnits: term === "IAP" ? 12 : null, maxTechnicalUnits: null };
    semesters.push(sem);
  }
  Object.assign(sem, patch);
  return semesters;
}

// ---------------------------------------------------------------------------
// Planning engine: taken, canRun, dependenciesMet, room, canGoIn, covered, reachable
// ---------------------------------------------------------------------------

/** subject -> key of the season it is placed in (pins, plus extensions during _findPath). */
type Placed = Map<string, number>;

interface Ctx {
  startKey: number;
  endKey: number;
  prior: Set<string>;
  blocks: Block[]; // only blocks with options
  closed: Block[]; // the blocks plans choose subjects for
  open: Block[]; // the blocks plans leave slots for
  technical: Set<string>; // technical(road, subject): options of technical blocks
  early: Map<string, number>; // options of early blocks -> 0 if in a narrow one (a science GIR), else 1
  pins: Placed;
  semesters: Map<number, Semester>;
  listings: Map<string, Listing>;
  deps: Map<string, DependencyRecord[]>;
  cancelled: Set<string>; // `${subject}|${seasonKey}`
}

function semesterOf(ctx: Ctx, k: number): Pick<Semester, "locked" | "maxUnits" | "maxTechnicalUnits"> {
  return (
    ctx.semesters.get(k) ?? { locked: false, maxUnits: seasonOf(k).term === "IAP" ? 12 : null, maxTechnicalUnits: null }
  );
}

function takenSet(ctx: Ctx, placed: Placed): Set<string> {
  return new Set([...ctx.prior, ...placed.keys()]);
}

function canRun(ctx: Ctx, subject: string, k: number): boolean {
  const l = ctx.listings.get(subject);
  return !!l && l.terms.includes(seasonOf(k).term) && !ctx.cancelled.has(`${subject}|${k}`);
}

function dependenciesMet(ctx: Ctx, placed: Placed, subject: string, k: number, includeCoreq = true): boolean {
  for (const d of ctx.deps.get(subject) ?? []) {
    if (d.kind === "COREQUISITE" && !includeCoreq) continue;
    let n = 0;
    for (const o of d.options) {
      const at = placed.get(o);
      if (ctx.prior.has(o) || (at !== undefined && (d.kind === "PREREQUISITE" ? at < k : at <= k))) n++;
    }
    if (n < d.count) return false;
  }
  return true;
}

function room(ctx: Ctx, placed: Placed, k: number) {
  const sem = semesterOf(ctx, k);
  let total = 0;
  let tech = 0;
  for (const [s, at] of placed) {
    const l = ctx.listings.get(s);
    if (at !== k || !l) continue;
    total += l.units;
    if (ctx.technical.has(s)) tech += l.units;
  }
  return {
    total: sem.maxUnits === null ? Infinity : sem.maxUnits - total,
    tech: sem.maxTechnicalUnits === null ? Infinity : sem.maxTechnicalUnits - tech,
  };
}

function fitsRoom(ctx: Ctx, placed: Placed, subject: string, k: number): boolean {
  const l = ctx.listings.get(subject);
  if (!l) return false;
  const r = room(ctx, placed, k);
  return l.units <= r.total && (!ctx.technical.has(subject) || l.units <= r.tech);
}

function canGoIn(
  ctx: Ctx,
  placed: Placed,
  subject: string,
  k: number,
  opts: { endKey?: number; coreqs?: boolean } = {},
): boolean {
  if (semesterOf(ctx, k).locked) return false;
  if (k < ctx.startKey || k > (opts.endKey ?? ctx.endKey)) return false;
  if (ctx.prior.has(subject) || placed.has(subject)) return false;
  return (
    canRun(ctx, subject, k) &&
    dependenciesMet(ctx, placed, subject, k, opts.coreqs ?? true) &&
    fitsRoom(ctx, placed, subject, k)
  );
}

/**
 * Largest assignment of distinct subjects to block slots (bipartite matching). The options
 * of each slot are tried in order, so an earlier option is preferred when there is a choice.
 * Answers the size of the matching and the subjects matched.
 */
function matching(blocks: Block[], subjects: Set<string>, prefer?: (options: string[]) => string[]) {
  const slots: string[][] = [];
  const blockOf: number[] = [];
  blocks.forEach((b, j) => {
    const options = prefer ? prefer(b.options) : b.options;
    for (let i = 0; i < Math.min(b.count, b.options.length); i++) {
      slots.push(options);
      blockOf.push(j);
    }
  });
  const slotOf = new Map<string, number>();
  const assign = (slot: number, seen: Set<string>): boolean => {
    for (const s of slots[slot]) {
      if (!subjects.has(s) || seen.has(s)) continue;
      seen.add(s);
      const cur = slotOf.get(s);
      if (cur === undefined || assign(cur, seen)) {
        slotOf.set(s, slot);
        return true;
      }
    }
    return false;
  };
  let size = 0;
  for (let i = 0; i < slots.length; i++) if (assign(i, new Set())) size++;
  const perBlock = blocks.map(() => 0);
  for (const slot of slotOf.values()) perBlock[blockOf[slot]]++;
  const assigned = new Map([...slotOf].map(([s, slot]) => [s, blocks[blockOf[slot]]]));
  return { size, matched: new Set(slotOf.keys()), perBlock, assigned };
}

const groupOf = (b: Block) => b.group ?? "";

function byGroup(blocks: Block[]): Block[][] {
  const groups = new Map<string, Block[]>();
  for (const b of blocks) groups.set(groupOf(b), [...(groups.get(groupOf(b)) ?? []), b]);
  return [...groups.values()];
}

/** Within each group a subject counts toward one block; across groups it may count again. */
function coverage(blocks: Block[], subjects: Set<string>): number {
  return byGroup(blocks).reduce((n, group) => n + matching(group, subjects).size, 0);
}

function covered(ctx: Ctx, subjects: Set<string>, blocks = ctx.blocks): boolean {
  return coverage(blocks, subjects) === blocks.reduce((n, b) => n + Math.min(b.count, b.options.length), 0) &&
    blocks.every((b) => b.options.length >= b.count);
}

function blockOptions(ctx: Ctx): string[] {
  return [...new Set(ctx.closed.flatMap((b) => b.options))].sort();
}

/** Options of every dependency of the given subjects, followed transitively. */
function dependencyClosure(ctx: Ctx, from: Iterable<string>): Set<string> {
  const found = new Set<string>();
  const queue = [...from];
  while (queue.length > 0) {
    const s = queue.pop()!;
    for (const d of ctx.deps.get(s) ?? []) {
      for (const o of d.options) {
        if (!found.has(o)) {
          found.add(o);
          queue.push(o);
        }
      }
    }
  }
  return found;
}

/** candidates(road): block options, plus the dependency closure of those and of the pins. */
function candidates(ctx: Ctx): string[] {
  const options = blockOptions(ctx);
  const deps = dependencyClosure(ctx, [...options, ...ctx.pins.keys()]);
  return [...new Set([...options, ...deps])].sort();
}

function seasonKeys(a: number, b: number, includeAll: boolean): number[] {
  const out: number[] = [];
  for (let k = a; k <= b; k++) if (includeAll || k % 4 === 1 || k % 4 === 3) out.push(k);
  return out;
}

/** taken plus every block option that canGoIn some season up to the end (each checked on its own). */
function reachable(ctx: Ctx, placed: Placed): Set<string> {
  const reach = takenSet(ctx, placed);
  const virtual: Placed = new Map(placed);
  for (const k of seasonKeys(ctx.startKey, ctx.endKey, true)) {
    const newly = candidates(ctx).filter((o) => !reach.has(o) && canGoIn(ctx, virtual, o, k));
    for (const o of newly) {
      virtual.set(o, k);
      reach.add(o);
    }
  }
  return reach;
}

function satisfies(ctx: Ctx, placed: Placed, blocks = ctx.blocks): boolean {
  if (!covered(ctx, takenSet(ctx, placed), blocks)) return false;
  for (const [subject, k] of placed) {
    if (!canRun(ctx, subject, k) || !dependenciesMet(ctx, placed, subject, k)) return false;
    const r = room(ctx, placed, k);
    if (!semesterOf(ctx, k).locked && (r.total < 0 || r.tech < 0)) return false; // locked semesters are exempt
  }
  return true;
}

const signature = (placed: Placed) =>
  [...placed.entries()].sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1)).map(([s, k]) => `${s}@${k}`).join(",");

const HORIZON_YEARS = 4; // how far past the end of the road _findPath may look
const MAX_ATTEMPTS = 40; // plans built before choosing the best
const OPEN = 100; // a block with more options than this is open: plans leave slots for it
const SLOT_UNITS = 12;
const SLOT_CHOICES = 10; // the fewest subjects that may fill a slot

// A slot stands in the plan as a subject whose id holds its blocks: "<block>,<block>#<n>".
const isSlot = (s: string) => s.includes("#");
const slotBlocks = (s: string) => s.slice(0, s.indexOf("#"));

/**
 * slots(road, subjects): what the open blocks still need once taken and chosen subjects
 * count toward them, as slots. A slot takes one block of a group at most, and its blocks
 * keep at least SLOT_CHOICES options in common, so that the student can fill it with one
 * subject. Each slot is registered in ctx as a listing, so that it takes room.
 */
function makeSlots(ctx: Ctx, chosen: Set<string>): string[] {
  if (ctx.open.length === 0) return [];
  const have = new Set([...takenSet(ctx, ctx.pins), ...chosen]);
  const need = new Map<Block, number>();
  for (const group of byGroup(ctx.blocks)) {
    const { perBlock } = matching(group, have);
    group.forEach((b, j) => {
      if (ctx.open.includes(b)) need.set(b, Math.min(b.count, b.options.length) - perBlock[j]);
    });
  }
  const slots: { blocks: Block[]; common: Set<string> }[] = [];
  for (const b of [...ctx.open].sort((x, y) => x.options.length - y.options.length || (x.id < y.id ? -1 : 1))) {
    let left = need.get(b) ?? 0;
    for (const slot of slots) {
      if (left === 0) break;
      if (slot.blocks.some((x) => groupOf(x) === groupOf(b))) continue;
      const common = new Set(b.options.filter((o) => slot.common.has(o)));
      if (common.size < SLOT_CHOICES) continue;
      slot.blocks.push(b);
      slot.common = common;
      left--;
    }
    for (; left > 0; left--) slots.push({ blocks: [b], common: new Set(b.options) });
  }
  const seen = new Map<string, number>();
  return slots.map(({ blocks }) => {
    const ids = blocks.map((b) => b.id).join(",");
    const id = `${ids}#${(seen.get(ids) ?? 0) + 1}`;
    seen.set(ids, (seen.get(ids) ?? 0) + 1);
    ctx.listings.set(id, { _id: id, units: SLOT_UNITS, terms: TERMS });
    if (blocks.some((x) => x.technical ?? true)) ctx.technical.add(id);
    return id;
  });
}

/**
 * cost(s): about how many subjects not yet taken a plan needs in order to take s, s included:
 * 1 plus the cheapest options of each of its dependencies, followed down. Infinity when s
 * cannot be taken (no listing, or a dependency that cannot be met).
 */
const NARROW_EARLY = 20; // an early block with at most this many options is taken first of all

/** Options of early blocks: 0 if one of its early blocks is narrow (a science GIR), else 1 (REST, the lab). */
function earlyOptions(blocks: Block[]): Map<string, number> {
  const out = new Map<string, number>();
  // Blocks made before early existed: listed and not technical (the GIRs).
  for (const b of blocks.filter((b) => b.early ?? (!!b.origin && b.technical === false))) {
    const tier = b.options.length <= NARROW_EARLY ? 0 : 1;
    for (const o of b.options) out.set(o, Math.min(out.get(o) ?? 1, tier));
  }
  return out;
}

/** How schedule orders early subjects: narrow ones, then the rest, first; all of them first; or not at all. */
type EarlyMode = "tiered" | "flat" | "none";

const popularity = (ctx: Ctx, s: string) => ctx.listings.get(s)?.popularity ?? 0;

/** More popular first, then by subject. */
const byPopularity = (ctx: Ctx) => (a: string, b: string) =>
  popularity(ctx, b) - popularity(ctx, a) || (a < b ? -1 : a > b ? 1 : 0);

/** Subjects every plan takes: taken, and the only options of closed blocks. */
function required(ctx: Ctx): Set<string> {
  const out = takenSet(ctx, ctx.pins);
  for (const b of ctx.closed) if (b.options.length <= b.count) for (const o of b.options) out.add(o);
  return out;
}

function costs(ctx: Ctx, given: Set<string>) {
  const memo = new Map<string, number>();
  const visiting = new Set<string>();
  const cost = (s: string): number => {
    if (given.has(s)) return 0;
    if (memo.has(s)) return memo.get(s)!;
    if (!ctx.listings.has(s)) return Infinity;
    // A cycle is corequisites taken together (a prerequisite cycle fails when scheduled).
    if (visiting.has(s)) return 0;
    visiting.add(s);
    let total = 1;
    for (const d of ctx.deps.get(s) ?? []) {
      const cheapest = d.options.map(cost).sort((a, b) => a - b).slice(0, d.count);
      total += cheapest.length < d.count ? Infinity : cheapest.reduce((a, b) => a + b, 0);
    }
    visiting.delete(s);
    memo.set(s, total);
    return total;
  };
  return cost;
}

type Attempt = { banned: Set<string>; reverse: boolean };

/** Steps 1 and 2 of _findPath: the subjects a plan takes, or null if the blocks cannot be met. */
function chooseSubjects(ctx: Ctx, cost: (s: string) => number, banned: Set<string>): Set<string> | null {
  const taken = takenSet(ctx, ctx.pins);
  const chosen = new Set<string>();
  // Groups with the fewest options to spare go first, so that their picks can be shared.
  const groups = byGroup(ctx.closed).sort(
    (a, b) => a.reduce((n, x) => n + x.options.length - x.count, 0) - b.reduce((n, x) => n + x.options.length - x.count, 0),
  );
  const popular = byPopularity(ctx);
  const pick = (blocks: Block[], others: Set<string>) => {
    const usable = new Set(blocks.flatMap((b) => b.options).filter((o) => taken.has(o) || (!banned.has(o) && cost(o) < Infinity)));
    const prefer = (options: string[]) =>
      [...options].sort((a, b) => {
        const have = (s: string) => (taken.has(s) ? 0 : others.has(s) ? 1 : 2);
        return have(a) - have(b) || cost(a) - cost(b) || popular(a, b);
      });
    // Fewer options first, so that a narrow block is not starved by a broad one.
    const ordered = [...blocks].sort((a, b) => a.options.length - b.options.length);
    const { size, matched } = matching(ordered, usable, prefer);
    if (size < ordered.reduce((n, b) => n + b.count, 0)) return null;
    return new Set([...matched].filter((s) => !taken.has(s)));
  };
  // First pass: each group in turn, sharing what earlier groups chose.
  const picks: Set<string>[] = [];
  for (const blocks of groups) {
    const mine = pick(blocks, chosen);
    if (!mine) return null;
    picks.push(mine);
    for (const s of mine) chosen.add(s);
  }
  // Second pass: each group again, now sharing what every other group chose, so that a group
  // that went early (such as CI-M) can take the subjects a later one (the major) chose.
  groups.forEach((blocks, i) => {
    const others = new Set(picks.flatMap((p, j) => (j === i ? [] : [...p])));
    picks[i] = pick(blocks, others) ?? picks[i];
  });
  chosen.clear();
  for (const p of picks) for (const s of p) chosen.add(s);

  // Complete: the cheapest options of every dependency that is not met yet.
  const plan = new Set([...chosen, ...ctx.pins.keys()]);
  const queue = [...plan];
  while (queue.length > 0) {
    const s = queue.pop()!;
    for (const d of ctx.deps.get(s) ?? []) {
      const have = d.options.filter((o) => ctx.prior.has(o) || plan.has(o)).length;
      if (have >= d.count) continue;
      const extra = d.options
        .filter((o) => !ctx.prior.has(o) && !plan.has(o) && cost(o) < Infinity)
        .sort((a, b) => cost(a) - cost(b) || popular(a, b))
        .slice(0, d.count - have);
      if (extra.length < d.count - have) return null;
      for (const o of extra) {
        plan.add(o);
        queue.push(o);
      }
    }
  }
  for (const p of ctx.pins.keys()) plan.delete(p);
  return plan;
}

/** Step 3 of _findPath: place the slots one per FALL or SPRING season in turn, where they fit. */
function placeSlots(ctx: Ctx, placed: Placed, slots: string[], horizon: number): boolean {
  const usable = (a: number, b: number) => seasonKeys(a, b, false).filter((k) => !semesterOf(ctx, k).locked);
  const within = usable(ctx.startKey, ctx.endKey);
  const after = usable(ctx.endKey + 1, horizon);
  let next = 0;
  for (const slot of slots) {
    const turn = [...within.slice(next), ...within.slice(0, next)];
    const k = [...turn, ...after].find((k) => canGoIn(ctx, placed, slot, k, { endKey: horizon }));
    if (k === undefined) return false;
    placed.set(slot, k);
    if (within.includes(k)) next = (within.indexOf(k) + 1) % within.length;
  }
  return true;
}

/** Steps 3 and 4 of _findPath: place the slots, then the subjects season by season, or null if some cannot be placed. */
function schedule(
  ctx: Ctx, subjects: Set<string>, slots: string[], includeIAPAndSummer: boolean, reverse: boolean, mode: EarlyMode,
  defer = true,
): Placed | null {
  const horizon = ctx.endKey + HORIZON_YEARS * 4;
  const all = new Set([...subjects, ...ctx.pins.keys()]);
  // Who waits on whom, within the plan.
  const dependents = new Map<string, string[]>();
  for (const s of all) {
    for (const d of ctx.deps.get(s) ?? []) for (const o of d.options) if (all.has(o)) dependents.set(o, [...(dependents.get(o) ?? []), s]);
  }
  const chain = new Map<string, number>();
  const chainOf = (s: string, seen = new Set<string>()): number => {
    if (chain.has(s)) return chain.get(s)!;
    if (seen.has(s)) return 0;
    seen.add(s);
    const n = 1 + Math.max(0, ...(dependents.get(s) ?? []).map((d) => chainOf(d, seen)));
    chain.set(s, n);
    return n;
  };
  // The season of the earliest pin that waits on a subject, directly or not.
  const deadline = new Map<string, number>();
  const pass = (s: string, by: number) => {
    if ((deadline.get(s) ?? Infinity) <= by) return;
    deadline.set(s, by);
    for (const d of ctx.deps.get(s) ?? []) for (const o of d.options) if (subjects.has(o)) pass(o, by);
  };
  for (const [p, k] of ctx.pins) for (const d of ctx.deps.get(p) ?? []) for (const o of d.options) if (subjects.has(o)) pass(o, k);

  // Early subjects, and what they need within the plan, by tier: a science GIR before REST or
  // the lab, which students take later.
  const early = new Map<string, number>();
  if (mode !== "none") {
    const tier = (s: string) => (mode === "tiered" ? ctx.early.get(s)! : 0);
    const queue = [...subjects].filter((s) => ctx.early.has(s)).map((s) => [s, tier(s)] as const);
    while (queue.length > 0) {
      const [s, rank] = queue.pop()!;
      if ((early.get(s) ?? Infinity) <= rank) continue;
      early.set(s, rank);
      for (const d of ctx.deps.get(s) ?? []) for (const o of d.options) if (subjects.has(o)) queue.push([o, rank]);
    }
  }
  const order = [...subjects].sort(
    (a, b) =>
      (deadline.get(a) ?? Infinity) - (deadline.get(b) ?? Infinity) ||
      (early.get(a) ?? Infinity) - (early.get(b) ?? Infinity) ||
      chainOf(b) - chainOf(a) ||
      popularity(ctx, b) - popularity(ctx, a) ||
      (reverse ? (a < b ? 1 : -1) : a < b ? -1 : 1),
  );

  // Electives wait until last (placeElectives): nothing in the plan needs them, so they
  // should not take the early semesters from what later subjects need.
  const electives = new Set(
    !defer ? [] : order.filter((s) =>
      !ctx.early.has(s) && !(dependents.get(s)?.length) &&
      ctx.closed.some((b) => b.options.length > b.count && b.options.includes(s))),
  );

  const placed: Placed = new Map(ctx.pins);
  if (!placeSlots(ctx, placed, slots, horizon)) return null;
  let left = order.filter((s) => !electives.has(s));
  for (const k of seasonKeys(ctx.startKey, horizon, includeIAPAndSummer)) {
    if (left.length === 0) break;
    if (semesterOf(ctx, k).locked) continue;
    // Corequisites may share the season, so keep placing until nothing more fits. A subject
    // whose corequisites did not make it into this season or an earlier one is taken out
    // again, and not tried again in this season.
    const missedCoreq = new Set<string>();
    for (let changed = true; changed; ) {
      changed = false;
      for (const s of left) {
        if (placed.has(s) || missedCoreq.has(s) || !canGoIn(ctx, placed, s, k, { endKey: horizon, coreqs: false })) continue;
        placed.set(s, k);
        changed = true;
      }
      for (let undone = true; undone; ) {
        undone = false;
        for (const s of left) {
          if (placed.get(s) === k && !dependenciesMet(ctx, placed, s, k)) {
            placed.delete(s);
            missedCoreq.add(s);
            undone = true;
          }
        }
      }
      left = left.filter((s) => !placed.has(s));
    }
  }
  if (left.length > 0 || !placeElectives(ctx, placed, order.filter((s) => electives.has(s)), horizon, includeIAPAndSummer)) {
    return null;
  }
  // The slots stand for the open blocks, so only the closed ones are checked.
  return satisfies(ctx, placed, ctx.closed) ? placed : null;
}

/**
 * Places electives from the end backwards, one per FALL or SPRING season in turn, each in the
 * latest season up to the later of the road's end and the plan's last season where it can go;
 * failing that, in the first season where it can.
 */
function placeElectives(ctx: Ctx, placed: Placed, electives: string[], horizon: number, includeIAPAndSummer: boolean) {
  const last = Math.max(ctx.endKey, finish(ctx, placed));
  const back = seasonKeys(ctx.startKey, last, false).filter((k) => !semesterOf(ctx, k).locked).reverse();
  let next = 0;
  for (const s of electives) {
    const turn = [...back.slice(next), ...back.slice(0, next)];
    const k = turn.find((k) => canGoIn(ctx, placed, s, k, { endKey: horizon })) ??
      seasonKeys(ctx.startKey, horizon, includeIAPAndSummer).find((k) => canGoIn(ctx, placed, s, k, { endKey: horizon }));
    if (k === undefined) return false;
    placed.set(s, k);
    if (back.includes(k)) next = (back.indexOf(k) + 1) % back.length;
  }
  return true;
}

/** What each subject of a plan is counted toward: subject -> ids of blocks, one per group at most. */
function countsOf(ctx: Ctx, placed: Placed): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const subjects = takenSet(ctx, placed);
  for (const group of byGroup(ctx.blocks)) {
    for (const [s, b] of matching(group, subjects).assigned) out.set(s, [...(out.get(s) ?? []), b.id]);
  }
  return out;
}

const finish = (ctx: Ctx, placed: Placed) => Math.max(ctx.startKey, ...placed.values());
const subjectsOf = (placed: Placed) => [...placed.keys()].filter((s) => !isSlot(s));

/** Builds plans with different choices of options and answers the best, breadth-first. */
function findPlans(ctx: Ctx, includeIAPAndSummer: boolean, limit: number): Placed[] {
  const start: Placed = new Map(ctx.pins);
  if (satisfies(ctx, start)) return [start];

  const cost = costs(ctx, required(ctx));
  const found = new Map<string, Placed>(); // by the subjects taken, so that a plan counts once
  const attempts: Attempt[] = [{ banned: new Set(), reverse: false }, { banned: new Set(), reverse: true }];
  const tried = new Set<string>();

  for (let i = 0; i < attempts.length && tried.size < MAX_ATTEMPTS; i++) {
    const { banned, reverse } = attempts[i];
    const id = `${[...banned].sort().join(",")}|${reverse}`;
    if (tried.has(id)) continue;
    tried.add(id);

    const subjects = chooseSubjects(ctx, cost, banned);
    if (!subjects) continue;
    const slots = makeSlots(ctx, subjects);
    // Early blocks (the GIRs) first and electives last, unless that runs later past the end
    // of the road: the first of these that finishes earliest, counting any finish by the end
    // as on time.
    const due = (p: Placed) => Math.max(finish(ctx, p), ctx.endKey);
    let placed: Placed | null = null;
    for (const defer of [true, false]) {
      for (const mode of ["tiered", "flat", "none"] as const) {
        const p = schedule(ctx, subjects, slots, includeIAPAndSummer, reverse, mode, defer);
        if (p && (!placed || due(p) < due(placed))) placed = p;
      }
    }
    if (placed) {
      const key = subjectsOf(placed).sort().join(",");
      const before = found.get(key);
      if (!before || finish(ctx, placed) < finish(ctx, before)) found.set(key, placed);
    }

    // Other plans: leave out every subject chosen for one block that has other options, then
    // one such subject at a time.
    if (banned.size === 0 && !reverse) {
      const taken = takenSet(ctx, ctx.pins);
      const flexible = ctx.closed.filter((b) => b.options.length > b.count);
      for (const b of flexible) {
        const mine = b.options.filter((o) => subjects.has(o) && !taken.has(o));
        if (mine.length > 1) attempts.push({ banned: new Set(mine), reverse: false });
      }
      const single = flexible.flatMap((b) => b.options).filter((o) => subjects.has(o));
      for (const s of [...new Set(single)].sort((a, b) => cost(a) - cost(b))) attempts.push({ banned: new Set([s]), reverse: false });
    }
  }

  // Ties keep the order the plans were built in, so the preferred choices come first.
  const plans = [...found.values()].sort((a, b) => finish(ctx, a) - finish(ctx, b) || a.size - b.size);
  const byEnd = plans.filter((p) => finish(ctx, p) <= ctx.endKey);
  const pool = byEnd.length > 0 ? byEnd : plans;

  // Earliest finish first; among plans that finish together, the one with the most subjects
  // no plan answered so far has.
  const answered: Placed[] = [];
  const seen = new Set<string>();
  while (answered.length < limit && pool.length > 0) {
    const first = finish(ctx, pool[0]);
    let best = 0;
    let most = -1;
    pool.forEach((p, i) => {
      // The first plan answered is the best one; the next ones are chosen to differ.
      if (finish(ctx, p) !== first || (answered.length === 0 && i > 0)) return;
      const fresh = subjectsOf(p).filter((s) => !seen.has(s)).length;
      if (fresh > most) [best, most] = [i, fresh];
    });
    const [plan] = pool.splice(best, 1);
    answered.push(plan);
    for (const s of subjectsOf(plan)) seen.add(s);
  }
  return answered;
}

export class ConstrainConcept {
  private readonly roads: Collection<RoadRecord>;
  private readonly listings: Collection<Listing>;
  private readonly dependencies: Collection<DependencyRecord>;
  private readonly cancellations: Collection<Cancellation>;
  private readonly catalog: Collection<{ snapshot: string }>;
  private indexed = false;

  constructor(db: Db) {
    this.roads = db.collection<RoadRecord>("constrain.roads");
    this.listings = db.collection<Listing>("constrain.listings");
    this.dependencies = db.collection<DependencyRecord>("constrain.dependencies");
    this.cancellations = db.collection<Cancellation>("constrain.cancellations");
    this.catalog = db.collection("constrain.catalog");
  }

  async #requireRoad(road: string): Promise<RoadRecord> {
    const record = await this.roads.findOne({ _id: road });
    if (!record) throw new NoSuchRoad();
    return record;
  }

  async #requireBlock(block: string): Promise<RoadRecord> {
    const record = await this.roads.findOne({ "blocks.id": block });
    if (!record) throw new NoSuchBlock();
    return record;
  }

  async #requireListing(subject: string): Promise<Listing> {
    const listing = await this.listings.findOne({ _id: subject });
    if (!listing) throw new NoListing();
    return listing;
  }

  async #loadCtx(record: RoadRecord, also: string[] = []): Promise<Ctx> {
    const blocks = record.blocks.filter((b) => b.options.length > 0);
    const closed = blocks.filter((b) => b.options.length <= OPEN);
    // The relevant subjects are the pins, the options of closed blocks, any others asked
    // for, and everything they depend on, followed transitively (candidates(road) in the
    // spec), so load dependencies level by level until no new subject appears.
    const relevant = new Set([...record.pins.map((p) => p.subject), ...closed.flatMap((b) => b.options), ...also]);
    const deps: DependencyRecord[] = [];
    let frontier = [...relevant];
    while (frontier.length > 0) {
      const level = await this.dependencies.find({ course: { $in: frontier } }).toArray();
      deps.push(...level);
      frontier = [];
      for (const d of level) {
        for (const o of d.options) {
          if (!relevant.has(o)) {
            relevant.add(o);
            frontier.push(o);
          }
        }
      }
    }
    const subjects = [...relevant];
    const [listings, cancelled] = await Promise.all([
      this.listings.find({ _id: { $in: subjects } }).toArray(),
      this.cancellations.find({ subject: { $in: subjects } }).toArray(),
    ]);
    const depMap = new Map<string, DependencyRecord[]>();
    for (const d of deps) depMap.set(d.course, [...(depMap.get(d.course) ?? []), d]);
    return {
      startKey: keyOf(record.startYear, record.startTerm),
      endKey: keyOf(record.endYear, record.endTerm),
      prior: new Set(record.prior),
      blocks,
      closed,
      open: blocks.filter((b) => b.options.length > OPEN),
      technical: new Set(blocks.filter((b) => b.technical ?? true).flatMap((b) => b.options)),
      early: earlyOptions(blocks),
      pins: new Map(record.pins.map((p) => [p.subject, pinKey(p)])),
      semesters: new Map(record.semesters.map((s) => [keyOf(s.year, s.term), s])),
      listings: new Map(listings.map((l) => [l._id, l])),
      deps: depMap,
      cancelled: new Set(cancelled.map((c) => `${c.subject}|${keyOf(c.year, c.term)}`)),
    };
  }

  async newRoad(
    { name, major, startYear, startTerm }: { name: string; major: string; startYear: number; startTerm: Term },
  ) {
    if (!name) throw new EmptyName();
    if (!isFallOrSpring(startTerm)) throw new BadStart();
    const end = defaultEnd(startYear, startTerm);
    const road = crypto.randomUUID();
    await this.roads.insertOne({
      _id: road,
      name,
      major,
      startYear,
      startTerm,
      endYear: end.year,
      endTerm: end.term,
      prior: [],
      blocks: [],
      pins: [],
      semesters: [],
    });
    return { road };
  }

  async copyRoad({ road, name }: { road: string; name: string }) {
    const record = await this.#requireRoad(road);
    if (!name) throw new EmptyName();
    const copy = crypto.randomUUID();
    // One insert, so a copy is made whole or not at all. Blocks get new ids; prior credit stays behind.
    await this.roads.insertOne({
      ...record,
      _id: copy,
      name,
      prior: [],
      blocks: record.blocks.map((b) => ({ ...b, id: crypto.randomUUID(), options: [...b.options] })),
      pins: record.pins.map((p) => ({ ...p })),
      semesters: record.semesters.map((s) => ({ ...s })),
    });
    return { copy };
  }

  async renameRoad({ road, name }: { road: string; name: string }) {
    await this.#requireRoad(road);
    if (!name) throw new EmptyName();
    await this.roads.updateOne({ _id: road }, { $set: { name } });
    return {};
  }

  async deleteRoad({ road }: { road: string }) {
    const result = await this.roads.deleteOne({ _id: road });
    if (result.deletedCount === 0) throw new NoSuchRoad();
    return {};
  }

  async setStart({ road, year, term }: { road: string; year: number; term: Term }) {
    const record = await this.#requireRoad(road);
    if (!isFallOrSpring(term)) throw new BadStart();
    const moved = movedSpan(record, year, term);
    const lost = pinsOutside(record.pins, moved.startKey, moved.endKey);
    await this.roads.updateOne(
      { _id: road },
      {
        $set: {
          startYear: year,
          startTerm: term,
          endYear: moved.end.year,
          endTerm: moved.end.term,
          pins: record.pins.filter((p) => !lost.includes(p)),
        },
      },
    );
    return {};
  }

  async setEnd({ road, year, term }: { road: string; year: number; term: Term }) {
    const record = await this.#requireRoad(road);
    const endKey = keyOf(year, term);
    if (endKey <= keyOf(record.startYear, record.startTerm)) {
      throw new EndBeforeStart();
    }
    await this.roads.updateOne(
      { _id: road },
      { $set: { endYear: year, endTerm: term, pins: record.pins.filter((p) => pinKey(p) <= endKey) } },
    );
    return {};
  }

  async setMajor({ road, major }: { road: string; major: string }) {
    await this.#requireRoad(road);
    if (!major) throw new EmptyMajor();
    await this.roads.updateOne({ _id: road }, { $set: { major } });
    return {};
  }

  async addPrior({ road, subject }: { road: string; subject: string }) {
    const record = await this.#requireRoad(road);
    await this.#requireListing(subject);
    await this.roads.updateOne(
      { _id: road },
      { $addToSet: { prior: subject }, $set: { pins: record.pins.filter((p) => p.subject !== subject) } },
    );
    return {};
  }

  async removePrior({ road, subject }: { road: string; subject: string }) {
    const record = await this.#requireRoad(road);
    if (!record.prior.includes(subject)) throw new NotPrior();
    await this.roads.updateOne({ _id: road }, { $pull: { prior: subject } });
    return {};
  }

  async addBlock({ road, count, technical }: { road: string; count: number; technical: boolean }) {
    return this.addListedBlock({ road, count, title: "", technical, group: "", origin: "", early: false });
  }

  async addListedBlock(
    { road, count, title, technical, group, origin, early }:
      { road: string; count: number; title: string; technical: boolean; group: string; origin: string; early: boolean },
  ) {
    await this.#requireRoad(road);
    if (!(count >= 1)) throw new BadCount();
    const block = crypto.randomUUID();
    await this.roads.updateOne(
      { _id: road },
      { $push: { blocks: { id: block, options: [], count, title, technical, group, origin, early } } },
    );
    return { block };
  }

  async removeListedBlocks({ road }: { road: string }) {
    const record = await this.#requireRoad(road);
    await this.roads.updateOne({ _id: road }, { $set: { blocks: record.blocks.filter((b) => !b.origin) } });
    return {};
  }

  /** Apply a change to one block of whichever road owns it. */
  async #editBlock(block: string, edit: (b: Block) => Block) {
    const record = await this.#requireBlock(block);
    await this.roads.updateOne(
      { _id: record._id },
      { $set: { blocks: record.blocks.map((b) => (b.id === block ? edit(b) : b)) } },
    );
    return {};
  }

  async setCount({ block, count }: { block: string; count: number }) {
    await this.#requireBlock(block);
    if (!(count >= 1)) throw new BadCount();
    return this.#editBlock(block, (b) => ({ ...b, count }));
  }

  async addOption({ block, subject }: { block: string; subject: string }) {
    // Listing a major adds thousands of options, so read only the road's id and add each in place.
    const record = await this.roads.findOne({ "blocks.id": block }, { projection: { _id: 1 } });
    if (!record) throw new NoSuchBlock();
    await this.#requireListing(subject);
    await this.roads.updateOne({ _id: record._id, "blocks.id": block }, { $addToSet: { "blocks.$.options": subject } });
    return {};
  }

  async removeOption({ block, subject }: { block: string; subject: string }) {
    const record = await this.#requireBlock(block);
    if (!record.blocks.find((b) => b.id === block)!.options.includes(subject)) {
      throw new NotAnOption();
    }
    return this.#editBlock(block, (b) => ({ ...b, options: b.options.filter((o) => o !== subject) }));
  }

  async removeBlock({ block }: { block: string }) {
    const record = await this.#requireBlock(block);
    await this.roads.updateOne({ _id: record._id }, { $set: { blocks: record.blocks.filter((b) => b.id !== block) } });
    return {};
  }

  async pin({ road, subject, year, term }: { road: string; subject: string; year: number; term: Term }) {
    const record = await this.#requireRoad(road);
    await this.#requireListing(subject);
    if (record.prior.includes(subject)) throw new AlreadyPrior();
    const k = keyOf(year, term);
    if (k < keyOf(record.startYear, record.startTerm) || k > keyOf(record.endYear, record.endTerm)) {
      throw new OutOfSpan();
    }

    const existingPinIndex = record.pins.findIndex(p => p.subject === subject);
    const existing = record.pins[existingPinIndex];
    if (isLocked(record, year, term) || (existing && isLocked(record, existing.year, existing.term))) {
      throw new LockedSeason();
    }
    let updatedPins = [...record.pins];
    if (existingPinIndex >= 0) {
      updatedPins[existingPinIndex] = { subject, year, term };
    } else {
      updatedPins.push({ subject, year, term });
    }

    await this.roads.updateOne({ _id: road }, { $set: { pins: updatedPins } });
    return {};
  }

  async unPin({ road, subject }: { road: string; subject: string }) {
    const record = await this.#requireRoad(road);

    const existing = record.pins.find(p => p.subject === subject);
    if (!existing) throw new PinNotFound();
    if (isLocked(record, existing.year, existing.term)) throw new LockedSeason();

    await this.roads.updateOne({ _id: road }, { $set: { pins: record.pins.filter(p => p.subject !== subject) } });
    return {};
  }

  async setCap(
    { road, year, term, capType, limit }: { road: string; year: number; term: Term; capType: string; limit: number },
  ) {
    const record = await this.#requireRoad(road);
    if (capType !== "total" && capType !== "technical") {
      throw new BadCapType();
    }
    if (limit < 0) throw new NegativeLimit();

    const patch = capType === "total" ? { maxUnits: limit } : { maxTechnicalUnits: limit };
    await this.roads.updateOne({ _id: road }, { $set: { semesters: upsertSemester(record, year, term, patch) } });
    return {};
  }

  async clearCap({ road, year, term, capType }: { road: string; year: number; term: Term; capType: string }) {
    const record = await this.#requireRoad(road);
    if (capType !== "total" && capType !== "technical") {
      throw new BadCapType();
    }
    const patch = capType === "total" ? { maxUnits: null } : { maxTechnicalUnits: null };
    await this.roads.updateOne({ _id: road }, { $set: { semesters: upsertSemester(record, year, term, patch) } });
    return {};
  }

  async resetSemester({ road, year, term }: { road: string; year: number; term: Term }) {
    const record = await this.#requireRoad(road);
    if (!record.semesters.some((s) => s.year === year && s.term === term)) {
      throw new NoSuchSemester();
    }
    await this.roads.updateOne(
      { _id: road },
      { $set: { semesters: record.semesters.filter((s) => !(s.year === year && s.term === term)) } },
    );
    return {};
  }

  async setLocked({ road, year, term, locked }: { road: string; year: number; term: Term; locked: boolean }) {
    const record = await this.#requireRoad(road);
    await this.roads.updateOne({ _id: road }, { $set: { semesters: upsertSemester(record, year, term, { locked }) } });
    return {};
  }

  // Listings, dependencies and cancellations: this concept's copy of subject facts.

  async setListing({ subject, units }: { subject: string; units: number }) {
    // Subject facts arrive here first; the catalog has thousands of subjects, so look them up by index.
    if (!this.indexed) {
      await this.dependencies.createIndex({ course: 1 });
      await this.cancellations.createIndex({ subject: 1 });
      this.indexed = true;
    }
    await this.listings.updateOne({ _id: subject }, { $set: { units }, $setOnInsert: { terms: [] } }, { upsert: true });
    return {};
  }

  async setPopularity({ subject, popularity }: { subject: string; popularity: number }) {
    await this.#requireListing(subject);
    await this.listings.updateOne({ _id: subject }, { $set: { popularity } });
    return {};
  }

  async addListingTerm({ subject, term }: { subject: string; term: Term }) {
    await this.#requireListing(subject);
    await this.listings.updateOne({ _id: subject }, { $addToSet: { terms: term } });
    return {};
  }

  async removeListingTerm({ subject, term }: { subject: string; term: Term }) {
    const listing = await this.#requireListing(subject);
    if (!listing.terms.includes(term)) throw new NotATerm();
    await this.listings.updateOne({ _id: subject }, { $pull: { terms: term } });
    return {};
  }

  async removeListing({ subject }: { subject: string }) {
    await this.#requireListing(subject);
    await this.listings.deleteOne({ _id: subject });
    await this.dependencies.deleteMany({ course: subject });
    await this.cancellations.deleteMany({ subject });
    return {};
  }

  async addDependency({ course, kind, count }: { course: string; kind: DependencyKind; count: number }) {
    await this.#requireListing(course);
    if (!(count >= 1)) throw new BadCount("A dependency must require at least one subject.");
    const dependency = crypto.randomUUID();
    await this.dependencies.insertOne({ _id: dependency, course, kind, options: [], count });
    return { dependency };
  }

  async addDependencyOption({ dependency, subject }: { dependency: string; subject: string }) {
    const result = await this.dependencies.updateOne({ _id: dependency }, { $addToSet: { options: subject } });
    if (result.matchedCount === 0) throw new NoSuchDependency();
    return {};
  }

  async removeDependency({ dependency }: { dependency: string }) {
    const result = await this.dependencies.deleteOne({ _id: dependency });
    if (result.deletedCount === 0) throw new NoSuchDependency();
    return {};
  }

  async markCancelled({ subject, year, term }: { subject: string; year: number; term: Term }) {
    await this.#requireListing(subject);
    await this.cancellations.updateOne(
      { _id: `${subject}|${year}|${term}` },
      { $setOnInsert: { subject, year, term } },
      { upsert: true },
    );
    return {};
  }

  async unmarkCancelled({ subject, year, term }: { subject: string; year: number; term: Term }) {
    const result = await this.cancellations.deleteOne({ _id: `${subject}|${year}|${term}` });
    if (result.deletedCount === 0) {
      throw new NotCancelled();
    }
    return {};
  }

  async markCatalog({ snapshot }: { snapshot: string }) {
    if (!snapshot) throw new NoSnapshot();
    await this.catalog.updateOne({}, { $set: { snapshot } }, { upsert: true });
    return {};
  }

  // Queries

  async _road({ road }: { road: string }) {
    const r = await this.#requireRoad(road);
    return { name: r.name, major: r.major, startYear: r.startYear, startTerm: r.startTerm, endYear: r.endYear, endTerm: r.endTerm };
  }

  async _prior({ road }: { road: string }) {
    return (await this.#requireRoad(road)).prior.map((subject) => ({ subject }));
  }

  async _blocks({ road }: { road: string }) {
    const record = await this.#requireRoad(road);
    // Listed blocks first, then the student's, each in the order they were added.
    return [...record.blocks.filter((b) => b.origin), ...record.blocks.filter((b) => !b.origin)].flatMap((b) =>
      b.options.map((subject) => ({
        block: b.id,
        count: b.count,
        subject,
        title: b.title ?? "",
        technical: b.technical ?? true,
        group: b.group ?? "",
        origin: b.origin ?? "",
        early: b.early ?? (!!b.origin && b.technical === false),
      })),
    );
  }

  async _pins({ road }: { road: string }) {
    const record = await this.#requireRoad(road);
    return sortPins(record.pins).map(({ subject, year, term }) => ({ subject, year, term }));
  }

  async _semesters({ road }: { road: string }) {
    const record = await this.#requireRoad(road);
    return [...record.semesters]
      .sort((a, b) => keyOf(a.year, a.term) - keyOf(b.year, b.term))
      .map((s) => ({ ...s, maxUnits: s.maxUnits ?? 0, maxTechnicalUnits: s.maxTechnicalUnits ?? 0 })); // 0 = no cap
  }

  async _pinsLostBySetStart({ road, year, term }: { road: string; year: number; term: Term }) {
    const record = await this.#requireRoad(road);
    if (!isFallOrSpring(term)) throw new BadStart();
    const moved = movedSpan(record, year, term);
    return sortPins(pinsOutside(record.pins, moved.startKey, moved.endKey));
  }

  async _pinsLostBySetEnd({ road, year, term }: { road: string; year: number; term: Term }) {
    const record = await this.#requireRoad(road);
    const endKey = keyOf(year, term);
    if (endKey <= keyOf(record.startYear, record.startTerm)) {
      throw new EndBeforeStart();
    }
    return sortPins(record.pins.filter((p) => pinKey(p) > endKey));
  }

  async _satisfies({ road }: { road: string }) {
    const ctx = await this.#loadCtx(await this.#requireRoad(road));
    return { satisfied: satisfies(ctx, ctx.pins) };
  }

  async _options({ road, includeIAPAndSummer }: { road: string; includeIAPAndSummer: boolean }) {
    const ctx = await this.#loadCtx(await this.#requireRoad(road));
    const rows: { year: number; term: Term; subject: string; fitsByEnd: boolean }[] = [];
    const subjects = candidates(ctx);
    for (const k of seasonKeys(ctx.startKey, ctx.endKey, includeIAPAndSummer)) {
      for (const subject of subjects) {
        if (!canGoIn(ctx, ctx.pins, subject, k)) continue;
        const withIt: Placed = new Map(ctx.pins).set(subject, k);
        rows.push({ ...seasonOf(k), subject, fitsByEnd: covered(ctx, reachable(ctx, withIt), ctx.closed) });
      }
    }
    return rows;
  }

  async _findPath(
    { road, includeIAPAndSummer, limit }: { road: string; includeIAPAndSummer: boolean; limit: number },
  ) {
    const record = await this.#requireRoad(road);
    if (!(limit >= 1)) throw new Refusal("BAD_LIMIT", "The limit must be at least 1.");
    const ctx = await this.#loadCtx(record);
    const titleOf = new Map(ctx.blocks.map((b) => [b.id, b.title || "Open requirement"]));
    return findPlans(ctx, includeIAPAndSummer, limit).flatMap((placed, i) => {
      const counts = countsOf(ctx, placed);
      return [...placed.entries()]
        .sort((a, b) => a[1] - b[1] || Number(isSlot(a[0])) - Number(isSlot(b[0])) || (a[0] < b[0] ? -1 : 1))
        .map(([s, k]) => {
          const units = ctx.listings.get(s)?.units ?? SLOT_UNITS;
          if (!isSlot(s)) {
            return { plan: i + 1, ...seasonOf(k), subject: s, slot: "", title: "", units, counts: (counts.get(s) ?? []).join(",") };
          }
          const slot = slotBlocks(s);
          const title = slot.split(",").map((b) => titleOf.get(b)).join(" · ");
          return { plan: i + 1, ...seasonOf(k), subject: "", slot, title, units, counts: slot };
        });
    });
  }

  async _slotOptions({ road, blocks, year, term }: { road: string; blocks: string; year: number; term: Term }) {
    const record = await this.#requireRoad(road);
    const ids = blocks.split(",").filter(Boolean);
    const chosen = ids.map((id) => record.blocks.find((b) => b.id === id));
    if (chosen.length === 0 || chosen.some((b) => !b)) return [];
    const common = chosen.slice(1).reduce(
      (left, b) => left.filter((o) => b!.options.includes(o)),
      chosen[0]!.options,
    );
    const ctx = await this.#loadCtx(record, common);
    const k = keyOf(year, term);
    return common
      .filter((subject) => canGoIn(ctx, ctx.pins, subject, k))
      .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
      .map((subject) => ({ subject }));
  }

  async _loadedCatalog(_: Record<string, never> = {}) {
    const record = await this.catalog.findOne({});
    return record?.snapshot ? { found: true, id: record.snapshot } : { found: false, id: "" };
  }

  async _roadOfBlock({ block }: { block: string }) {
    const record = await this.roads.findOne({ "blocks.id": block });
    return record ? [{ road: record._id }] : [];
  }
}