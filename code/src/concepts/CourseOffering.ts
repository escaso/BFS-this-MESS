import { type Collection, type Db } from "mongodb";

export class CourseOfferingConcept {
  private readonly courses: Collection<any>;
  private readonly prerequisites: Collection<any>;
  private readonly corequisites: Collection<any>;
  private readonly ratings: Collection<any>;
  private indexed = false;

  constructor(db: Db) {
    this.courses = db.collection("courseOffering.courses");
    this.prerequisites = db.collection("courseOffering.prerequisites");
    this.corequisites = db.collection("courseOffering.corequisites");
    this.ratings = db.collection("courseOffering.ratings");
  }

  async load({ subjectListingURL, ratingsURL }: { subjectListingURL: string; ratingsURL: string }) {
    if (!this.indexed) {
      await this.courses.createIndex({ subject: 1 }, { unique: true });
      await this.prerequisites.createIndex({ course: 1, prerequisite: 1 }, { unique: true });
      await this.corequisites.createIndex({ course: 1, corequisite: 1 }, { unique: true });
      await this.ratings.createIndex({ course: 1 }, { unique: true });
      this.indexed = true;
    }
    // Parsing/fetching logic integration point to populate:
    // - this.courses
    // - this.prerequisites
    // - this.corequisites
    // - this.ratings
    return { count: 0 };
  }

  async _prerequisites({ course }: { course: string }) {
    const records = await this.prerequisites.find({ course }).toArray();
    if (!records || records.length === 0) return [];
    return records.map((r) => ({ prerequisite: r.prerequisite }));
  }

  async _corequisites({ course }: { course: string }) {
    const records = await this.corequisites.find({ course }).toArray();
    if (!records || records.length === 0) return [];
    return records.map((r) => ({ corequisite: r.corequisite }));
  }

  async _isOffered({ course, semester }: { course: string; semester: string }) {
    const record = await this.courses.findOne({ subject: course });
    if (!record) return { offered: false };
    const offered = record.terms?.includes(semester) && record.offering !== "Not offered THIS year";
    return { offered };
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

  async _search({ query }: { query: string }) {
    const regex = new RegExp(query, "i");
    const matches = await this.courses.find({
      $or: [{ name: regex }, { description: regex }, { courseId: regex }]
    }).toArray();
    return matches.map(m => ({ course: m.subject }));
  }

  async _catalog(_input: Record<string, never>) {
    const allCourses = await this.courses.find().toArray();
    const catalogMap: Record<string, any> = {};
    
    for (const c of allCourses) {
      const prereqs = await this.prerequisites.find({ course: c.subject }).toArray();
      const coreqs = await this.corequisites.find({ course: c.subject }).toArray();

      catalogMap[c.subject] = {
        prerequisites: prereqs.map(p => p.prerequisite),
        corequisites: coreqs.map(co => co.corequisite),
        terms: c.terms || [],
        offering: c.offering || "",
        technical: c.technical || false,
      };
    }
    return { catalog: catalogMap };
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