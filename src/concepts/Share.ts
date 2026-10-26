import { MongoServerError, type Collection, type Db } from "mongodb";
import { randomBytes } from "node:crypto";

export class RoadAlreadyOwned extends Error {}
export class NoSuchRoad extends Error {}
export class NotAnOwner extends Error {}
export class NotAnEditor extends Error {}
export class BadRole extends Error {}
export class EditorsAddViewers extends Error {}
export class ShareWithOwner extends Error {}
export class NotShared extends Error {}
export class InvalidLink extends Error {}

type Role = "VIEW" | "EDIT";
type Access = "OWNER" | Role | "NONE";

interface Grant {
  user: string;
  role: Role;
  addedBy: string;
}

interface Link {
  role: Role;
  token: string;
  enabled: boolean;
}

// One document per road holds its Access, Grants and Links (they exist only together).
interface AccessRecord {
  _id: string; // The Road ID acts as the unique document ID (a road has at most one Access)
  owner: string;
  grants?: Grant[];
  links?: Link[];
  // Before Grants existed: the users the road was shared with, all viewers added by the owner.
  accessList?: string[];
}

const isRole = (role: string): role is Role => role === "VIEW" || role === "EDIT";

/** The Grants of a record, reading a legacy accessList as viewers added by the owner. */
function grantsOf(record: AccessRecord): Grant[] {
  if (record.grants) return record.grants;
  return (record.accessList ?? []).map((user) => ({ user, role: "VIEW", addedBy: record.owner }));
}

function accessOf(record: AccessRecord | null, user: string): Access {
  if (!record) return "NONE";
  if (record.owner === user) return "OWNER";
  return grantsOf(record).find((g) => g.user === user)?.role ?? "NONE";
}

// At least 128 bits, as the design asks; 256 here. URL-safe, as it travels in a link.
const newToken = () => randomBytes(32).toString("base64url");

export class ShareConcept {
  private readonly accesses: Collection<AccessRecord>;
  private indexed = false;

  constructor(db: Db) {
    this.accesses = db.collection<AccessRecord>("share.accesses");
  }

