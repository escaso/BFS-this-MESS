import { type Collection, type Db } from "mongodb";

// IAP < SPRING < SUMMER < FALL
const TERM_ORDER = ["IAP", "SPRING", "SUMMER", "FALL"];
const OFFERINGS = ["Offered normally", "Not offered THIS year", "Not offered NEXT year", "Not currently listed"];

// The seasons of the academic year that starts in the FALL of startYear.
const academicYear = (startYear: number) => [
  { year: startYear, term: "FALL" },
  { year: startYear + 1, term: "IAP" },
  { year: startYear + 1, term: "SPRING" },
  { year: startYear + 1, term: "SUMMER" },
];

// The format of a catalog snapshot, as written by scripts/build-catalog.ts.
export type SnapshotDependency = { count: number; options: string[] };
export type SnapshotCourse = {
  subject: string;
  name: string;
  courseId: string;
  description: string;
  lecturer: string;
  level: string;
  terms: string[];
  offering: string;
  canBeRepeated: boolean;
  prerequisitesText: string;
  corequisitesText: string;
  units?: string;
  meetingTimes?: string;
  location?: string;
  prerequisites: SnapshotDependency[];
  corequisites: SnapshotDependency[];
  rating?: { classRating: number; url: string };
  // Facts for Constrain that CourseOffering does not keep (see the composition).
  totalUnits: number;
  // Students who usually take it; absent in snapshots made before it existed.
  enrollment?: number;
  // Facts for TimeBudget, absent in snapshots made before they existed: the raw Fireroad
  // schedule (for scheduleSeason), hours a week from subject evaluations, and lecture + lab units.
  schedule?: string;
  inClassHours?: number;
  outOfClassHours?: number;
  contactUnits?: number;
};
export type Snapshot = {
  id: string;
  source: string;
  academicYear: number;
  /** The season the schedules are for; absent when no subject has one. */
  scheduleSeason?: { year: number; term: string };
  courses: SnapshotCourse[];
};

export class LoadFailed extends Error {
  constructor(message = "The catalog snapshot could not be parsed.") {
    super(message);
  }
}

const isString = (v: unknown): v is string => typeof v === "string";
const isOptionalString = (v: unknown) => v === undefined || v === null || isString(v);
const isDependency = (d: any) =>
  Number.isInteger(d?.count) && d.count >= 1 && Array.isArray(d.options) && d.options.every(isString);

function isCourse(c: any): c is SnapshotCourse {
  return (
    isString(c?.subject) && c.subject !== "" &&
    ["name", "courseId", "description", "lecturer", "level", "prerequisitesText", "corequisitesText"]
      .every((k) => isString(c[k])) &&
    Array.isArray(c.terms) && c.terms.every((t: unknown) => TERM_ORDER.includes(t as string)) &&
    OFFERINGS.includes(c.offering) &&
    typeof c.canBeRepeated === "boolean" &&
    ["units", "meetingTimes", "location"].every((k) => isOptionalString(c[k])) &&
    Array.isArray(c.prerequisites) && c.prerequisites.every(isDependency) &&
    Array.isArray(c.corequisites) && c.corequisites.every(isDependency) &&
    (c.rating === undefined || c.rating === null ||
      (typeof c.rating.classRating === "number" && isString(c.rating.url)))
  );
}

function parseSnapshot(text: string): Snapshot {
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new LoadFailed();
  }
  if (
    !isString(parsed?.id) || parsed.id === "" ||
    !Number.isInteger(parsed.academicYear) ||
    !Array.isArray(parsed.courses) || !parsed.courses.every(isCourse) ||
    new Set(parsed.courses.map((c: SnapshotCourse) => c.subject)).size !== parsed.courses.length
  ) {
    throw new LoadFailed();
  }
  return parsed;
}

const sortTerms = (terms: string[]) => TERM_ORDER.filter((t) => terms.includes(t));

export class CourseOfferingConcept {
  private readonly courses: Collection<any>;
  private readonly dependencies: Collection<any>;
  private readonly cancellations: Collection<any>;
  private readonly ratings: Collection<any>;
  private readonly catalog: Collection<any>;
  private indexed = false;

