import type { Collection, Db } from "mongodb";

export class Refusal extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}
export class AlreadyTaken extends Refusal {
  constructor(message = "That subject is already in your history.") {
    super("ALREADY_TAKEN", message);
  }
}
export class NotPrior extends Refusal {
  constructor(message = "That subject is not in your prior credit.") {
    super("NOT_PRIOR", message);
  }
}
export class BadStart extends Refusal {
  constructor(message = "You must have started in a Fall or Spring semester.") {
    super("BAD_START", message);
  }
}
export class NotPast extends Refusal {
  constructor(message = "That semester is not one of your past semesters.") {
    super("NOT_PAST", message);
  }
}
export class Locked extends Refusal {
  constructor(message = "That semester is locked. Unlock it to change it.") {
    super("LOCKED", message);
  }
}
export class NotTaken extends Refusal {
  constructor(message = "That subject is not in that semester.") {
    super("NOT_TAKEN", message);
  }
}
export class NotLocked extends Refusal {
  constructor(message = "That semester is not locked.") {
    super("NOT_LOCKED", message);
  }
}

export type Term = "IAP" | "SPRING" | "SUMMER" | "FALL";

interface Profile {
  _id: string; // user
  startYear?: number;
  startTerm?: Term;
  priorDone: boolean;
  prior: string[];
}

interface HistoryRecord {
  _id: string; // `${user}|${year}|${term}`
  user: string;
  year: number;
  term: Term;
  subjects: string[];
  answered: boolean;
  locked: boolean;
}

// Seasons are ordered by year, then term (IAP < SPRING < SUMMER < FALL).
const TERMS: Term[] = ["IAP", "SPRING", "SUMMER", "FALL"];
const keyOf = (year: number, term: Term) => year * 4 + TERMS.indexOf(term);
const seasonOf = (key: number) => ({ year: Math.floor(key / 4), term: TERMS[key % 4] });
const recordId = (user: string, year: number, term: Term) => `${user}|${year}|${term}`;
const bySubject = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** The season a date falls in: January is IAP, February to May SPRING, June to August SUMMER, the rest FALL. */
export function seasonAt(date: Date) {
  const month = date.getMonth();
  const term: Term = month === 0 ? "IAP" : month <= 4 ? "SPRING" : month <= 7 ? "SUMMER" : "FALL";
  return { year: date.getFullYear(), term };
}

export class HistoryConcept {
  private readonly profiles: Collection<Profile>;
  private readonly records: Collection<HistoryRecord>;
  private indexed = false;

  // now is the clock that decides the current season; tests give a fixed one.
  constructor(db: Db, private readonly now: () => Date = () => new Date()) {
    this.profiles = db.collection<Profile>("history.profiles");
    this.records = db.collection<HistoryRecord>("history.records");
  }