  /** Create the indexes that back the owner, grant and link queries (the _id index is built in). */
  async #ensureIndexes() {
    if (this.indexed) return;
    await this.accesses.createIndex({ owner: 1 });
    await this.accesses.createIndex({ "grants.user": 1 });
    await this.accesses.createIndex({ accessList: 1 });
    // Not unique: roads with no links would clash. 256 random bits make a repeat negligible.
    await this.accesses.createIndex({ "links.token": 1 });
    this.indexed = true;
  }

  /** Saves a road's Grants, replacing a legacy accessList. */
  async #saveGrants(road: string, grants: Grant[]) {
    await this.accesses.updateOne({ _id: road }, { $set: { grants }, $unset: { accessList: "" } });
  }

  async claim({ road, user }: { road: string; user: string }) {
    await this.#ensureIndexes();
    try {
      await this.accesses.insertOne({ _id: road, owner: user, grants: [], links: [] });
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

  /**
   * Returns the road's Access and the requester's access to it, if they have any.
   * Otherwise throws NoSuchRoad, so that a road the requester cannot see looks the
   * same as a road that does not exist.
   */
  async #requireParticipant(road: string, requester: string) {
    const record = await this.accesses.findOne({ _id: road });
    const access = accessOf(record, requester);
    if (!record || access === "NONE") throw new NoSuchRoad("There is no such road.");
    return { record, access };
  }

  async #requireOwner(road: string, requester: string, message: string) {
    const found = await this.#requireParticipant(road, requester);
    if (found.access !== "OWNER") throw new NotAnOwner(message);
    return found.record;
  }

  async share({ road, requester, user, role }: { road: string; requester: string; user: string; role: string }) {
    const { record, access } = await this.#requireParticipant(road, requester);
    if (access === "VIEW") throw new NotAnEditor("You can only view this road.");
    if (!isRole(role)) throw new BadRole("A role must be view or edit.");
    if (access === "EDIT" && role === "EDIT") throw new EditorsAddViewers("Editors can only add viewers.");

    const grants = grantsOf(record);
    const existing = grants.find((g) => g.user === user);
    if (access === "OWNER") {
      if (user === record.owner) throw new ShareWithOwner("The owner already has access to this road.");
      if (existing) existing.role = role; // the owner adding someone again changes their role
      else grants.push({ user, role, addedBy: requester });
    } else {
      // An editor: someone who already has access is left as they are, with the same answer.
      if (user === record.owner || existing) return {};
      grants.push({ user, role: "VIEW", addedBy: requester });
    }
    await this.#saveGrants(road, grants);
    return {};
  }

  async setRole({ road, requester, user, role }: { road: string; requester: string; user: string; role: string }) {
    const record = await this.#requireOwner(road, requester, "Only the owner can change who a road is shared with.");
    if (!isRole(role)) throw new BadRole("A role must be view or edit.");
    const grants = grantsOf(record);
    const grant = grants.find((g) => g.user === user);
    if (!grant) throw new NotShared("That road is not shared with that user.");
    grant.role = role;
    await this.#saveGrants(road, grants);
    return {};
  }

  async unshare({ road, requester, user }: { road: string; requester: string; user: string }) {
    const record = await this.#requireOwner(road, requester, "Only the owner can change who a road is shared with.");
    const grants = grantsOf(record);
    if (!grants.some((g) => g.user === user)) throw new NotShared("That road is not shared with that user.");
    await this.#saveGrants(road, grants.filter((g) => g.user !== user));
    return {};
  }

  /** Applies a change to the link of a road for a role, for its owner only. */
  async #editLink(road: string, requester: string, role: string, edit: (link: Link | undefined) => Link | undefined) {
    const record = await this.#requireOwner(road, requester, "Only the owner can manage this road's links.");
    if (!isRole(role)) throw new BadRole("A role must be view or edit.");
    await this.#ensureIndexes();
    const links = record.links ?? [];
    const changed = edit(links.find((l) => l.role === role));
    const others = links.filter((l) => l.role !== role);
    await this.accesses.updateOne({ _id: road }, { $set: { links: changed ? [...others, changed] : others } });
    return {};
  }

  async enableLink({ road, requester, role }: { road: string; requester: string; role: string }) {
    return this.#editLink(road, requester, role, (link) =>
      link ? { ...link, enabled: true } : { role: role as Role, token: newToken(), enabled: true });
  }

  async disableLink({ road, requester, role }: { road: string; requester: string; role: string }) {
    return this.#editLink(road, requester, role, (link) => (link ? { ...link, enabled: false } : undefined));
  }

  async regenerateLink({ road, requester, role }: { road: string; requester: string; role: string }) {
    return this.#editLink(road, requester, role, (link) => ({
      role: role as Role,
      token: newToken(),
      enabled: link?.enabled ?? false,
    }));
  }

  async join({ token, user }: { token: string; user: string }) {
    // The token is a secret: it is never logged, and a wrong one says no more than a disabled one.
    const record = token ? await this.accesses.findOne({ "links.token": token }) : null;
    const link = record?.links?.find((l) => l.token === token);
    if (!record || !link?.enabled) throw new InvalidLink("This link is no longer valid.");
    const road = record._id;
    if (user === record.owner) return { road };

    const grants = grantsOf(record);
    const grant = grants.find((g) => g.user === user);
    if (grant) {
      if (link.role === "EDIT") grant.role = "EDIT"; // a link never lowers a role
      grant.addedBy = record.owner;
    } else {
      grants.push({ user, role: link.role, addedBy: record.owner });
    }
    await this.#saveGrants(road, grants);
    return { road };
  }

  async _canView({ road, user }: { road: string; user: string }) {
    return { allowed: accessOf(await this.accesses.findOne({ _id: road }), user) !== "NONE" };
  }

  async _canEdit({ road, user }: { road: string; user: string }) {
    const access = accessOf(await this.accesses.findOne({ _id: road }), user);
    return { allowed: access === "OWNER" || access === "EDIT" };
  }

  async _isOwner({ road, user }: { road: string; user: string }) {
    const record = await this.accesses.findOne({ _id: road });
    return { owner: !!record && record.owner === user };
  }

  async _role({ road, user }: { road: string; user: string }) {
    return { role: accessOf(await this.accesses.findOne({ _id: road }), user) };
  }

  async _roadsOwnedBy({ user }: { user: string }) {
    await this.#ensureIndexes();
    const records = await this.accesses.find({ owner: user }).toArray();
    return records.map((r) => ({ road: r._id }));
  }

  async _roadsSharedWith({ user }: { user: string }) {
    await this.#ensureIndexes();
    const records = await this.accesses.find({ $or: [{ "grants.user": user }, { accessList: user }] }).toArray();
    return records.flatMap((r) => grantsOf(r).filter((g) => g.user === user).map((g) => ({ road: r._id, role: g.role })));
  }

  async _grantsVisibleTo({ road, requester }: { road: string; requester: string }) {
    const record = await this.accesses.findOne({ _id: road });
    const access = accessOf(record, requester);
    if (!record || (access !== "OWNER" && access !== "EDIT")) return [];
    return grantsOf(record)
      .filter((g) => access === "OWNER" || g.addedBy === requester)
      .map(({ user, role, addedBy }) => ({ user, role, addedBy }));
  }

  async _ownerVisibleTo({ road, user }: { road: string; user: string }) {
    const record = await this.accesses.findOne({ _id: road });
    if (!record) return [];
    const access = accessOf(record, user);
    const grant = grantsOf(record).find((g) => g.user === user);
    const visible = access === "OWNER" || access === "EDIT" || (access === "VIEW" && grant?.addedBy === record.owner);
    return visible ? [{ owner: record.owner }] : [];
  }

  async _known({ road, requester, user }: { road: string; requester: string; user: string }) {
    const record = await this.accesses.findOne({ _id: road });
    if (!record) return { known: user === requester };
    const access = accessOf(record, requester);
    const grant = grantsOf(record).find((g) => g.user === user);
    const known =
      user === record.owner || user === requester ||
      (access === "OWNER" && !!grant) ||
      (access === "EDIT" && grant?.addedBy === requester);
    return { known };
  }

  async _links({ road, requester }: { road: string; requester: string }) {
    const record = await this.accesses.findOne({ _id: road });
    if (!record || record.owner !== requester) return [];
    return (record.links ?? []).map(({ role, token, enabled }) => ({ role, token, enabled }));
  }
}
