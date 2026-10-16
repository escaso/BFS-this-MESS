import { MongoServerError, type Collection, type Db } from "mongodb";

export class NoSuchRoad extends Error {}
export class RequirementNotMet extends Error {}
export class ElectiveBlockNotFound extends Error {}
export class PinNotFound extends Error {}

interface Pin {
  subject: string;
  semester: number;
}

interface RoadRecord {
  _id: string; // road ID
  name: string;
  major: string;
  required: string[];
  maxPerSemester: number;
  maxTechnicalPerSemester: number;
  lockedThrough: number;
  electiveBlocks: string[][]; // stored as list of subject arrays
  pins: Pin[];
}

export class ConstrainConcept {
  private readonly roads: Collection<RoadRecord>;
  private indexed = false;

  constructor(db: Db) {
    this.roads = db.collection<RoadRecord>("constrain.roads");
  }

  async newRoad({ name, major }: { name: string; major: string }) {
    if (!this.indexed) {
      await this.roads.createIndex({ _id: 1 }, { unique: true });
      this.indexed = true;
    }
    const road = crypto.randomUUID();
    await this.roads.insertOne({
      _id: road,
      name,
      major,
      required: [],
      maxPerSemester: 0,
      maxTechnicalPerSemester: 0,
      lockedThrough: 0,
      electiveBlocks: [],
      pins: [],
    });
    return { road };
  }

  async setMajor({ road, major }: { road: string; major: string }) {
    const result = await this.roads.updateOne({ _id: road }, { $set: { major } });
    if (result.matchedCount === 0) throw new NoSuchRoad("No such road.");
    return {};
  }

  async addRequirement({ road, subject }: { road: string; subject: string }) {
    const result = await this.roads.updateOne({ _id: road }, { $addToSet: { required: subject } });
    if (result.matchedCount === 0) throw new NoSuchRoad("No such road.");
    return {};
  }

  async removeRequirement({ road, subject }: { road: string; subject: string }) {
    const record = await this.roads.findOne({ _id: road });
    if (!record) throw new NoSuchRoad("No such road.");
    if (!record.required.includes(subject)) throw new RequirementNotMet("Subject is not a requirement.");
    
    await this.roads.updateOne({ _id: road }, { $pull: { required: subject } });
    return {};
  }

  async addElectiveBlock({ road, options }: { road: string; options: string[] }) {
    const result = await this.roads.updateOne({ _id: road }, { $push: { electiveBlocks: options } });
    if (result.matchedCount === 0) throw new NoSuchRoad("No such road.");
    return {};
  }

  async removeElectiveBlock({ road, options }: { road: string; options: string[] }) {
    const record = await this.roads.findOne({ _id: road });
    if (!record) throw new NoSuchRoad("No such road.");
    
    // Check existence of the specific option block
    const exists = record.electiveBlocks.some(block => 
      block.length === options.length && block.every(s => options.includes(s))
    );
    if (!exists) throw new ElectiveBlockNotFound("Elective block not found.");

    await this.roads.updateOne({ _id: road }, { $set: { electiveBlocks: record.electiveBlocks.filter(b => !(b.length === options.length && b.every(s => options.includes(s)))) } });
    return {};
  }

  async pin({ road, subject, semester }: { road: string; subject: string; semester: number }) {
    const record = await this.roads.findOne({ _id: road });
    if (!record) throw new NoSuchRoad("No such road.");

    const existingPinIndex = record.pins.findIndex(p => p.subject === subject);
    let updatedPins = [...record.pins];
    if (existingPinIndex >= 0) {
      updatedPins[existingPinIndex].semester = semester;
    } else {
      updatedPins.push({ subject, semester });
    }

    await this.roads.updateOne({ _id: road }, { $set: { pins: updatedPins } });
    return {};
  }

  async unPin({ road, subject }: { road: string; subject: string }) {
    const record = await this.roads.findOne({ _id: road });
    if (!record) throw new NoSuchRoad("No such road.");

    const exists = record.pins.some(p => p.subject === subject);
    if (!exists) throw new PinNotFound("Pin not found.");

    await this.roads.updateOne({ _id: road }, { $set: { pins: record.pins.filter(p => p.subject !== subject) } });
    return {};
  }

