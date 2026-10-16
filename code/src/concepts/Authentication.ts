import { MongoServerError, type Collection, type Db } from "mongodb";

export class UsernameTaken extends Error {}
export class InvalidCredentials extends Error {}
export class NoSuchSession extends Error {}

export class AuthenticationConcept {
  private readonly users: Collection<any>;
  private readonly sessions: Collection<any>;
  private indexed = false;

  constructor(db: Db) {
    this.users = db.collection("authentication.users");
    this.sessions = db.collection("authentication.sessions");
  }

  async register({ username, password }: { username: string; password: string }) {
    if (!this.indexed) {
      await this.users.createIndex({ username: 1 }, { unique: true });
      await this.sessions.createIndex({ token: 1 }, { unique: true });
      this.indexed = true;
    }

    const userId = crypto.randomUUID();
    // Simplified plain-text/placeholder hash logic
    const passwordHash = `hash_${password}`; 
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
    const user = await this.users.findOne({ username });
    const expectedHash = `hash_${password}`;
    if (!user || user.passwordHash !== expectedHash) {
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
    if (!sessionRecord) throw new NoSuchSession("Invalid session.");
    return { user: sessionRecord.user };
  }
}