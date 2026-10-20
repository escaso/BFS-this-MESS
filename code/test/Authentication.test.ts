// Tests for the Authentication concept, written against Authentication.md
// (purpose, principle, actions, queries) and not against the implementation.
//
// Refusals are checked by the code and sentence the spec declares, and query
// results by the cardinality the spec declares (one: an object; optional and
// many: an array of rows), so the tests do not depend on how state is stored.
//
// Run with: bun test test/Authentication.test.ts (needs MongoDB at MONGODB_URL)

import { describe, test, expect, beforeEach } from "bun:test";
import { AuthenticationConcept } from "../src/concepts/Authentication.ts";
import { refusalsOf, useFreshDb } from "./support.ts";

/*
 * Testing strategy
 *
 * Every test starts from an empty database.
 *
 * register(username, password)
 *   partition on username: empty, non-empty
 *   partition on password: empty, non-empty
 *     non-empty includes: plain ASCII, unicode / whitespace / ':' characters
 *   partition on username availability (both non-empty): unused, taken
 *   partition on password versus other users: unique, same as another user's
 *   partition on timing: sequential, concurrent calls with the same username
 *   partition on outcome: returns a user, refuses EMPTY_CREDENTIALS,
 *                         refuses USERNAME_TAKEN
 *   covered by: "register" block, plus the unicode test in "login"
 *
 * login(username, password)
 *   partition on username: empty, registered, not registered
 *   partition on password: empty, matches the user's password,
 *                          does not match (unrelated, prefix, longer, different
 *                          case, extra whitespace, another user's password)
 *   partition on the user's existing sessions: none, one or more
 *   partition on outcome: returns a session, refuses INVALID_CREDENTIALS
 *   covered by: "login" block
 *
 * logout(session)
 *   partition on session: live, never existed, already logged out
 *   partition on the same user's other sessions: none, some
 *   partition on other users' sessions: none, some
 *   partition on outcome: returns nothing, refuses NO_SUCH_SESSION
 *   covered by: "logout" block
 *
 * _authenticate(session)  -- optional: one row, or no row
 *   partition on session: live, logged out, never existed, empty string,
 *                         a value that is a user id rather than a session
 *   partition on number of users with sessions: 1, many
 *   partition on outcome: one row {user}, no row
 *   covered by: "_authenticate" and "principle" blocks, logout tests
 *
 * _lookup(username)  -- optional: one row, or no row
 *   partition on username: registered, not registered
 *   partition on number of users: 1, many
 *   partition on outcome: one row {user}, no row
 *   covered by: "_lookup" block, register tests
 *
 * _username(user)  -- one, where user exists
 *   partition on user: the only user, one of many
 *   covered by: "_username" block
 *
 * Interactions (principle)
 *   register -> login -> _authenticate -> logout -> _authenticate
 *   register refused -> state unchanged (name still free, original
 *     password still works)
 *   logout of one session -> other sessions and the user survive
 */

const db = useFreshDb("auth_test");
const expectRefusal = refusalsOf("Authentication");
let auth: AuthenticationConcept;

beforeEach(() => {
  auth = new AuthenticationConcept(db());
});

describe("principle", () => {
  test("register, log in, act as that user, log out", async () => {
    const { user } = await auth.register({ username: "alice", password: "pw1" });
    const { session } = await auth.login({ username: "alice", password: "pw1" });

    // Requests carrying the session are attributed to the user...
    expect(await auth._authenticate({ session })).toEqual([{ user }]);
    expect(await auth._username({ user })).toEqual({ username: "alice" });

    // ...until they log out.
    expect(await auth.logout({ session })).toEqual({});
    expect(await auth._authenticate({ session })).toEqual([]);
  });
});

