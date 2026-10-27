import { MongoServerError, type Collection, type Db } from "mongodb";

export class Refusal extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}
export class NoDefault extends Refusal {
  constructor(message = "Set up your regular week first.") {
    super("NO_DEFAULT", message);
  }
}
export class NotOverridden extends Refusal {
  constructor(message = "That semester already uses your regular week.") {
    super("NOT_OVERRIDDEN", message);
  }
}
export class NoSuchTemplate extends Refusal {
  constructor(message = "There is no such week.") {
    super("NO_SUCH_TEMPLATE", message);
  }
}
export class NoSuchCategory extends Refusal {
  constructor(message = "There is no such category.") {
    super("NO_SUCH_CATEGORY", message);
  }
}
export class ManagedCategory extends Refusal {
  constructor(message = "Class time comes from your classes; it cannot be painted.") {
    super("MANAGED_CATEGORY", message);
  }
}
export class BadSlot extends Refusal {
  constructor(message = "A block must start on a 15-minute mark and last from 15 minutes to under a week.") {
    super("BAD_SLOT", message);
  }
}
export class Overlap extends Refusal {
  constructor(message = "That time is already blocked.") {
    super("OVERLAP", message);
  }
}
export class NoSuchBlock extends Refusal {
  constructor(message = "There is no such block.") {
    super("NO_SUCH_BLOCK", message);
  }
}
export class EmptyName extends Refusal {
  constructor(message = "A category needs a name.") {
    super("EMPTY_NAME", message);
  }
}
export class NameTaken extends Refusal {
  constructor(message = "You already have a category with that name.") {
    super("NAME_TAKEN", message);
  }
}
export class NotYourCategory extends Refusal {
  constructor(message = "Only your own categories can be changed.") {
    super("NOT_YOUR_CATEGORY", message);
  }
}
export class BadBuffer extends Refusal {
  constructor(message = "The reserve must be from 0% to 50% of your free time.") {
    super("BAD_BUFFER", message);
  }
}
export class BadFactor extends Refusal {
  constructor(message = "Study hours per class hour must be from 2 to 3.") {
    super("BAD_FACTOR", message);
  }
}
export class NoSubjectFactor extends Refusal {
  constructor(message = "That subject uses your usual factor.") {
    super("NO_SUBJECT_FACTOR", message);
  }
}
export class BadMode extends Refusal {
  constructor(message = "The time budget is either soft or hard.") {
    super("BAD_MODE", message);
  }
}
export class BadShareMode extends Refusal {
  constructor(message = "Share either hours only or your blocked time too.") {
    super("BAD_SHARE_MODE", message);
  }
}

export class BadClass extends Refusal {
  constructor(message = "That class could not be read.") {
    super("BAD_CLASS", message);
  }
}

export type Term = "IAP" | "SPRING" | "SUMMER" | "FALL";
type Mode = "SOFT" | "HARD";
type ShareMode = "METRICS" | "DETAILS";

// ---------- Slot math: 7 days of 96 slots of 15 minutes ----------

export const SLOTS_PER_DAY = 96;
export const SLOTS_PER_WEEK = 7 * SLOTS_PER_DAY;

/** The slots of the week a block covers, wrapping past Sunday into Monday. */
export function covers(day: number, start: number, length: number): number[] {
  const first = day * SLOTS_PER_DAY + start;
  return Array.from({ length }, (_, i) => (first + i) % SLOTS_PER_WEEK);
}

const isWhole = (n: number, lo: number, hi: number) => Number.isInteger(n) && n >= lo && n <= hi;
const validSlot = (day: number, start: number, length: number) =>
  isWhole(day, 0, 6) && isWhole(start, 0, SLOTS_PER_DAY - 1) && isWhole(length, 1, SLOTS_PER_WEEK - 1);

// ---------- Categories ----------

interface CategoryRecord {
  _id: string;
  owner?: string; // absent: a system category
  name: string;
  color: string;
  managed: boolean;
}