  async #ensureIndexes() {
    if (this.indexed) return;
    await this.records.createIndex({ user: 1 });
    this.indexed = true;
  }

  #currentKey() {
    const { year, term } = seasonAt(this.now());
    return keyOf(year, term);
  }

  async #profile(user: string): Promise<Profile> {
    return (await this.profiles.findOne({ _id: user })) ?? { _id: user, priorDone: false, prior: [] };
  }

  async #ensureProfile(user: string) {
    await this.profiles.updateOne(
      { _id: user },
      { $setOnInsert: { priorDone: false, prior: [] } },
      { upsert: true },
    );
  }

  /** Whether subject is anywhere in user's history: their prior credit or a Record. */
  async #inHistory(user: string, subject: string) {
    const [profile, record] = await Promise.all([
      this.profiles.findOne({ _id: user, prior: subject }),
      this.records.findOne({ user, subjects: subject }),
    ]);
    return profile !== null || record !== null;
  }

  /** The keys of the past seasons of a profile: from its start up to, not including, the current one. */
  #pastKeys(profile: Profile) {
    if (profile.startYear === undefined || profile.startTerm === undefined) return [];
    const keys = [];
    for (let k = keyOf(profile.startYear, profile.startTerm); k < this.#currentKey(); k++) keys.push(k);
    return keys;
  }

  async #requirePast(user: string, year: number, term: Term) {
    const profile = await this.#profile(user);
    if (!TERMS.includes(term) || !this.#pastKeys(profile).includes(keyOf(year, term))) throw new NotPast();
  }

  async addPrior({ user, subject }: { user: string; subject: string }) {
    if (await this.#inHistory(user, subject)) throw new AlreadyTaken();
    await this.#ensureProfile(user);
    await this.profiles.updateOne({ _id: user }, { $addToSet: { prior: subject } });
    return {};
  }

  async removePrior({ user, subject }: { user: string; subject: string }) {
    const result = await this.profiles.updateOne({ _id: user, prior: subject }, { $pull: { prior: subject } });
    if (result.matchedCount === 0) throw new NotPrior();
    return {};
  }

  async finishPrior({ user }: { user: string }) {
    await this.#ensureProfile(user);
    await this.profiles.updateOne({ _id: user }, { $set: { priorDone: true } });
    return {};
  }

  async setStart({ user, year, term }: { user: string; year: number; term: Term }) {
    if (term !== "FALL" && term !== "SPRING") throw new BadStart();
    await this.#ensureIndexes();
    await this.#ensureProfile(user);
    await this.profiles.updateOne({ _id: user }, { $set: { startYear: year, startTerm: term } });
    // Records outside the new past seasons no longer describe a past season.
    const start = keyOf(year, term);
    const current = this.#currentKey();
    const records = await this.records.find({ user }).toArray();
    const outside = records.filter((r) => keyOf(r.year, r.term) < start || keyOf(r.year, r.term) >= current);
    if (outside.length > 0) await this.records.deleteMany({ _id: { $in: outside.map((r) => r._id) } });
    return {};
  }

  async addTaken({ user, year, term, subject }: { user: string; year: number; term: Term; subject: string }) {
    await this.#requirePast(user, year, term);
    const _id = recordId(user, year, term);
    if ((await this.records.findOne({ _id }))?.locked) throw new Locked();
    if (await this.#inHistory(user, subject)) throw new AlreadyTaken();
    await this.#ensureIndexes();
    await this.records.updateOne(
      { _id },
      { $setOnInsert: { user, year, term, answered: false, locked: false }, $addToSet: { subjects: subject } },
      { upsert: true },
    );
    return {};
  }

  async removeTaken({ user, year, term, subject }: { user: string; year: number; term: Term; subject: string }) {
    const record = await this.records.findOne({ _id: recordId(user, year, term) });
    if (!record || !record.subjects.includes(subject)) throw new NotTaken();
    if (record.locked) throw new Locked();
    await this.records.updateOne({ _id: record._id }, { $pull: { subjects: subject } });
    return {};
  }

  async lock({ user, year, term }: { user: string; year: number; term: Term }) {
    await this.#requirePast(user, year, term);
    await this.#ensureIndexes();
    await this.records.updateOne(
      { _id: recordId(user, year, term) },
      { $setOnInsert: { user, year, term, subjects: [] }, $set: { answered: true, locked: true } },
      { upsert: true },
    );
    return {};
  }

  async unlock({ user, year, term }: { user: string; year: number; term: Term }) {
    const result = await this.records.updateOne(
      { _id: recordId(user, year, term), locked: true },
      { $set: { locked: false } },
    );
    if (result.matchedCount === 0) throw new NotLocked();
    return {};
  }

  // ---------- Queries ----------

  /** The Records of user for their past seasons, by season key. */
  async #pastRecords(user: string, profile: Profile) {
    const past = new Set(this.#pastKeys(profile));
    const records = await this.records.find({ user }).toArray();
    return new Map(records.filter((r) => past.has(keyOf(r.year, r.term))).map((r) => [keyOf(r.year, r.term), r]));
  }

  async _profile({ user }: { user: string }) {
    const profile = await this.#profile(user);
    const current = seasonAt(this.now());
    const started = profile.startYear !== undefined && profile.startTerm !== undefined;
    const records = await this.#pastRecords(user, profile);
    const pending = this.#pastKeys(profile).some((k) => !records.get(k)?.answered);
    return {
      started,
      startYear: profile.startYear ?? 0,
      startTerm: profile.startTerm ?? ("FALL" as Term),
      priorDone: profile.priorDone,
      currentYear: current.year,
      currentTerm: current.term,
      complete: profile.priorDone && started && !pending,
    };
  }

  async _prior({ user }: { user: string }) {
    const profile = await this.#profile(user);
    return [...profile.prior].sort(bySubject).map((subject) => ({ subject }));
  }

  async _seasons({ user }: { user: string }) {
    const profile = await this.#profile(user);
    const records = await this.#pastRecords(user, profile);
    return this.#pastKeys(profile).map((k) => {
      const r = records.get(k);
      return { ...seasonOf(k), answered: r?.answered ?? false, locked: r?.locked ?? false, count: r?.subjects.length ?? 0 };
    });
  }

  async _taken({ user, year, term }: { user: string; year: number; term: Term }) {
    const record = await this.records.findOne({ _id: recordId(user, year, term) });
    return [...(record?.subjects ?? [])].sort(bySubject).map((subject) => ({ subject }));
  }

  async _pending({ user }: { user: string }) {
    const profile = await this.#profile(user);
    const records = await this.#pastRecords(user, profile);
    const first = this.#pastKeys(profile).find((k) => !records.get(k)?.answered);
    return first === undefined ? [] : [seasonOf(first)];
  }

  async _encoded({ user }: { user: string }) {
    const profile = await this.#profile(user);
    const records = await this.#pastRecords(user, profile);
    const seasons = [...records.entries()]
      .filter(([, r]) => r.answered)
      .sort(([a], [b]) => a - b)
      .map(([, r]) => ({ year: r.year, term: r.term, subjects: [...r.subjects].sort(bySubject) }));
    return { history: JSON.stringify({ prior: [...profile.prior].sort(bySubject), seasons }) };
  }
}