describe("register", () => {
  test("returns a user that can be found by username", async () => {
    const { user } = await auth.register({ username: "alice", password: "pw" });
    expect(user).toBeTruthy();
    expect(await auth._lookup({ username: "alice" })).toEqual([{ user }]);
  });

  test("gives different users different identities", async () => {
    const a = await auth.register({ username: "alice", password: "pw" });
    const b = await auth.register({ username: "bob", password: "pw" });
    expect(a.user).not.toBe(b.user);
  });

  test("two users may choose the same password", async () => {
    await auth.register({ username: "alice", password: "same" });
    await auth.register({ username: "bob", password: "same" });
    await auth.login({ username: "alice", password: "same" });
    await auth.login({ username: "bob", password: "same" });
  });

  test("refuses an empty username, an empty password, or both", async () => {
    await expectRefusal("register", "EMPTY_CREDENTIALS", auth.register({ username: "", password: "pw" }));
    await expectRefusal("register", "EMPTY_CREDENTIALS", auth.register({ username: "alice", password: "" }));
    await expectRefusal("register", "EMPTY_CREDENTIALS", auth.register({ username: "", password: "" }));
  });

  test("an empty password is refused even when the username is taken", async () => {
    await auth.register({ username: "alice", password: "pw" });
    await expectRefusal("register", "EMPTY_CREDENTIALS", auth.register({ username: "alice", password: "" }));
  });

  test("an empty-credentials refusal creates no user", async () => {
    await expectRefusal("register", "EMPTY_CREDENTIALS", auth.register({ username: "alice", password: "" }));
    expect(await auth._lookup({ username: "alice" })).toEqual([]);
    // and the name is still free
    await auth.register({ username: "alice", password: "pw" });
  });

  test("refuses a username that is taken", async () => {
    await auth.register({ username: "alice", password: "pw" });
    await expectRefusal("register", "USERNAME_TAKEN", auth.register({ username: "alice", password: "other" }));
  });

  test("a refused duplicate does not change the original user", async () => {
    const { user } = await auth.register({ username: "alice", password: "pw" });
    await expectRefusal("register", "USERNAME_TAKEN", auth.register({ username: "alice", password: "other" }));

    expect(await auth._lookup({ username: "alice" })).toEqual([{ user }]);
    // original password still works, the attempted one does not
    await auth.login({ username: "alice", password: "pw" });
    await expectRefusal("login", "INVALID_CREDENTIALS", auth.login({ username: "alice", password: "other" }));
  });

  test("concurrent registrations of one username: exactly one wins", async () => {
    const results = await Promise.allSettled([
      auth.register({ username: "alice", password: "a" }),
      auth.register({ username: "alice", password: "b" }),
      auth.register({ username: "alice", password: "c" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    for (const r of results) {
      if (r.status === "rejected") expect((r.reason as Error).message).toBe("Username is already taken.");
    }
  });
});

describe("login", () => {
  let alice: string;

  beforeEach(async () => {
    ({ user: alice } = await auth.register({ username: "alice", password: "pw" }));
  });

  test("returns a session for the user", async () => {
    const { session } = await auth.login({ username: "alice", password: "pw" });
    expect(typeof session).toBe("string");
    expect(session.length).toBeGreaterThan(0);
    expect(await auth._authenticate({ session })).toEqual([{ user: alice }]);
  });

  test("each login creates a new, distinct session; both are live", async () => {
    const s1 = (await auth.login({ username: "alice", password: "pw" })).session;
    const s2 = (await auth.login({ username: "alice", password: "pw" })).session;
    expect(s1).not.toBe(s2);
    expect(await auth._authenticate({ session: s1 })).toEqual([{ user: alice }]);
    expect(await auth._authenticate({ session: s2 })).toEqual([{ user: alice }]);
  });

  test("refuses a wrong password and an unknown username", async () => {
    await expectRefusal("login", "INVALID_CREDENTIALS", auth.login({ username: "alice", password: "wrong" }));
    await expectRefusal("login", "INVALID_CREDENTIALS", auth.login({ username: "nobody", password: "pw" }));
  });

  test("refuses empty credentials", async () => {
    await expectRefusal("login", "INVALID_CREDENTIALS", auth.login({ username: "", password: "" }));
    await expectRefusal("login", "INVALID_CREDENTIALS", auth.login({ username: "alice", password: "" }));
  });

  test("the password must match exactly (no prefix or case-folding)", async () => {
    for (const attempt of ["p", "pww", "PW", "pw ", " pw"]) {
      await expectRefusal("login", "INVALID_CREDENTIALS", auth.login({ username: "alice", password: attempt }));
    }
  });

  test("a user's password does not work for another user", async () => {
    await auth.register({ username: "bob", password: "bobpw" });
    await expectRefusal("login", "INVALID_CREDENTIALS", auth.login({ username: "alice", password: "bobpw" }));
    await expectRefusal("login", "INVALID_CREDENTIALS", auth.login({ username: "bob", password: "pw" }));
  });

  test("a refused login creates no session and leaves existing sessions live", async () => {
    const { session } = await auth.login({ username: "alice", password: "pw" });
    await expectRefusal("login", "INVALID_CREDENTIALS", auth.login({ username: "alice", password: "wrong" }));
    expect(await auth._authenticate({ session })).toEqual([{ user: alice }]);
  });

  test("passwords with unusual characters work", async () => {
    const pw = "pä$$ wörd 🔑 \n\t:with:colons:";
    await auth.register({ username: "unicode", password: pw });
    await auth.login({ username: "unicode", password: pw });
    await expectRefusal("login", "INVALID_CREDENTIALS", auth.login({ username: "unicode", password: "pä$$ wörd" }));
  });
});

describe("logout", () => {
  let user: string;
  let session: string;

  beforeEach(async () => {
    ({ user } = await auth.register({ username: "alice", password: "pw" }));
    ({ session } = await auth.login({ username: "alice", password: "pw" }));
  });

  test("returns an empty result and removes the session", async () => {
    expect(await auth.logout({ session })).toEqual({});
    expect(await auth._authenticate({ session })).toEqual([]);
  });

  test("refuses a session that never existed", async () => {
    await expectRefusal("logout", "NO_SUCH_SESSION", auth.logout({ session: "not-a-session" }));
  });

  test("refuses a session that was already logged out", async () => {
    await auth.logout({ session });
    await expectRefusal("logout", "NO_SUCH_SESSION", auth.logout({ session }));
  });

  test("only ends the given session; the user's other sessions survive", async () => {
    const other = (await auth.login({ username: "alice", password: "pw" })).session;
    await auth.logout({ session });
    expect(await auth._authenticate({ session: other })).toEqual([{ user }]);
  });

  test("does not affect other users' sessions", async () => {
    const { user: bob } = await auth.register({ username: "bob", password: "pw" });
    const bobSession = (await auth.login({ username: "bob", password: "pw" })).session;
    await auth.logout({ session });
    expect(await auth._authenticate({ session: bobSession })).toEqual([{ user: bob }]);
  });

  test("does not remove the user; they can log in again with a new session", async () => {
    await auth.logout({ session });
    expect(await auth._lookup({ username: "alice" })).toEqual([{ user }]);
    const again = await auth.login({ username: "alice", password: "pw" });
    expect(again.session).not.toBe(session);
    expect(await auth._authenticate({ session: again.session })).toEqual([{ user }]);
  });
});

describe("_authenticate", () => {
  test("answers the user a session belongs to", async () => {
    const { user: alice } = await auth.register({ username: "alice", password: "pw" });
    const { user: bob } = await auth.register({ username: "bob", password: "pw" });
    const sa = (await auth.login({ username: "alice", password: "pw" })).session;
    const sb = (await auth.login({ username: "bob", password: "pw" })).session;

    expect(await auth._authenticate({ session: sa })).toEqual([{ user: alice }]);
    expect(await auth._authenticate({ session: sb })).toEqual([{ user: bob }]);
  });

  test("answers no row for a session that does not exist, including the empty string", async () => {
    expect(await auth._authenticate({ session: "bogus" })).toEqual([]);
    expect(await auth._authenticate({ session: "" })).toEqual([]);
  });

  test("a user id is not a session", async () => {
    const { user } = await auth.register({ username: "alice", password: "pw" });
    await auth.login({ username: "alice", password: "pw" });
    expect(await auth._authenticate({ session: user })).toEqual([]);
  });
});

describe("_lookup", () => {
  test("answers the user with this username", async () => {
    const { user } = await auth.register({ username: "alice", password: "pw" });
    expect(await auth._lookup({ username: "alice" })).toEqual([{ user }]);
  });

  test("answers no row when there is no such user", async () => {
    expect(await auth._lookup({ username: "nobody" })).toEqual([]);
    await auth.register({ username: "alice", password: "pw" });
    expect(await auth._lookup({ username: "nobody" })).toEqual([]);
  });

  test("distinguishes between users", async () => {
    const a = await auth.register({ username: "alice", password: "pw" });
    const b = await auth.register({ username: "bob", password: "pw" });
    expect(await auth._lookup({ username: "alice" })).toEqual([{ user: a.user }]);
    expect(await auth._lookup({ username: "bob" })).toEqual([{ user: b.user }]);
  });

  test("a row has only the user field (nothing about passwords or sessions)", async () => {
    await auth.register({ username: "alice", password: "pw" });
    const [row] = await auth._lookup({ username: "alice" });
    expect(Object.keys(row)).toEqual(["user"]);
  });
});

describe("_username", () => {
  test("answers the username of a user", async () => {
    const { user } = await auth.register({ username: "alice", password: "pw" });
    expect(await auth._username({ user })).toEqual({ username: "alice" });
  });

  test("answers each user's own username, and round-trips with _lookup", async () => {
    await auth.register({ username: "alice", password: "pw" });
    await auth.register({ username: "bob", password: "pw" });
    for (const username of ["alice", "bob"]) {
      const [{ user }] = await auth._lookup({ username });
      expect(await auth._username({ user })).toEqual({ username });
    }
  });
});