/** The system categories, in the order the design lists them (after the time-budgeting worksheet). */
export const SYSTEM_CATEGORIES: CategoryRecord[] = [
  ["sleep", "Sleep", "#5b4a8a"],
  ["care", "Personal care", "#0b7a75"],
  ["eating", "Eating (including preparation)", "#8a5a00"],
  ["commute", "Commute", "#6b6b6b"],
  ["activities", "Regularly scheduled activities", "#7b0082"],
  ["tv", "Watching TV", "#1f5fbf"],
  ["games", "Video games", "#21286d"],
  ["net", "Surfing the net", "#3c6e9e"],
  ["kids", "Watching the kids", "#a14a2a"],
  ["volunteer", "Volunteering", "#556600"],
  ["exercise", "Exercise", "#2e7d32"],
  ["chores", "Chores and errands", "#795548"],
  ["work", "Work", "#b3261e"],
  ["social", "Socializing", "#d048d7"],
  ["other", "Other", "#8c7bc4"],
  ["class", "In class", "#7248d7"],
].map(([id, name, color]) => ({ _id: `system:${id}`, name, color, managed: id === "class" }));

const SYSTEM = new Map(SYSTEM_CATEGORIES.map((c) => [c._id, c]));

// ---------- Records ----------

interface TemplateRecord {
  _id: string;
  owner: string;
  year: number | null; // null on the default
  term: Term | null;
}

interface BlockRecord {
  _id: string;
  template: string;
  category: string;
  day: number;
  start: number;
  length: number;
}

interface SettingsRecord {
  _id: string; // user
  buffer: number;
  factor: number;
}

interface SubjectFactorRecord {
  _id: string; // `${user}|${subject}`
  user: string;
  subject: string;
  factor: number;
}

interface RoadSettingsRecord {
  _id: string; // road
  mode: Mode;
  buffer?: number;
  shareMode: ShareMode;
}

// ---------- Classes: the catalog's facts about the time a subject takes ----------

export type Kind = "LECTURE" | "RECITATION" | "LAB" | "DESIGN";
const KINDS: Kind[] = ["LECTURE", "RECITATION", "LAB", "DESIGN"];
export type ClassMeeting = { day: number; start: number; length: number };
export type ClassSection = { room: string; meetings: ClassMeeting[] };
export type ClassPart = { kind: Kind; arranged: boolean; sections: ClassSection[] };

interface ClassRecord {
  _id: string; // subject
  scheduleYear?: number;
  scheduleTerm?: Term;
  parts: ClassPart[];
  inClassHours?: number;
  outOfClassHours?: number;
  contactUnits?: number;
}

/** Reads parts in the form setClass takes, or answers null. Each meeting stays inside one day. */
function parseParts(text: string): ClassPart[] | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!Array.isArray(value)) return null;
  const meetingOk = (m: any) =>
    isWhole(m?.day, 0, 6) && isWhole(m?.start, 0, SLOTS_PER_DAY - 1) && isWhole(m?.length, 1, SLOTS_PER_DAY - m.start);
  const ok = value.every((p: any) =>
    KINDS.includes(p?.kind) && typeof p.arranged === "boolean" && Array.isArray(p.sections) &&
    p.sections.every((s: any) => typeof s?.room === "string" && Array.isArray(s.meetings) && s.meetings.every(meetingOk)));
  if (!ok) return null;
  return (value as ClassPart[]).map((p) => ({
    kind: p.kind,
    arranged: p.arranged,
    sections: p.sections.map((s) => ({ room: s.room, meetings: s.meetings.map(({ day, start, length }) => ({ day, start, length })) })),
  }));
}

/** EXACT for the class's schedule season, ESTIMATE for the same term in another year, else NONE. */
function scheduleFor(c: ClassRecord | null, year: number, term: Term): "EXACT" | "ESTIMATE" | "NONE" {
  if (!c || c.scheduleTerm !== term || c.parts.length === 0) return "NONE";
  return c.scheduleYear === year ? "EXACT" : "ESTIMATE";
}

/** Hours a week of the schedule: each part's most common section length (ties to the shorter). */
function scheduledHours(parts: ClassPart[]): number {
  let slots = 0;
  for (const p of parts) {
    const counts = new Map<number, number>();
    for (const s of p.sections) {
      const n = s.meetings.reduce((a, m) => a + m.length, 0);
      counts.set(n, (counts.get(n) ?? 0) + 1);
    }
    const [typical] = [...counts.entries()].sort(([a, na], [b, nb]) => nb - na || a - b)[0] ?? [0];
    slots += typical;
  }
  return slots / 4;
}

const ASSUMED_IN_CLASS = 3; // a typical 12-unit subject, 3-0-9
const round2 = (n: number) => Math.round(n * 100) / 100;

const DEFAULT_BUFFER = 10;
const DEFAULT_FACTOR = 2;
const TERMS: Term[] = ["IAP", "SPRING", "SUMMER", "FALL"];
const seasonKey = (t: TemplateRecord) => (t.year ?? 0) * 4 + TERMS.indexOf(t.term ?? "IAP");
const at = (hour: number, minute = 0) => hour * 4 + minute / 15;

