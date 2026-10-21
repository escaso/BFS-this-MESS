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
  technical: boolean;
  terms: Term[];
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
    if (l.technical) tech += l.units;
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
  return l.units <= r.total && (!l.technical || l.units <= r.tech);
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

/** Largest assignment of distinct subjects to block slots (bipartite matching). */
function maxMatching(blocks: Block[], subjects: Set<string>): number {
  const slots: Block[] = [];
  for (const b of blocks) for (let i = 0; i < Math.min(b.count, b.options.length); i++) slots.push(b);
  const slotOf = new Map<string, number>();
  const assign = (slot: number, seen: Set<string>): boolean => {
    for (const s of slots[slot].options) {
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
  return size;
}

function covered(ctx: Ctx, subjects: Set<string>): boolean {
  return maxMatching(ctx.blocks, subjects) === ctx.blocks.reduce((n, b) => n + b.count, 0);
}

function blockOptions(ctx: Ctx): string[] {
  return [...new Set(ctx.blocks.flatMap((b) => b.options))].sort();
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

function satisfies(ctx: Ctx, placed: Placed): boolean {
  if (!covered(ctx, takenSet(ctx, placed))) return false;
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
const MAX_STATES = 2000; // states kept after each season
const MAX_EXPANSIONS = 20000; // candidate checks per season

/** Breadth-first, season by season; the first season with a complete plan is the earliest finish. */
function findPlans(ctx: Ctx, includeIAPAndSummer: boolean, limit: number): Placed[] {
  const horizon = ctx.endKey + HORIZON_YEARS * 4;
  const options = candidates(ctx);
  // A dependency of a needed subject is worth taking even if it adds no block coverage.
  const depTargets = dependencyClosure(ctx, [...blockOptions(ctx), ...ctx.pins.keys()]);

  const start: Placed = new Map(ctx.pins);
  if (satisfies(ctx, start)) return [start];

  // Begin at the first unlocked season that has room left after its pins.
  const seasons = seasonKeys(ctx.startKey, horizon, includeIAPAndSummer).filter((k) => !semesterOf(ctx, k).locked);
  const first = seasons.findIndex((k) => room(ctx, start, k).total > 0);
  if (first < 0) return [];

  let frontier: Placed[] = [start];
  for (const k of seasons.slice(first)) {
    const next = new Map<string, Placed>();
    const fresh: Placed[] = [];
    let budget = MAX_EXPANSIONS;

    for (const state of frontier) {
      next.set(signature(state), state); // take nothing this season
      const taken = takenSet(ctx, state);
      const cands = options.filter((o) => !taken.has(o));
      const cur: Placed = new Map(state);
      const added: string[] = [];
      const dfs = (from: number): void => {
        for (let i = from; i < cands.length; i++) {
          if (budget-- <= 0) return;
          const s = cands[i];
          // corequisites are checked once the subset for the season is known
          if (!canGoIn(ctx, cur, s, k, { endKey: horizon, coreqs: false })) continue;
          const have = takenSet(ctx, cur);
          const grows = maxMatching(ctx.blocks, new Set([...have, s])) > maxMatching(ctx.blocks, have);
          if (!grows && !depTargets.has(s)) continue;
          cur.set(s, k);
          added.push(s);
          const sig = signature(cur);
          if (!next.has(sig) && added.every((a) => dependenciesMet(ctx, cur, a, k))) {
            const copy: Placed = new Map(cur);
            next.set(sig, copy);
            fresh.push(copy);
          }
          dfs(i + 1);
          cur.delete(s);
          added.pop();
        }
      };
      dfs(0);
    }

    const done = fresh.filter((p) => satisfies(ctx, p));
    if (done.length > 0) return done.slice(0, limit);

    frontier = [...next.values()];
    if (frontier.length > MAX_STATES) {
      frontier = frontier
        .map((p) => ({ p, r: maxMatching(ctx.blocks, takenSet(ctx, p)) }))
        .sort((a, b) => b.r - a.r)
        .slice(0, MAX_STATES)
        .map((x) => x.p);
    }
  }
  return [];
}

export class ConstrainConcept {
  private readonly roads: Collection<RoadRecord>;
  private readonly listings: Collection<Listing>;
  private readonly dependencies: Collection<DependencyRecord>;
  private readonly cancellations: Collection<Cancellation>;

  constructor(db: Db) {
    this.roads = db.collection<RoadRecord>("constrain.roads");
    this.listings = db.collection<Listing>("constrain.listings");
    this.dependencies = db.collection<DependencyRecord>("constrain.dependencies");
    this.cancellations = db.collection<Cancellation>("constrain.cancellations");
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

  async #loadCtx(record: RoadRecord): Promise<Ctx> {
    const blocks = record.blocks.filter((b) => b.options.length > 0);
    // The relevant subjects are the pins, the block options, and everything they
    // depend on, followed transitively (candidates(road) in the spec), so load
    // dependencies level by level until no new subject appears.
    const relevant = new Set([...record.pins.map((p) => p.subject), ...blocks.flatMap((b) => b.options)]);
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

  async addBlock({ road, count }: { road: string; count: number }) {
    await this.#requireRoad(road);
    if (!(count >= 1)) throw new BadCount();
    const block = crypto.randomUUID();
    await this.roads.updateOne({ _id: road }, { $push: { blocks: { id: block, options: [], count } } });
    return { block };
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
    return this.#editBlock(block, (b) => ({ ...b, options: [...new Set([...b.options, subject])] }));
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
    if (!existing) throw new PinNotFound("Pin not found.");
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

  async setListing({ subject, units, technical }: { subject: string; units: number; technical: boolean }) {
    await this.listings.updateOne({ _id: subject }, { $set: { units, technical }, $setOnInsert: { terms: [] } }, { upsert: true });
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
    return [...record.blocks]
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .flatMap((b) => b.options.map((subject) => ({ block: b.id, count: b.count, subject })));
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
        rows.push({ ...seasonOf(k), subject, fitsByEnd: covered(ctx, reachable(ctx, withIt)) });
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
    return findPlans(ctx, includeIAPAndSummer, limit).flatMap((placed, i) =>
      [...placed.entries()]
        .sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1))
        .map(([subject, k]) => ({ plan: i + 1, ...seasonOf(k), subject })),
    );
  }

  async _roadOfBlock({ block }: { block: string }) {
    const record = await this.roads.findOne({ "blocks.id": block });
    return record ? [{ road: record._id }] : [];
  }
}