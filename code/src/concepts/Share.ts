import { MongoServerError, type Collection, type Db } from "mongodb";

export class RoadAlreadyOwned extends Error {}
export class NoSuchRoad extends Error {}
export class NotAnOwner extends Error {}
export class ShareWithOwner extends Error {}
export class NotShared extends Error {}

interface AccessRecord {
  _id: string; // The Road ID acts as the unique document ID (a road has at most one Access)
  owner: string;
  accessList: string[];
}

export class ShareConcept {
  private readonly accesses: Collection<AccessRecord>;
  private indexed = false;

  constructor(db: Db) {
    this.accesses = db.collection<AccessRecord>("share.accesses");
  }

  /** Create the indexes that back the owner/accessList queries (the _id index is built in). */
  private async ensureIndexes() {
    if (this.indexed) return;
    await this.accesses.createIndex({ owner: 1 });
    await this.accesses.createIndex({ accessList: 1 });
    this.indexed = true;
  }

  async claim({ road, user }: { road: string; user: string }) {
    await this.ensureIndexes();
    try {
      await this.accesses.insertOne({
        _id: road,
        owner: user,
        accessList: [],
      });
    } catch (error) {
      // The unique _id enforces "a road has at most one Access"
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new RoadAlreadyOwned("This road already has an owner.");
      }
      throw error;
    }
    return {};
  }

  async release({ road }: { road: string }) {
    const result = await this.accesses.deleteOne({ _id: road });
    if (result.deletedCount === 0) {
      throw new NoSuchRoad("There is no such road.");
    }
    return {};
  }

  async share(
    { road, requester, user }: { road: string; requester: string; user: string },
  ) {
    const record = await this.requireParticipant(road, requester);
    if (record.owner !== requester) {
      throw new NotAnOwner("Only the owner can share this road.");
    }
    if (user === record.owner) {
      throw new ShareWithOwner("The owner already has access to this road.");
    }

    await this.accesses.updateOne(
      { _id: road },
      { $addToSet: { accessList: user } },
    );
    return {};
  }

  async unshare(
    { road, requester, user }: { road: string; requester: string; user: string },
  ) {
    const record = await this.requireParticipant(road, requester);
    if (record.owner !== requester) {
      throw new NotAnOwner(
        "Only the owner can change who a road is shared with.",
      );
    }
    if (!record.accessList.includes(user)) {
      throw new NotShared("That road is not shared with that user.");
    }

    await this.accesses.updateOne(
      { _id: road },
      { $pull: { accessList: user } },
    );
    return {};
  }

  /**
   * Returns the road's Access if it exists and requester is its owner or on its
   * accessList. Otherwise throws NoSuchRoad, so that a road the requester cannot
   * see looks the same as a road that does not exist.
   */
  private async requireParticipant(road: string, requester: string) {
    const record = await this.accesses.findOne({ _id: road });
    if (
      !record ||
      (record.owner !== requester && !record.accessList.includes(requester))
    ) {
      throw new NoSuchRoad("There is no such road.");
    }
    return record;
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
    return { owner: record.owner === user };
  }

  async _roadsOwnedBy({ user }: { user: string }) {
    await this.ensureIndexes();
    const records = await this.accesses.find({ owner: user }).toArray();
    return records.map((r) => ({ road: r._id }));
  }

  async _roadsSharedWith({ user }: { user: string }) {
    await this.ensureIndexes();
    const records = await this.accesses.find({ accessList: user }).toArray();
    return records.map((r) => ({ road: r._id }));
  }

  async _viewers({ road }: { road: string }) {
    const record = await this.accesses.findOne({ _id: road });
    if (!record) {
      return [];
    }
    return record.accessList.map((user) => ({ user }));
  }
}