/** The blocks of a new default week, every day: sleep 23–7, personal care 7–8, and three hours of meals. */
function defaultBlocks(): Omit<BlockRecord, "_id" | "template">[] {
  const daily = [
    { category: "system:sleep", start: at(23), length: 32 },
    { category: "system:care", start: at(7), length: 4 },
    { category: "system:eating", start: at(8), length: 2 },
    { category: "system:eating", start: at(12), length: 4 },
    { category: "system:eating", start: at(18), length: 6 },
  ];
  return Array.from({ length: 7 }, (_, day) => daily.map((b) => ({ ...b, day }))).flat();
}

export class TimeBudgetConcept {
  private readonly categories: Collection<CategoryRecord>;
  private readonly templates: Collection<TemplateRecord>;
  private readonly blocks: Collection<BlockRecord>;
  private readonly settings: Collection<SettingsRecord>;
  private readonly subjectFactors: Collection<SubjectFactorRecord>;
  private readonly roadSettings: Collection<RoadSettingsRecord>;
  private readonly classes: Collection<ClassRecord>;
  private indexed = false;

  constructor(db: Db) {
    this.categories = db.collection<CategoryRecord>("timebudget.categories");
    this.templates = db.collection<TemplateRecord>("timebudget.templates");
    this.blocks = db.collection<BlockRecord>("timebudget.blocks");
    this.settings = db.collection<SettingsRecord>("timebudget.settings");
    this.subjectFactors = db.collection<SubjectFactorRecord>("timebudget.subjectFactors");
    this.roadSettings = db.collection<RoadSettingsRecord>("timebudget.roadSettings");
    this.classes = db.collection<ClassRecord>("timebudget.classes");
  }

