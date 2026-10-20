import { type Collection, type Db } from "mongodb";

// IAP < SPRING < SUMMER < FALL
const TERM_ORDER = ["IAP", "SPRING", "SUMMER", "FALL"];

// The seasons of the academic year that starts in the FALL of startYear.
const academicYear = (startYear: number) => [
  { year: startYear, term: "FALL" },
  { year: startYear + 1, term: "IAP" },
  { year: startYear + 1, term: "SPRING" },
  { year: startYear + 1, term: "SUMMER" },
];

export class LoadFailed extends Error {
  constructor(message = "The subject listing or the ratings could not be retrieved.") {
    super(message);
  }
}

export class CourseOfferingConcept {
  private readonly courses: Collection<any>;
  private readonly dependencies: Collection<any>;
  private readonly cancellations: Collection<any>;
  private readonly ratings: Collection<any>;
  private indexed = false;

  constructor(db: Db) {
    this.courses = db.collection("courseOffering.courses");
    this.dependencies = db.collection("courseOffering.dependencies");
    this.cancellations = db.collection("courseOffering.cancellations");
    this.ratings = db.collection("courseOffering.ratings");
  }

  async load({ subjectListingURL, ratingsURL }: { subjectListingURL: string; ratingsURL: string }) {
    if (!this.indexed) {
      await this.courses.createIndex({ subject: 1 }, { unique: true });
      await this.dependencies.createIndex({ course: 1, kind: 1 });
      await this.cancellations.createIndex({ subject: 1, year: 1, term: 1 }, { unique: true });
      await this.ratings.createIndex({ course: 1 }, { unique: true });
      this.indexed = true;
    }

    try {
      const responses = await Promise.all([fetch(subjectListingURL), fetch(ratingsURL)]);
      if (responses.some((r) => !r.ok)) throw new Error("fetch failed");
      // Parsing/fetching logic integration point to populate:
      // - this.courses       (use this.#mergeTerms for `terms`)
      // - this.dependencies  (delete the course's old ones, insert {course, kind, options, count})
      // - this.cancellations (call this.#replaceCancellations for each subject)
      // - this.ratings
    } catch {
      throw new LoadFailed();
    }
    return { count: 0 };
  }

  // Loading a listing replaces the terms it covers and keeps the others.
  #mergeTerms(existing: string[], coveredByListing: string[], fromListing: string[]) {
    const kept = existing.filter((t) => !coveredByListing.includes(t));
    return TERM_ORDER.filter((t) => kept.includes(t) || fromListing.includes(t));
  }

  // startYear is the FALL year of the listing's academic year.
  async #replaceCancellations(subject: string, startYear: number, offering: string) {
    const thisYear = academicYear(startYear);
    const nextYear = academicYear(startYear + 1);
    await this.cancellations.deleteMany({ subject, $or: [...thisYear, ...nextYear] });
    const toAdd =
      offering === "Not offered THIS year" ? thisYear :
      offering === "Not offered NEXT year" ? nextYear :
      offering === "Not currently listed" ? [...thisYear, ...nextYear] : [];
    if (toAdd.length > 0) {
      await this.cancellations.insertMany(toAdd.map((s) => ({ subject, ...s })));
    }
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
      .map((r) => ({ year: r.year, term: r.term }))
      .sort((a, b) => a.year - b.year || TERM_ORDER.indexOf(a.term) - TERM_ORDER.indexOf(b.term));
  }

  async _ratings({ course }: { course: string }) {
    const ratingRecord = await this.ratings.findOne({ course });
    if (!ratingRecord) return { found: false, classRating: 0, professorRating: 0, url: "" };
    return {
      found: true,
      classRating: ratingRecord.classRating,
      professorRating: ratingRecord.professorRating,
      url: ratingRecord.url,
    };
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
    const matches = await this.courses.find(filter).toArray();
    return matches.map((m) => ({
      course: m.subject,
      name: m.name,
      courseId: m.courseId,
      level: m.level,
      units: m.units ?? "",
      unitsKnown: /^\d+(\.\d+)?(-\d+(\.\d+)?)*$/.test(m.units ?? ""),
    }));
  }

  async _terms({ course }: { course: string }): Promise<{ term: string }[]> {
    const record = await this.courses.findOne({ subject: course });
    return (record?.terms ?? []).map((term: string) => ({ term }));
  }

  async _schedule({ course }: { course: string }) {
    const record = await this.courses.findOne({ subject: course });
    if (!record || !record.meetingTimes) return { found: false, units: "", meetingTimes: "", location: "" };
    return {
      found: true,
      units: record.units,
      meetingTimes: record.meetingTimes,
      location: record.location,
    };
  }
}