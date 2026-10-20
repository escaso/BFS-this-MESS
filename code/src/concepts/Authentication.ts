import { MongoServerError, type Collection, type Db } from "mongodb";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export class EmptyCredentials extends Error {}
export class UsernameTaken extends Error {}
export class InvalidCredentials extends Error {}
export class NoSuchSession extends Error {}
export class NoSuchUser extends Error {}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(expected, actual);
}

export class AuthenticationConcept {
  private readonly users: Collection<any>;
  private readonly sessions: Collection<any>;
  private indexed = false;

  constructor(db: Db) {
    this.users = db.collection("authentication.users");
    this.sessions = db.collection("authentication.sessions");
  }

  private async ensureIndexes() {
    if (this.indexed) return;
    await this.users.createIndex({ username: 1 }, { unique: true });
    await this.sessions.createIndex({ token: 1 }, { unique: true });
    this.indexed = true;
  }

  async register({ username, password }: { username: string; password: string }) {
    if (!username || !password) {
      throw new EmptyCredentials("A username and a password are needed.");
    }

    await this.ensureIndexes();

    const userId = crypto.randomUUID();
    const passwordHash = hashPassword(password);
    try {
      await this.users.insertOne({ _id: userId, username, passwordHash });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new UsernameTaken("Username is already taken.");
      }
      throw error;
    }
    return { user: userId };
  }

  async login({ username, password }: { username: string; password: string }) {
    await this.ensureIndexes();

    const user = await this.users.findOne({ username });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new InvalidCredentials("Invalid username or password.");
    }

    const token = crypto.randomUUID();
    await this.sessions.insertOne({ _id: token, token, user: user._id });
    return { session: token };
  }

  async logout({ session }: { session: string }) {
    const result = await this.sessions.deleteOne({ token: session });
    if (result.deletedCount === 0) {
      throw new NoSuchSession("Session does not exist.");
    }
    return {};
  }

  async _authenticate({ session }: { session: string }) {
    const sessionRecord = await this.sessions.findOne({ token: session });
    if (!sessionRecord) throw new NoSuchSession("Session does not exist.");
    return { user: sessionRecord.user as string };
  }

  async _lookup({ username }: { username: string }) {
    const user = await this.users.findOne({ username });
    return user ? { user: user._id as string } : null;
  }

  async _username({ user }: { user: string }) {
    const record = await this.users.findOne({ _id: user });
    if (!record) throw new NoSuchUser("User does not exist.");
    return { username: record.username as string };
  }
}