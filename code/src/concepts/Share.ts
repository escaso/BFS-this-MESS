import { MongoServerError, type Collection, type Db } from "mongodb";

export class RoadAlreadyOwned extends Error {}
export class NoSuchRoad extends Error {}
export class NotAnOwner extends Error {}
export class InvalidUser extends Error {}

interface AccessRecord {
  _id: string; // The Road ID acts as the unique document ID
  owner: string;
  accessList: string[];
}

export class ShareConcept {
  private readonly accesses: Collection<AccessRecord>;
  private indexed = false;

  constructor(db: Db) {
    this.accesses = db.collection<AccessRecord>("share.accesses");
  }

  async claim({ road, user }: { road: string; user: string }) {
    if (!this.indexed) {
      // Ensure each road can only have one owner (enforces unique road ownership)
      await this.accesses.createIndex({ _id: 1 }, { unique: true });
      this.indexed = true;
    }

    try {
      await this.accesses.insertOne({
        _id: road,
        owner: user,
        accessList: [],
      });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new RoadAlreadyOwned("This road already has an owner.");
      }
      throw error;
    }
    return {};
  }

  async share({ road, requester, user }: { road: string; requester: string; user: string }) {
    // Validate that the user string is not empty or blank (satisfies design requirement)
    if (!user || user.trim() === "") {
      throw new InvalidUser("User cannot be empty.");
    }

    const record = await this.accesses.findOne({ _id: road });
    if (!record) {
      throw new NoSuchRoad("There is no such road.");
    }
    if (record.owner !== requester) {
      throw new NotAnOwner("Only the owner can share this road.");
    }

    // Add user to accessList if not already present
    if (!record.accessList.includes(user)) {
      await this.accesses.updateOne(
        { _id: road },
        { $push: { accessList: user } }
      );
    }
    return {};
  }

  async _canView({ road, user }: { road: string; user: string }) {
    const record = await this.accesses.findOne({ _id: road });
    if (!record) {
      return { allowed: false };
    }
    const allowed = record.owner === user || record.accessList.includes(user);
    return { allowed };
  }

  async _isOwner({ road, user }: { road: string; user: string }) {
    const record = await this.accesses.findOne({ _id: road });
    if (!record) {
      return { owner: false };
    }
    const isOwner = record.owner === user;
    return { owner: isOwner };
  }
}