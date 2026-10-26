/**
 * Tests for the Share concept, written from Share.md (the spec), not from Share.ts.
 * Only the public actions and queries are used; the one exception is the setup of the
 * legacy-data test, which writes an Access in the shape it had before Grants existed.
 * Refusals are checked by the code and sentence the spec declares for each action.
 *
 * Run with: bun test test/Share.test.ts (needs MongoDB at MONGODB_URI)
 *
 * =====================================================================================
 * TESTING STRATEGY (partitions)
 * =====================================================================================
 *
 * Roads and users are opaque IDs. Names: owner = "alice", editor = "erin", viewer = "bob",
 * other viewer = "carol", stranger = "dave".
 *
 * ---- claim(road, user) / release(road) ----
 *   road: never claimed / owned (by the same or another user) / released
 *   release: with grants and links (all gone afterwards) / road with no owner
 *
 * ---- share(road, requester, user, role) ----
 *   requester: owner / editor / viewer / stranger; road: owned / not owned
 *   role: VIEW / EDIT / neither
 *   user: new / already granted (VIEW, EDIT, hidden from an editor) / the owner / the requester
 *   outcome: grant created with addedBy / role changed (owner) / nothing changes (editor) / refusal
 *
 * ---- setRole / unshare ----
 *   requester: owner / editor / viewer / stranger; user: granted / not granted; role: valid / not
 *
 * ---- enableLink / disableLink / regenerateLink / join ----
 *   requester: owner / editor / viewer / stranger; role: VIEW / EDIT / neither
 *   link: none / enabled / disabled / regenerated (old token)
 *   joiner: new / viewer (VIEW link, EDIT link) / editor (VIEW link) / owner / added by an editor
 *   token: valid / unknown / empty
 *
 * ---- queries ----
 *   _canView, _canEdit, _isOwner, _role: owner / editor / viewer / stranger / road with no owner
 *   _roadsOwnedBy, _roadsSharedWith (with role): 0, 1, many; after unshare and release
 *   _grantsVisibleTo: owner (all) / editor (own invitees only) / viewer / stranger (none)
 *   _ownerVisibleTo: owner / editor / owner-added viewer / link joiner / editor-added viewer / stranger
 *   _known: owner, requester, granted user (owner asks / editor asks: own invitee or not), unknown
 *   _links: owner / anyone else
 *
 * ---- legacy data ----
 *   an Access with a plain accessList: its users are viewers added by the owner, and keep
 *   working through every action and query
 *
 * ---- cross-cutting ----
 *   principle; refused actions change nothing; a road one may not see is NO_SUCH_ROAD
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { ShareConcept } from "../src/concepts/Share.ts";
import { refusalsOf, useFreshDb } from "./support.ts";

const OWNER = "alice";
const EDITOR = "erin";
const VIEWER = "bob";
const VIEWER2 = "carol";
const STRANGER = "dave";
const ROAD = "road-1";
const ROAD2 = "road-2";

const db = useFreshDb("share_test");
const expectRefusal = refusalsOf("Share");
let share: ShareConcept;

beforeEach(() => {
  share = new ShareConcept(db());
});

const sorted = <T>(xs: T[]) => [...xs].sort();
const role = async (road: string, user: string) => (await share._role({ road, user })).role;
const canView = async (road: string, user: string) => (await share._canView({ road, user })).allowed;
const canEdit = async (road: string, user: string) => (await share._canEdit({ road, user })).allowed;
const people = async (road: string, requester: string) =>
  sorted((await share._grantsVisibleTo({ road, requester })).map((g) => `${g.user}:${g.role}:${g.addedBy}`));
const ownerSeenBy = async (road: string, user: string) =>
  (await share._ownerVisibleTo({ road, user })).map((r) => r.owner);
const tokenOf = async (road: string, r: "VIEW" | "EDIT") =>
  (await share._links({ road, requester: OWNER })).find((l) => l.role === r)?.token ?? "";

/** OWNER claims ROAD, makes EDITOR an editor, and makes VIEWER a viewer. */
async function setup() {
  await share.claim({ road: ROAD, user: OWNER });
  await share.share({ road: ROAD, requester: OWNER, user: EDITOR, role: "EDIT" });
  await share.share({ road: ROAD, requester: OWNER, user: VIEWER, role: "VIEW" });
}