  constructor(db: Db) {
    this.courses = db.collection("courseOffering.courses");
    this.dependencies = db.collection("courseOffering.dependencies");
    this.cancellations = db.collection("courseOffering.cancellations");
    this.ratings = db.collection("courseOffering.ratings");
    this.catalog = db.collection("courseOffering.catalog");
  }

  async load({ snapshot }: { snapshot: string }) {
    const { id, academicYear: startYear, courses } = parseSnapshot(snapshot);

    if (!this.indexed) {
      await this.courses.createIndex({ subject: 1 }, { unique: true });
      await this.dependencies.createIndex({ course: 1, kind: 1 });
      await this.cancellations.createIndex({ subject: 1, year: 1, term: 1 }, { unique: true });
      await this.ratings.createIndex({ course: 1 }, { unique: true });
      this.indexed = true;
    }

    // The catalog has thousands of subjects, so each collection is written in bulk.
    const subjects = courses.map((c) => c.subject);
    const coveredSeasons = [...academicYear(startYear), ...academicYear(startYear + 1)];

    if (courses.length > 0) {
      await this.courses.bulkWrite(
        courses.map((c) => ({
          replaceOne: {
            filter: { subject: c.subject },
            replacement: {
              subject: c.subject,
              name: c.name,
              courseId: c.courseId,
              description: c.description,
              lecturer: c.lecturer,
              level: c.level,
              terms: sortTerms(c.terms),
              offering: c.offering,
              canBeRepeated: c.canBeRepeated,
              prerequisitesText: c.prerequisitesText,
              corequisitesText: c.corequisitesText,
              ...(c.units ? { units: c.units } : {}),
              ...(c.meetingTimes ? { meetingTimes: c.meetingTimes } : {}),
              ...(c.location ? { location: c.location } : {}),
            },
            upsert: true,
          },
        })),
        { ordered: false },
      );

      await this.dependencies.deleteMany({ course: { $in: subjects } });
      const dependencies = courses.flatMap((c) => [
        ...c.prerequisites.map((d) => ({ course: c.subject, kind: "PREREQUISITE", ...d })),
        ...c.corequisites.map((d) => ({ course: c.subject, kind: "COREQUISITE", ...d })),
      ]);
      if (dependencies.length > 0) {
        // Ordered, so that _id order follows the order of the snapshot.
        await this.dependencies.insertMany(dependencies.map(({ course, kind, count, options }) => ({ course, kind, count, options })));
      }

      await this.ratings.deleteMany({ course: { $in: subjects } });
      const ratings = courses.filter((c) => c.rating).map((c) => ({ course: c.subject, ...c.rating! }));
      if (ratings.length > 0) await this.ratings.insertMany(ratings, { ordered: false });

      await this.cancellations.deleteMany({ subject: { $in: subjects }, $or: coveredSeasons });
      const cancellations = courses.flatMap((c) =>
        this.#cancelledSeasons(startYear, c.offering).map((s) => ({ subject: c.subject, ...s })),
      );
      if (cancellations.length > 0) await this.cancellations.insertMany(cancellations, { ordered: false });
    }

    await this.catalog.updateOne({}, { $set: { snapshot: id } }, { upsert: true });
    return { count: courses.length };
  }