  async setCap({ road, capType, limit }: { road: string; capType: string; limit: number }) {
    const record = await this.roads.findOne({ _id: road });
    if (!record) throw new NoSuchRoad("No such road.");

    const update = capType === "total" ? { maxPerSemester: limit } : { maxTechnicalPerSemester: limit };
    await this.roads.updateOne({ _id: road }, { $set: update });
    return {};
  }

  async lockThroughSemester({ road, semester }: { road: string; semester: number }) {
    const result = await this.roads.updateOne({ _id: road }, { $set: { lockedThrough: semester } });
    if (result.matchedCount === 0) throw new NoSuchRoad("No such road.");
    return {};
  }

  async _constraints({ road }: { road: string }) {
    const record = await this.roads.findOne({ _id: road });
    if (!record) throw new NoSuchRoad("No such road.");
    return {
      required: record.required,
      elective_blocks: record.electiveBlocks,
      pins: record.pins,
      maxPerSemester: record.maxPerSemester,
      maxTechnicalPerSemester: record.maxTechnicalPerSemester,
      lockedThrough: record.lockedThrough,
    };
  }

  async _satisfies({ road, plan, technical }: { road: string; plan: string[][]; technical: string[] }) {
    const record = await this.roads.findOne({ _id: road });
    if (!record) return { satisfied: false };

    // Check required subjects
    for (const req of record.required) {
      if (!plan.some(semesterSet => semesterSet.includes(req))) return { satisfied: false };
    }

    // Check elective blocks
    for (const block of record.electiveBlocks) {
      const satisfiedBlock = block.some(opt => plan.some(semesterSet => semesterSet.includes(opt)));
      if (!satisfiedBlock) return { satisfied: false };
    }

    // Check pins and locked semesters
    for (const pin of record.pins) {
      const targetSem = plan[pin.semester];
      if (!targetSem || !targetSem.includes(pin.subject)) return { satisfied: false };
    }

    for (let i = 0; i <= record.lockedThrough; i++) {
      const semSet = plan[i] || [];
      const pinnedInSem = record.pins.filter(p => p.semester === i).map(p => p.subject);
      if (semSet.length !== pinnedInSem.length || !semSet.every(s => pinnedInSem.includes(s))) {
        return { satisfied: false };
      }
    }

    // Check caps for semesters after lockedThrough
    for (let i = record.lockedThrough + 1; i < plan.length; i++) {
      const semSet = plan[i] || [];
      if (record.maxPerSemester > 0 && semSet.length > record.maxPerSemester) return { satisfied: false };
      if (record.maxTechnicalPerSemester > 0) {
        const techCount = semSet.filter(s => technical.includes(s)).length;
        if (techCount > record.maxTechnicalPerSemester) return { satisfied: false };
      }
    }

    return { satisfied: true };
  }

  // TODO: replace with real BFS over the prerequisite graph.
  async _findPath(
    { road, catalog, limit }: { road: string; catalog: unknown; limit: number },
  ): Promise<{ plan: string[][] }[]> {
    const record = await this.roads.findOne({ _id: road });
    if (!record) return [];

    const SEMESTERS = 8;
    const firstFree = record.lockedThrough + 1;
    const free = Math.max(1, SEMESTERS - firstFree + 1);
    const pinned = new Set(record.pins.map((p) => p.subject));
    const unpinned = [
      ...record.required.filter((s) => !pinned.has(s)),
      // one placeholder pick per elective block
      ...record.electiveBlocks.map((b) => b[0]).filter((s) => s && !pinned.has(s)),
    ];

    return Array.from({ length: Math.max(1, limit) }, (_, k) => {
      const length = Math.max(SEMESTERS + 1, ...record.pins.map((p) => p.semester + 1));
      const plan: string[][] = Array.from({ length }, () => []);
      for (const p of record.pins) plan[p.semester].push(p.subject);
      unpinned.forEach((subject, i) => {
        plan[firstFree + ((i + k) % free)].push(subject);
      });
      return { plan };
    });
  }
}