test("principle: viewer looks, becomes an editor who adds a viewer, link joins, unshare", async () => {
  await share.claim({ road: ROAD, user: OWNER });
  await share.share({ road: ROAD, requester: OWNER, user: VIEWER, role: "VIEW" });
  expect([await canView(ROAD, VIEWER), await canEdit(ROAD, VIEWER)]).toEqual([true, false]);

  await share.setRole({ road: ROAD, requester: OWNER, user: VIEWER, role: "EDIT" });
  expect(await canEdit(ROAD, VIEWER)).toBe(true);
  await share.share({ road: ROAD, requester: VIEWER, user: VIEWER2, role: "VIEW" });
  expect(await people(ROAD, VIEWER)).toEqual([`${VIEWER2}:VIEW:${VIEWER}`]); // only the ones they added

  await share.enableLink({ road: ROAD, requester: OWNER, role: "VIEW" });
  const old = await tokenOf(ROAD, "VIEW");
  expect(await share.join({ token: old, user: STRANGER })).toEqual({ road: ROAD });
  await share.regenerateLink({ road: ROAD, requester: OWNER, role: "VIEW" });
  await expectRefusal("join", "INVALID_LINK", share.join({ token: old, user: "eve" }));

  await share.unshare({ road: ROAD, requester: OWNER, user: VIEWER });
  expect(await canView(ROAD, VIEWER)).toBe(false);
});

describe("claim and release", () => {
  test("claim makes the owner; a second claim is refused and changes nothing", async () => {
    expect(await share.claim({ road: ROAD, user: OWNER })).toEqual({});
    await expectRefusal("claim", "ROAD_ALREADY_OWNED", share.claim({ road: ROAD, user: STRANGER }));
    await expectRefusal("claim", "ROAD_ALREADY_OWNED", share.claim({ road: ROAD, user: OWNER }));
    expect(await role(ROAD, OWNER)).toBe("OWNER");
    expect(await role(ROAD, STRANGER)).toBe("NONE");
  });

  test("release deletes grants and links; releasing again is refused; the road can be claimed anew", async () => {
    await setup();
    await share.enableLink({ road: ROAD, requester: OWNER, role: "EDIT" });
    const token = await tokenOf(ROAD, "EDIT");
    await share.claim({ road: ROAD2, user: OWNER });

    expect(await share.release({ road: ROAD })).toEqual({});
    for (const u of [OWNER, EDITOR, VIEWER]) expect(await role(ROAD, u)).toBe("NONE");
    expect((await share._roadsSharedWith({ user: VIEWER })).length).toBe(0);
    await expectRefusal("join", "INVALID_LINK", share.join({ token, user: STRANGER }));
    await expectRefusal("release", "NO_SUCH_ROAD", share.release({ road: ROAD }));
    expect(await role(ROAD2, OWNER)).toBe("OWNER"); // other roads unaffected

    await share.claim({ road: ROAD, user: STRANGER });
    expect(await people(ROAD, STRANGER)).toEqual([]);
  });
});