  async #ensureIndexes() {
    if (this.indexed) return;
    // A user has one default (year and term null) and one override per season.
    await this.templates.createIndex({ owner: 1, year: 1, term: 1 }, { unique: true });
    await this.blocks.createIndex({ template: 1 });
    await this.categories.createIndex({ owner: 1 });
    await this.subjectFactors.createIndex({ user: 1 });
    this.indexed = true;
  }

  // ---------- Templates ----------

  async #insertTemplate(owner: string, year: number | null, term: Term | null, blocks: Omit<BlockRecord, "_id" | "template">[]) {
    await this.#ensureIndexes();
    const _id = crypto.randomUUID();
    try {
      await this.templates.insertOne({ _id, owner, year, term });
    } catch (error) {
      // Two requests raced to make the same template; the other one's stands.
      if (error instanceof MongoServerError && error.code === 11000) {
        return (await this.templates.findOne({ owner, year, term }))!._id;
      }
      throw error;
    }
    if (blocks.length > 0) {
      await this.blocks.insertMany(blocks.map((b) => ({ ...b, _id: crypto.randomUUID(), template: _id })));
    }
    return _id;
  }

  async ensureDefault({ user }: { user: string }) {
    const found = await this.templates.findOne({ owner: user, year: null, term: null });
    if (found) return { template: found._id };
    return { template: await this.#insertTemplate(user, null, null, defaultBlocks()) };
  }

  async override({ user, year, term }: { user: string; year: number; term: Term }) {
    const base = await this.templates.findOne({ owner: user, year: null, term: null });
    if (!base) throw new NoDefault();
    const found = await this.templates.findOne({ owner: user, year, term });
    if (found) return { template: found._id };
    const copied = (await this.blocks.find({ template: base._id }).toArray())
      .map(({ category, day, start, length }) => ({ category, day, start, length }));
    return { template: await this.#insertTemplate(user, year, term, copied) };
  }

  async resetToDefault({ user, year, term }: { user: string; year: number; term: Term }) {
    const found = await this.templates.findOne({ owner: user, year, term });
    if (!found) throw new NotOverridden();
    await this.blocks.deleteMany({ template: found._id });
    await this.templates.deleteOne({ _id: found._id });
    return {};
  }

  // ---------- Blocks ----------

  /** The category if user has it (a system one or their own); refuses otherwise, and for a managed one. */
  async #paintable(user: string, category: string) {
    const found = SYSTEM.get(category) ?? (await this.categories.findOne({ _id: category, owner: user }));
    if (!found) throw new NoSuchCategory();
    if (found.managed) throw new ManagedCategory();
  }

  async #requireFree(template: string, slots: number[], except?: string) {
    const others = await this.blocks.find({ template, ...(except ? { _id: { $ne: except } } : {}) }).toArray();
    const taken = new Set(others.flatMap((b) => covers(b.day, b.start, b.length)));
    if (slots.some((s) => taken.has(s))) throw new Overlap();
  }

  async addBlock(
    { user, template, category, day, start, length }:
      { user: string; template: string; category: string; day: number; start: number; length: number },
  ) {
    if (!(await this.templates.findOne({ _id: template, owner: user }))) throw new NoSuchTemplate();
    await this.#paintable(user, category);
    if (!validSlot(day, start, length)) throw new BadSlot();
    await this.#requireFree(template, covers(day, start, length));
    const block = crypto.randomUUID();
    await this.#ensureIndexes();
    await this.blocks.insertOne({ _id: block, template, category, day, start, length });
    return { block };
  }

  async #requireOwnBlock(user: string, block: string) {
    const record = await this.blocks.findOne({ _id: block });
    if (!record || !(await this.templates.findOne({ _id: record.template, owner: user }))) throw new NoSuchBlock();
    return record;
  }

  async setBlock(
    { user, block, category, day, start, length }:
      { user: string; block: string; category: string; day: number; start: number; length: number },
  ) {
    const record = await this.#requireOwnBlock(user, block);
    await this.#paintable(user, category);
    if (!validSlot(day, start, length)) throw new BadSlot();
    await this.#requireFree(record.template, covers(day, start, length), block);
    await this.blocks.updateOne({ _id: block }, { $set: { category, day, start, length } });
    return {};
  }

  async removeBlock({ user, block }: { user: string; block: string }) {
    await this.#requireOwnBlock(user, block);
    await this.blocks.deleteOne({ _id: block });
    return {};
  }

  // ---------- Categories ----------

  /** Whether user has a category named name, ignoring case, other than except. */
  async #nameTaken(user: string, name: string, except?: string) {
    const lower = name.toLowerCase();
    if (SYSTEM_CATEGORIES.some((c) => c.name.toLowerCase() === lower)) return true;
    const own = await this.categories.find({ owner: user }).toArray();
    return own.some((c) => c._id !== except && c.name.toLowerCase() === lower);
  }

  async addCategory({ user, name, color }: { user: string; name: string; color: string }) {
    const trimmed = name.trim();
    if (!trimmed) throw new EmptyName();
    if (await this.#nameTaken(user, trimmed)) throw new NameTaken();
    await this.#ensureIndexes();
    const category = crypto.randomUUID();
    await this.categories.insertOne({ _id: category, owner: user, name: trimmed, color, managed: false });
    return { category };
  }

  async #requireOwnCategory(user: string, category: string) {
    if (!(await this.categories.findOne({ _id: category, owner: user }))) throw new NotYourCategory();
  }

  async renameCategory({ user, category, name }: { user: string; category: string; name: string }) {
    await this.#requireOwnCategory(user, category);
    const trimmed = name.trim();
    if (!trimmed) throw new EmptyName();
    if (await this.#nameTaken(user, trimmed, category)) throw new NameTaken();
    await this.categories.updateOne({ _id: category }, { $set: { name: trimmed } });
    return {};
  }

  async recolorCategory({ user, category, color }: { user: string; category: string; color: string }) {
    await this.#requireOwnCategory(user, category);
    await this.categories.updateOne({ _id: category }, { $set: { color } });
    return {};
  }

  async deleteCategory({ user, category }: { user: string; category: string }) {
    await this.#requireOwnCategory(user, category);
    await this.blocks.deleteMany({ category });
    await this.categories.deleteOne({ _id: category });
    return {};
  }

  // ---------- Settings ----------

  async setBuffer({ user, buffer }: { user: string; buffer: number }) {
    if (!(buffer >= 0 && buffer <= 50)) throw new BadBuffer();
    await this.settings.updateOne({ _id: user }, { $set: { buffer }, $setOnInsert: { factor: DEFAULT_FACTOR } }, { upsert: true });
    return {};
  }

  async setFactor({ user, factor }: { user: string; factor: number }) {
    if (!(factor >= 2 && factor <= 3)) throw new BadFactor();
    await this.settings.updateOne({ _id: user }, { $set: { factor }, $setOnInsert: { buffer: DEFAULT_BUFFER } }, { upsert: true });
    return {};
  }

  async setSubjectFactor({ user, subject, factor }: { user: string; subject: string; factor: number }) {
    if (!(factor >= 2 && factor <= 3)) throw new BadFactor();
    await this.#ensureIndexes();
    await this.subjectFactors.updateOne({ _id: `${user}|${subject}` }, { $set: { user, subject, factor } }, { upsert: true });
    return {};
  }

  async clearSubjectFactor({ user, subject }: { user: string; subject: string }) {
    const result = await this.subjectFactors.deleteOne({ _id: `${user}|${subject}` });
    if (result.deletedCount === 0) throw new NoSubjectFactor();
    return {};
  }

  async #setRoad(road: string, patch: Partial<RoadSettingsRecord>, unset: Record<string, ""> = {}) {
    const defaults: Partial<RoadSettingsRecord> = { mode: "SOFT", shareMode: "METRICS" };
    for (const k of Object.keys(patch)) delete defaults[k as keyof RoadSettingsRecord];
    await this.roadSettings.updateOne(
      { _id: road },
      { $set: patch, $setOnInsert: defaults, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { upsert: true },
    );
  }

  async setMode({ road, mode }: { road: string; mode: string }) {
    if (mode !== "SOFT" && mode !== "HARD") throw new BadMode();
    await this.#setRoad(road, { mode });
    return {};
  }

  async setRoadBuffer({ road, buffer }: { road: string; buffer: number }) {
    if (!(buffer >= 0 && buffer <= 50)) throw new BadBuffer();
    await this.#setRoad(road, { buffer });
    return {};
  }

  async clearRoadBuffer({ road }: { road: string }) {
    await this.roadSettings.updateOne({ _id: road }, { $unset: { buffer: "" } });
    return {};
  }

  async setShareMode({ road, shareMode }: { road: string; shareMode: string }) {
    if (shareMode !== "METRICS" && shareMode !== "DETAILS") throw new BadShareMode();
    await this.#setRoad(road, { shareMode });
    return {};
  }

  // ---------- Classes ----------

  async setClass(
    { subject, scheduleYear, scheduleTerm, parts, inClassHours, outOfClassHours, contactUnits }: {
      subject: string; scheduleYear?: number; scheduleTerm?: Term; parts: string;
      inClassHours?: number; outOfClassHours?: number; contactUnits?: number;
    },
  ) {
    const parsed = parseParts(parts);
    if (!parsed || (scheduleYear === undefined) !== (scheduleTerm === undefined)) throw new BadClass();
    const record: ClassRecord = { _id: subject, parts: parsed };
    if (scheduleYear !== undefined) Object.assign(record, { scheduleYear, scheduleTerm });
    if (inClassHours !== undefined) record.inClassHours = inClassHours;
    if (outOfClassHours !== undefined) record.outOfClassHours = outOfClassHours;
    if (contactUnits !== undefined) record.contactUnits = contactUnits;
    await this.classes.replaceOne({ _id: subject }, record, { upsert: true });
    return {};
  }

  async removeClass({ subject }: { subject: string }) {
    await this.classes.deleteOne({ _id: subject });
    return {};
  }

  async forgetRoad({ road }: { road: string }) {
    await this.roadSettings.deleteOne({ _id: road });
    return {};
  }

  // ---------- Queries ----------

  async _default({ user }: { user: string }) {
    const found = await this.templates.findOne({ owner: user, year: null, term: null });
    return found ? [{ template: found._id }] : [];
  }

  async _templateFor({ user, year, term }: { user: string; year: number; term: Term }) {
    const override = await this.templates.findOne({ owner: user, year, term });
    if (override) return [{ template: override._id, overridden: true }];
    const base = await this.templates.findOne({ owner: user, year: null, term: null });
    return base ? [{ template: base._id, overridden: false }] : [];
  }

  async _overrides({ user }: { user: string }) {
    const found = await this.templates.find({ owner: user, year: { $ne: null } }).toArray();
    return found
      .sort((a, b) => seasonKey(a) - seasonKey(b))
      .map((t) => ({ year: t.year as number, term: t.term as Term, template: t._id }));
  }

  async _categories({ user }: { user: string }) {
    const own = await this.categories.find({ owner: user }).toArray();
    own.sort((a, b) => a.name.localeCompare(b.name));
    return [
      ...SYSTEM_CATEGORIES.map((c) => ({ category: c._id, name: c.name, color: c.color, own: false, managed: c.managed })),
      ...own.map((c) => ({ category: c._id, name: c.name, color: c.color, own: true, managed: false })),
    ];
  }

  async _blocks({ template }: { template: string }) {
    const found = await this.blocks.find({ template }).toArray();
    return found
      .sort((a, b) => a.day - b.day || a.start - b.start)
      .map(({ _id, category, day, start, length }) => ({ block: _id, category, day, start, length }));
  }

  async _rollup({ template }: { template: string }) {
    const found = await this.blocks.find({ template }).toArray();
    const owner = (await this.templates.findOne({ _id: template }))?.owner;
    // category -> day -> slots
    const slots = new Map<string, number[]>();
    for (const b of found) {
      const days = slots.get(b.category) ?? Array<number>(7).fill(0);
      for (const s of covers(b.day, b.start, b.length)) days[Math.floor(s / SLOTS_PER_DAY)]++;
      slots.set(b.category, days);
    }
    const order = owner ? (await this._categories({ user: owner })).map((c) => c.category) : SYSTEM_CATEGORIES.map((c) => c._id);
    const rank = (c: string) => (order.indexOf(c) === -1 ? order.length : order.indexOf(c));
    return [...slots.entries()]
      .sort(([a], [b]) => rank(a) - rank(b))
      .flatMap(([category, days]) =>
        days.flatMap((n, day) => (n > 0 ? [{ category, day, hours: n / 4 }] : [])));
  }

  async _blocked({ template }: { template: string }) {
    const found = await this.blocks.find({ template }).toArray();
    const covered = new Set(found.flatMap((b) => covers(b.day, b.start, b.length)));
    const blocked = covered.size / 4;
    return { blocked, free: SLOTS_PER_WEEK / 4 - blocked };
  }

  async _settings({ user }: { user: string }) {
    const found = await this.settings.findOne({ _id: user });
    return { buffer: found?.buffer ?? DEFAULT_BUFFER, factor: found?.factor ?? DEFAULT_FACTOR };
  }

  async _subjectFactors({ user }: { user: string }) {
    const found = await this.subjectFactors.find({ user }).toArray();
    return found
      .sort((a, b) => (a.subject < b.subject ? -1 : a.subject > b.subject ? 1 : 0))
      .map(({ subject, factor }) => ({ subject, factor }));
  }

  async _classHours({ user, subject, year, term }: { user: string; subject: string; year: number; term: Term }) {
    const [c, settings, own] = await Promise.all([
      this.classes.findOne({ _id: subject }),
      this._settings({ user }),
      this.subjectFactors.findOne({ _id: `${user}|${subject}` }),
    ]);
    const factor = own?.factor ?? settings.factor;
    const fit = scheduleFor(c, year, term);
    const arranged = fit !== "NONE" && c!.parts.some((p) => p.arranged);
    let inClass: number;
    let inClassSource: "SCHEDULE" | "EVALUATIONS" | "UNITS" | "ASSUMED";
    if (fit !== "NONE" && !arranged) [inClass, inClassSource] = [scheduledHours(c!.parts), "SCHEDULE"];
    else if (c?.inClassHours !== undefined) [inClass, inClassSource] = [c.inClassHours, "EVALUATIONS"];
    else if (c?.contactUnits !== undefined) [inClass, inClassSource] = [c.contactUnits, "UNITS"];
    else [inClass, inClassSource] = [ASSUMED_IN_CLASS, "ASSUMED"];
    const fromEvaluations = c?.outOfClassHours !== undefined;
    const outOfClass = fromEvaluations ? c!.outOfClassHours! : round2(inClass * factor);
    return {
      known: c !== null,
      inClass: round2(inClass),
      inClassSource,
      outOfClass,
      outOfClassSource: fromEvaluations ? "EVALUATIONS" : "FORMULA",
      factor,
      total: round2(inClass + outOfClass),
      schedule: arranged ? "ARRANGED" : fit,
    };
  }

  async _sections({ subject, year, term }: { subject: string; year: number; term: Term }) {
    const c = await this.classes.findOne({ _id: subject });
    if (scheduleFor(c, year, term) === "NONE") return [];
    return c!.parts.flatMap((p) =>
      p.sections.flatMap((s, i) =>
        s.meetings.map((m) => ({ kind: p.kind, section: i + 1, room: s.room, day: m.day, start: m.start, length: m.length }))));
  }

  async _roadSettings({ road }: { road: string }) {
    const found = await this.roadSettings.findOne({ _id: road });
    return {
      mode: found?.mode ?? ("SOFT" as Mode),
      hasBuffer: found?.buffer !== undefined && found?.buffer !== null,
      buffer: found?.buffer ?? 0,
      shareMode: found?.shareMode ?? ("METRICS" as ShareMode),
    };
  }
}