  // startYear is the FALL year of the snapshot's academic year.
  #cancelledSeasons(startYear: number, offering: string) {
    const thisYear = academicYear(startYear);
    const nextYear = academicYear(startYear + 1);
    return offering === "Not offered THIS year" ? thisYear :
      offering === "Not offered NEXT year" ? nextYear :
      offering === "Not currently listed" ? [...thisYear, ...nextYear] : [];
  }

  async _loadedSnapshot(_: Record<string, never> = {}) {
    const record = await this.catalog.findOne({});
    return record?.snapshot ? { found: true, id: record.snapshot as string } : { found: false, id: "" };
  }

  async _course({ course }: { course: string }) {
    const m = await this.courses.findOne({ subject: course });
    if (!m) {
      return {
        found: false, name: "", courseId: "", description: "", lecturer: "", level: "", units: "",
        offering: "", canBeRepeated: false, prerequisitesText: "", corequisitesText: "",
      };
    }
    return {
      found: true,
      name: m.name as string,
      courseId: m.courseId as string,
      description: m.description as string,
      lecturer: m.lecturer as string,
      level: m.level as string,
      units: (m.units ?? "") as string,
      offering: m.offering as string,
      canBeRepeated: !!m.canBeRepeated,
      prerequisitesText: (m.prerequisitesText ?? "") as string,
      corequisitesText: (m.corequisitesText ?? "") as string,
    };
  }

  async _prerequisites(
    { course }: { course: string },
  ): Promise<{ dependency: string; count: number; prerequisite: string }[]> {
    const deps = await this.dependencies.find({ course, kind: "PREREQUISITE" }).sort({ _id: 1 }).toArray();
    return deps.flatMap((d) =>
      d.options.map((prerequisite: string) => ({ dependency: String(d._id), count: d.count, prerequisite })),
    );
  }

  async _corequisites(
    { course }: { course: string },
  ): Promise<{ dependency: string; count: number; corequisite: string }[]> {
    const deps = await this.dependencies.find({ course, kind: "COREQUISITE" }).sort({ _id: 1 }).toArray();
    return deps.flatMap((d) =>
      d.options.map((corequisite: string) => ({ dependency: String(d._id), count: d.count, corequisite })),
    );
  }

  async _isOffered({ course, year, term }: { course: string; year: number; term: string }) {
    const record = await this.courses.findOne({ subject: course });
    if (!record) return { offered: false };
    const cancelled = await this.cancellations.findOne({ subject: course, year, term });
    return { offered: !!record.terms?.includes(term) && !cancelled };
  }

  async _cancellations({ course }: { course: string }) {
    const records = await this.cancellations.find({ subject: course }).toArray();
    return records
      .map((r) => ({ year: r.year as number, term: r.term as string }))
      .sort((a, b) => a.year - b.year || TERM_ORDER.indexOf(a.term) - TERM_ORDER.indexOf(b.term));
  }

  async _ratings({ course }: { course: string }) {
    const ratingRecord = await this.ratings.findOne({ course });
    if (!ratingRecord) return { found: false, classRating: 0, url: "" };
    return { found: true, classRating: ratingRecord.classRating as number, url: ratingRecord.url as string };
  }

  async _search({ query, level, term }: { query?: string; level?: string; term?: string }) {
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const filter: Record<string, any> = {};
    if (query) {
      const regex = new RegExp(esc(query), "i");
      filter.$or = [{ name: regex }, { description: regex }, { courseId: regex }];
    }
    if (level) filter.level = new RegExp(`^${esc(level)}$`, "i");
    if (term) filter.terms = term;
    const matches = await this.courses
      .find(filter, { projection: { subject: 1, name: 1, courseId: 1, level: 1, units: 1, terms: 1 } })
      .sort({ courseId: 1 })
      .collation({ locale: "en", numericOrdering: true }) // 6.1010 before 18.01
      .toArray();
    return matches.map((m) => ({
      course: m.subject as string,
      name: m.name as string,
      courseId: m.courseId as string,
      level: m.level as string,
      units: (m.units ?? "") as string,
      unitsKnown: /^\d+(\.\d+)?(-\d+(\.\d+)?)*$/.test(m.units ?? ""),
      terms: sortTerms(m.terms ?? []).join(" "),
    }));
  }

  async _matches({ course, query }: { course: string; query: string }) {
    const m = await this.courses.findOne({ subject: course }, { projection: { name: 1, description: 1, courseId: 1 } });
    if (!m) return { matches: false };
    const q = query.toLowerCase();
    return { matches: [m.name, m.description, m.courseId].some((f) => String(f ?? "").toLowerCase().includes(q)) };
  }

  async _terms({ course }: { course: string }): Promise<{ term: string }[]> {
    const record = await this.courses.findOne({ subject: course });
    return sortTerms(record?.terms ?? []).map((term: string) => ({ term }));
  }

  async _schedule({ course }: { course: string }) {
    const record = await this.courses.findOne({ subject: course });
    if (!record || !record.meetingTimes) return { found: false, units: "", meetingTimes: "", location: "" };
    return {
      found: true,
      units: (record.units ?? "") as string,
      meetingTimes: record.meetingTimes as string,
      location: (record.location ?? "") as string,
    };
  }
}