describe("share", () => {
  test("owner adds viewers and editors, recorded as added by the owner", async () => {
    await setup();
    expect(await people(ROAD, OWNER)).toEqual([`${VIEWER}:VIEW:${OWNER}`, `${EDITOR}:EDIT:${OWNER}`].sort());
    expect(await role(ROAD, EDITOR)).toBe("EDIT");
    expect(await role(ROAD, VIEWER)).toBe("VIEW");
  });

  test("owner adding someone again changes their role, either way", async () => {
    await setup();
    expect(await share.share({ road: ROAD, requester: OWNER, user: VIEWER, role: "EDIT" })).toEqual({});
    expect(await role(ROAD, VIEWER)).toBe("EDIT");
    await share.share({ road: ROAD, requester: OWNER, user: VIEWER, role: "VIEW" });
    expect(await role(ROAD, VIEWER)).toBe("VIEW");
    expect(await people(ROAD, OWNER)).toContain(`${VIEWER}:VIEW:${OWNER}`); // addedBy unchanged
  });

  test("an editor adds viewers only, recorded as added by them", async () => {
    await setup();
    expect(await share.share({ road: ROAD, requester: EDITOR, user: VIEWER2, role: "VIEW" })).toEqual({});
    expect(await people(ROAD, OWNER)).toContain(`${VIEWER2}:VIEW:${EDITOR}`);
    await expectRefusal("share", "EDITORS_ADD_VIEWERS", share.share({ road: ROAD, requester: EDITOR, user: STRANGER, role: "EDIT" }));
    expect(await role(ROAD, STRANGER)).toBe("NONE");
  });

  test("an editor adding someone who already has access (even unseen) or the owner: same answer, no change", async () => {
    await setup();
    for (const user of [VIEWER, OWNER, EDITOR]) {
      expect(await share.share({ road: ROAD, requester: EDITOR, user, role: "VIEW" })).toEqual({});
    }
    expect(await role(ROAD, EDITOR)).toBe("EDIT"); // never lowered
    expect(await people(ROAD, OWNER)).toEqual([`${VIEWER}:VIEW:${OWNER}`, `${EDITOR}:EDIT:${OWNER}`].sort());
    expect(await people(ROAD, EDITOR)).toEqual([]); // still not shown to them
  });

  test("refusals, in the order the spec lists them", async () => {
    await setup();
    await expectRefusal("share", "NO_SUCH_ROAD", share.share({ road: ROAD, requester: STRANGER, user: VIEWER2, role: "VIEW" }));
    await expectRefusal("share", "NO_SUCH_ROAD", share.share({ road: "nope", requester: OWNER, user: VIEWER2, role: "VIEW" }));
    await expectRefusal("share", "NOT_AN_EDITOR", share.share({ road: ROAD, requester: VIEWER, user: VIEWER2, role: "VIEW" }));
    await expectRefusal("share", "BAD_ROLE", share.share({ road: ROAD, requester: OWNER, user: VIEWER2, role: "ADMIN" }));
    await expectRefusal("share", "BAD_ROLE", share.share({ road: ROAD, requester: EDITOR, user: VIEWER2, role: "ADMIN" }));
    await expectRefusal("share", "SHARE_WITH_OWNER", share.share({ road: ROAD, requester: OWNER, user: OWNER, role: "VIEW" }));
    expect(await role(ROAD, VIEWER2)).toBe("NONE");
  });
});

describe("setRole and unshare", () => {
  test("only the owner changes roles and removes people", async () => {
    await setup();
    expect(await share.setRole({ road: ROAD, requester: OWNER, user: EDITOR, role: "VIEW" })).toEqual({});
    expect(await role(ROAD, EDITOR)).toBe("VIEW");
    expect(await share.unshare({ road: ROAD, requester: OWNER, user: EDITOR })).toEqual({});
    expect(await role(ROAD, EDITOR)).toBe("NONE");
    expect((await share._roadsSharedWith({ user: EDITOR })).length).toBe(0);
  });

  test("refusals: stranger, editor, viewer, bad role, not shared; nothing changes", async () => {
    await setup();
    await share.share({ road: ROAD, requester: EDITOR, user: VIEWER2, role: "VIEW" });
    await expectRefusal("setRole", "NO_SUCH_ROAD", share.setRole({ road: ROAD, requester: STRANGER, user: VIEWER, role: "EDIT" }));
    await expectRefusal("setRole", "NOT_AN_OWNER", share.setRole({ road: ROAD, requester: EDITOR, user: VIEWER2, role: "EDIT" }));
    await expectRefusal("setRole", "NOT_AN_OWNER", share.setRole({ road: ROAD, requester: VIEWER, user: VIEWER, role: "EDIT" }));
    await expectRefusal("setRole", "BAD_ROLE", share.setRole({ road: ROAD, requester: OWNER, user: VIEWER, role: "OWNER" }));
    await expectRefusal("setRole", "NOT_SHARED", share.setRole({ road: ROAD, requester: OWNER, user: STRANGER, role: "EDIT" }));
    await expectRefusal("unshare", "NO_SUCH_ROAD", share.unshare({ road: ROAD, requester: STRANGER, user: VIEWER }));
    await expectRefusal("unshare", "NOT_AN_OWNER", share.unshare({ road: ROAD, requester: EDITOR, user: VIEWER2 }));
    await expectRefusal("unshare", "NOT_AN_OWNER", share.unshare({ road: ROAD, requester: VIEWER, user: VIEWER }));
    await expectRefusal("unshare", "NOT_SHARED", share.unshare({ road: ROAD, requester: OWNER, user: OWNER }));
    expect([await role(ROAD, VIEWER), await role(ROAD, VIEWER2)]).toEqual(["VIEW", "VIEW"]);
  });
});

describe("links", () => {
  test("enable, disable, regenerate: one link per role, owner only, nobody removed", async () => {
    await setup();
    expect(await share._links({ road: ROAD, requester: OWNER })).toEqual([]);
    await share.enableLink({ road: ROAD, requester: OWNER, role: "VIEW" });
    await share.enableLink({ road: ROAD, requester: OWNER, role: "VIEW" }); // still one link
    const token = await tokenOf(ROAD, "VIEW");
    expect(token.length).toBeGreaterThanOrEqual(22); // 128 bits in base64url
    await share.join({ token, user: VIEWER2 });

    await share.disableLink({ road: ROAD, requester: OWNER, role: "VIEW" });
    expect(await share._links({ road: ROAD, requester: OWNER })).toEqual([{ role: "VIEW", token, enabled: false }]);
    await expectRefusal("join", "INVALID_LINK", share.join({ token, user: STRANGER }));
    expect(await role(ROAD, VIEWER2)).toBe("VIEW"); // joined before: stays

    await share.regenerateLink({ road: ROAD, requester: OWNER, role: "VIEW" });
    const fresh = await tokenOf(ROAD, "VIEW");
    expect(fresh).not.toBe(token);
    expect((await share._links({ road: ROAD, requester: OWNER }))[0].enabled).toBe(false); // keeps being off
    await share.enableLink({ road: ROAD, requester: OWNER, role: "VIEW" });
    await expectRefusal("join", "INVALID_LINK", share.join({ token, user: STRANGER })); // old one is dead
    expect(await share.join({ token: fresh, user: STRANGER })).toEqual({ road: ROAD });

    // Regenerating a link that does not exist yet creates it, turned off; disabling one that does not exist is fine.
    await share.regenerateLink({ road: ROAD, requester: OWNER, role: "EDIT" });
    expect((await share._links({ road: ROAD, requester: OWNER })).find((l) => l.role === "EDIT")?.enabled).toBe(false);
    await share.claim({ road: ROAD2, user: OWNER });
    expect(await share.disableLink({ road: ROAD2, requester: OWNER, role: "EDIT" })).toEqual({});
    expect(await share._links({ road: ROAD2, requester: OWNER })).toEqual([]);
  });

  test("links are the owner's only: refusals and _links for anyone else", async () => {
    await setup();
    for (const action of ["enableLink", "disableLink", "regenerateLink"] as const) {
      await expectRefusal(action, "NO_SUCH_ROAD", share[action]({ road: ROAD, requester: STRANGER, role: "VIEW" }));
      await expectRefusal(action, "NOT_AN_OWNER", share[action]({ road: ROAD, requester: EDITOR, role: "VIEW" }));
      await expectRefusal(action, "NOT_AN_OWNER", share[action]({ road: ROAD, requester: VIEWER, role: "VIEW" }));
      await expectRefusal(action, "BAD_ROLE", share[action]({ road: ROAD, requester: OWNER, role: "OWNER" }));
    }
    await share.enableLink({ road: ROAD, requester: OWNER, role: "EDIT" });
    for (const u of [EDITOR, VIEWER, STRANGER]) expect(await share._links({ road: ROAD, requester: u })).toEqual([]);
  });

  test("join: grants the link's role, never lowers one, owner is a no-op, added by the owner", async () => {
    await setup();
    await share.share({ road: ROAD, requester: EDITOR, user: VIEWER2, role: "VIEW" });
    await share.enableLink({ road: ROAD, requester: OWNER, role: "VIEW" });
    await share.enableLink({ road: ROAD, requester: OWNER, role: "EDIT" });
    const view = await tokenOf(ROAD, "VIEW");
    const edit = await tokenOf(ROAD, "EDIT");

    await share.join({ token: view, user: STRANGER });
    expect(await people(ROAD, OWNER)).toContain(`${STRANGER}:VIEW:${OWNER}`);
    await share.join({ token: view, user: EDITOR });
    expect(await role(ROAD, EDITOR)).toBe("EDIT"); // a view link never lowers an editor
    await share.join({ token: edit, user: VIEWER });
    expect(await role(ROAD, VIEWER)).toBe("EDIT");
    expect(await share.join({ token: edit, user: OWNER })).toEqual({ road: ROAD });
    expect(await role(ROAD, OWNER)).toBe("OWNER");

    // An editor's invitee who opens the owner's link now counts as added by the owner.
    expect(await ownerSeenBy(ROAD, VIEWER2)).toEqual([]);
    await share.join({ token: view, user: VIEWER2 });
    expect(await people(ROAD, OWNER)).toContain(`${VIEWER2}:VIEW:${OWNER}`);
    expect(await ownerSeenBy(ROAD, VIEWER2)).toEqual([OWNER]);
  });

  test("join: unknown, empty and disabled tokens all give the same refusal", async () => {
    await setup();
    await share.regenerateLink({ road: ROAD, requester: OWNER, role: "VIEW" }); // exists, off
    for (const token of ["not-a-token", "", await tokenOf(ROAD, "VIEW")]) {
      await expectRefusal("join", "INVALID_LINK", share.join({ token, user: STRANGER }));
    }
    expect(await role(ROAD, STRANGER)).toBe("NONE");
  });
});

describe("queries", () => {
  test("_canView, _canEdit, _isOwner, _role for each kind of person and an unowned road", async () => {
    await setup();
    const rows = [];
    for (const u of [OWNER, EDITOR, VIEWER, STRANGER]) {
      rows.push([await role(ROAD, u), await canView(ROAD, u), await canEdit(ROAD, u), (await share._isOwner({ road: ROAD, user: u })).owner]);
    }
    expect(rows).toEqual([
      ["OWNER", true, true, true],
      ["EDIT", true, true, false],
      ["VIEW", true, false, false],
      ["NONE", false, false, false],
    ]);
    expect([await role("nope", OWNER), await canView("nope", OWNER), await canEdit("nope", OWNER)]).toEqual(["NONE", false, false]);
  });

  test("_roadsOwnedBy and _roadsSharedWith with roles", async () => {
    await setup();
    await share.claim({ road: ROAD2, user: OWNER });
    await share.share({ road: ROAD2, requester: OWNER, user: VIEWER, role: "EDIT" });
    expect(sorted((await share._roadsOwnedBy({ user: OWNER })).map((r) => r.road))).toEqual([ROAD, ROAD2]);
    expect(sorted((await share._roadsSharedWith({ user: VIEWER })).map((r) => `${r.road}:${r.role}`))).toEqual([`${ROAD}:VIEW`, `${ROAD2}:EDIT`]);
    expect(await share._roadsSharedWith({ user: OWNER })).toEqual([]);
    expect(await share._roadsOwnedBy({ user: VIEWER })).toEqual([]);
  });

  test("_grantsVisibleTo: owner all, editor own invitees, viewer and stranger none", async () => {
    await setup();
    await share.share({ road: ROAD, requester: EDITOR, user: VIEWER2, role: "VIEW" });
    expect(await people(ROAD, OWNER)).toHaveLength(3);
    expect(await people(ROAD, EDITOR)).toEqual([`${VIEWER2}:VIEW:${EDITOR}`]);
    expect(await people(ROAD, VIEWER)).toEqual([]);
    expect(await people(ROAD, STRANGER)).toEqual([]);
  });

  test("_ownerVisibleTo: hidden only from viewers an editor added (and strangers)", async () => {
    await setup();
    await share.share({ road: ROAD, requester: EDITOR, user: VIEWER2, role: "VIEW" });
    expect(await ownerSeenBy(ROAD, OWNER)).toEqual([OWNER]);
    expect(await ownerSeenBy(ROAD, EDITOR)).toEqual([OWNER]);
    expect(await ownerSeenBy(ROAD, VIEWER)).toEqual([OWNER]);
    expect(await ownerSeenBy(ROAD, VIEWER2)).toEqual([]);
    expect(await ownerSeenBy(ROAD, STRANGER)).toEqual([]);
    expect(await ownerSeenBy("nope", OWNER)).toEqual([]);
    // Made an editor by the owner, the same person may see the owner.
    await share.setRole({ road: ROAD, requester: OWNER, user: VIEWER2, role: "EDIT" });
    expect(await ownerSeenBy(ROAD, VIEWER2)).toEqual([OWNER]);
  });

  test("_known: what the requester already knows, never more", async () => {
    await setup();
    await share.share({ road: ROAD, requester: EDITOR, user: VIEWER2, role: "VIEW" });
    const known = async (requester: string, user: string) => (await share._known({ road: ROAD, requester, user })).known;
    expect([await known(OWNER, OWNER), await known(OWNER, VIEWER), await known(OWNER, VIEWER2), await known(OWNER, STRANGER)])
      .toEqual([true, true, true, false]);
    // An editor knows the owner, themself and their own invitees, not the owner's other people.
    expect([await known(EDITOR, OWNER), await known(EDITOR, EDITOR), await known(EDITOR, VIEWER2), await known(EDITOR, VIEWER)])
      .toEqual([true, true, true, false]);
  });
});

describe("legacy data", () => {
  test("an Access with a plain accessList: its users are viewers added by the owner", async () => {
    // Setup only: the shape Accesses had before Grants existed.
    await db().collection("share.accesses").insertOne({ _id: ROAD as any, owner: OWNER, accessList: [VIEWER, VIEWER2] });

    expect(await role(ROAD, VIEWER)).toBe("VIEW");
    expect(await canEdit(ROAD, VIEWER)).toBe(false);
    expect(await people(ROAD, OWNER)).toEqual([`${VIEWER}:VIEW:${OWNER}`, `${VIEWER2}:VIEW:${OWNER}`]);
    expect(await ownerSeenBy(ROAD, VIEWER)).toEqual([OWNER]);
    expect(sorted((await share._roadsSharedWith({ user: VIEWER2 })).map((r) => `${r.road}:${r.role}`))).toEqual([`${ROAD}:VIEW`]);

    // And every action keeps working on it.
    await share.share({ road: ROAD, requester: OWNER, user: EDITOR, role: "EDIT" });
    await share.unshare({ road: ROAD, requester: OWNER, user: VIEWER2 });
    expect(await people(ROAD, OWNER)).toEqual([`${VIEWER}:VIEW:${OWNER}`, `${EDITOR}:EDIT:${OWNER}`].sort());
    expect((await share._roadsSharedWith({ user: VIEWER2 })).length).toBe(0);
    await expectRefusal("share", "NOT_AN_EDITOR", share.share({ road: ROAD, requester: VIEWER, user: STRANGER, role: "VIEW" }));
  });
});
