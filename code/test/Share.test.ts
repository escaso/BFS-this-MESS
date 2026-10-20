/**
 * Tests for the Share concept, written from Share.md (the spec), not from Share.ts.
 * Only the public actions and queries are used; no test reads the database directly.
 * Refusals are checked by the code and sentence the spec declares for each action.
 *
 * Run with: bun test test/Share.test.ts (needs MongoDB at MONGODB_URL)
 *
 * =====================================================================================
 * TESTING STRATEGY (partitions)
 * =====================================================================================
 *
 * Roads and users are opaque IDs, so tests use distinct strings for them.
 * Names used below: owner = "alice", viewer = "bob", other viewer = "carol",
 * stranger = "dave".
 *
 * ---- claim(road, user) ----
 * Partition on state of road:
 *   - road has no Access (never claimed)
 *   - road has an Access (already owned)
 *       . claimed again by its owner
 *       . claimed by a different user
 *       . claimed by a user in its accessList
 *   - road had an Access that was released
 * Partition on user:
 *   - user owns no other roads
 *   - user already owns other roads
 *   - user is a viewer of other roads
 * Partition on outcome:
 *   - returns (empty result), road becomes owned
 *   - refuses ROAD_ALREADY_OWNED, and existing Access is unchanged
 *
 * ---- release(road) ----
 * Partition on state of road:
 *   - no owner (never claimed)
 *   - no owner (already released)
 *   - owner, empty accessList
 *   - owner, nonempty accessList
 * Partition on other roads:
 *   - other roads exist (must be unaffected)
 *   - no other roads
 *
 * ---- share(road, requester, user) ----
 * Partition on road:
 *   - no owner (never claimed, or released)
 *   - has owner
 * Partition on requester (given road has an owner):
 *   - requester is the owner
 *   - requester is in accessList
 *   - requester is neither (stranger)
 * Partition on user (given requester is owner):
 *   - user is the owner
 *   - user not in accessList, not owner
 *   - user already in accessList
 * Partition on user (given requester is a viewer / stranger / road unowned):
 *   - user is the requester themself
 *   - user is the owner
 *   - user is some third party
 * Partition on accessList size before: 0, 1, many
 *
 * ---- unshare(road, requester, user) ----
 * Partition on road:
 *   - no owner (never claimed, or released)
 *   - has owner
 * Partition on requester (given road has an owner):
 *   - owner
 *   - in accessList
 *   - stranger
 * Partition on user (given requester is owner):
 *   - user in accessList
 *   - user not in accessList (never shared, or previously unshared)
 *   - user is the owner (never in accessList)
 * Partition on user (given requester is viewer / stranger):
 *   - user is the requester themself
 *   - user is another viewer
 *   - user is not shared with
 * Partition on accessList size before: 1, many
 *
 * ---- _canView(road, user) ----
 * Partition on road: no owner / has owner
 * Partition on user (given owner): the owner / in accessList / stranger
 * Partition on history: fresh / after share / after unshare / after release
 *
 * ---- _isOwner(road, user) ----
 * Partition on road: no owner / has owner
 * Partition on user (given owner): the owner / in accessList / stranger
 *
 * ---- _roadsOwnedBy(user) ----
 * Partition on number of roads owned: 0, 1, many
 * Partition on other data: roads owned by others exist / roads shared with user exist
 * Partition on history: after release of an owned road
 *
 * ---- _roadsSharedWith(user) ----
 * Partition on number of roads shared with user: 0, 1, many
 * Partition on other data: user owns roads / other users have shares
 * Partition on history: after unshare / after release / after being refused
 *
 * ---- _viewers(road) ----  (where road has an owner)
 * Partition on accessList: empty / 1 viewer / many viewers
 * Partition on history: after share / after unshare / after claim following a release
 *
 * ---- Cross-cutting ----
 *   - Principle: claim, share, viewer can view, unshare, viewer cannot view
 *   - Refused operations never change state
 *   - Indistinguishability: a road the requester cannot see and a road that does not
 *     exist are refused with the same refusal (NO_SUCH_ROAD)
 *   - Viewer permission is view-only: never lets one change the sharing
 *   - Ownership is never transferred (viewers cannot become owner, owner stays owner)
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { ShareConcept } from "../src/concepts/Share.ts";
import { refusalsOf, useFreshDb } from "./support.ts";

// ---------------------------------------------------------------- helpers

const OWNER = "alice";
const VIEWER = "bob";
const VIEWER2 = "carol";
const STRANGER = "dave";
const ROAD = "road-1";
const ROAD2 = "road-2";
const ROAD3 = "road-3";

const db = useFreshDb("share_test");
const expectRefusal = refusalsOf("Share");
let share: ShareConcept;

beforeEach(() => {
  share = new ShareConcept(db());
});

const sorted = (xs: string[]) => [...xs].sort();

async function viewers(road: string) {
  return sorted((await share._viewers({ road })).map((r) => r.user));
}
async function owned(user: string) {
  return sorted((await share._roadsOwnedBy({ user })).map((r) => r.road));
}
async function sharedWith(user: string) {
  return sorted((await share._roadsSharedWith({ user })).map((r) => r.road));
}
async function canView(road: string, user: string) {
  return (await share._canView({ road, user })).allowed;
}
async function isOwner(road: string, user: string) {
  return (await share._isOwner({ road, user })).owner;
}

/** Owner claims ROAD and shares it with each given viewer. */
async function setup(...viewerIds: string[]) {
  await share.claim({ road: ROAD, user: OWNER });
  for (const v of viewerIds) {
    await share.share({ road: ROAD, requester: OWNER, user: v });
  }
}

// ---------------------------------------------------------------- principle

test("principle: claim, share with advisor, advisor views, unshare, advisor cannot view", async () => {
  expect(await share.claim({ road: ROAD, user: OWNER })).toEqual({});
  expect(await isOwner(ROAD, OWNER)).toBe(true);
  expect(await canView(ROAD, OWNER)).toBe(true);
  expect(await canView(ROAD, VIEWER)).toBe(false);

  expect(await share.share({ road: ROAD, requester: OWNER, user: VIEWER })).toEqual({});
  expect(await canView(ROAD, VIEWER)).toBe(true);
  expect(await isOwner(ROAD, VIEWER)).toBe(false); // can look, not own
  expect(await sharedWith(VIEWER)).toEqual([ROAD]);
  expect(await viewers(ROAD)).toEqual([VIEWER]);

  expect(await share.unshare({ road: ROAD, requester: OWNER, user: VIEWER })).toEqual({});
  expect(await canView(ROAD, VIEWER)).toBe(false);
  expect(await sharedWith(VIEWER)).toEqual([]);
  expect(await viewers(ROAD)).toEqual([]);
  // the owner is unaffected throughout
  expect(await canView(ROAD, OWNER)).toBe(true);
  expect(await isOwner(ROAD, OWNER)).toBe(true);
});

// ---------------------------------------------------------------- claim

describe("claim", () => {
  test("unclaimed road becomes owned with empty accessList", async () => {
    expect(await share.claim({ road: ROAD, user: OWNER })).toEqual({});
    expect(await isOwner(ROAD, OWNER)).toBe(true);
    expect(await viewers(ROAD)).toEqual([]);
    expect(await owned(OWNER)).toEqual([ROAD]);
  });

  test("already owned road, claimed again by owner, is refused", async () => {
    await share.claim({ road: ROAD, user: OWNER });
    await expectRefusal("claim", "ROAD_ALREADY_OWNED", share.claim({ road: ROAD, user: OWNER }));
    expect(await owned(OWNER)).toEqual([ROAD]);
  });

  test("already owned road, claimed by different user, is refused and ownership is unchanged", async () => {
    await share.claim({ road: ROAD, user: OWNER });
    await expectRefusal("claim", "ROAD_ALREADY_OWNED", share.claim({ road: ROAD, user: STRANGER }));
    expect(await isOwner(ROAD, OWNER)).toBe(true);
    expect(await isOwner(ROAD, STRANGER)).toBe(false);
    expect(await canView(ROAD, STRANGER)).toBe(false);
    expect(await owned(STRANGER)).toEqual([]);
  });

  test("a viewer cannot claim the road they can view (ownership is never transferred)", async () => {
    await setup(VIEWER);
    await expectRefusal("claim", "ROAD_ALREADY_OWNED", share.claim({ road: ROAD, user: VIEWER }));
    expect(await isOwner(ROAD, OWNER)).toBe(true);
    expect(await isOwner(ROAD, VIEWER)).toBe(false);
    expect(await viewers(ROAD)).toEqual([VIEWER]); // sharing intact
  });

  test("refused claim leaves existing accessList untouched", async () => {
    await setup(VIEWER, VIEWER2);
    await expectRefusal("claim", "ROAD_ALREADY_OWNED", share.claim({ road: ROAD, user: STRANGER }));
    expect(await viewers(ROAD)).toEqual(sorted([VIEWER, VIEWER2]));
  });

  test("user who already owns other roads can claim another", async () => {
    await share.claim({ road: ROAD, user: OWNER });
    await share.claim({ road: ROAD2, user: OWNER });
    expect(await owned(OWNER)).toEqual(sorted([ROAD, ROAD2]));
  });

  test("user who views another road can claim a different road", async () => {
    await setup(VIEWER);
    await share.claim({ road: ROAD2, user: VIEWER });
    expect(await isOwner(ROAD2, VIEWER)).toBe(true);
    expect(await owned(VIEWER)).toEqual([ROAD2]);
    expect(await sharedWith(VIEWER)).toEqual([ROAD]);
  });

  test("different users can claim different roads independently", async () => {
    await share.claim({ road: ROAD, user: OWNER });
    await share.claim({ road: ROAD2, user: STRANGER });
    expect(await owned(OWNER)).toEqual([ROAD]);
    expect(await owned(STRANGER)).toEqual([ROAD2]);
    expect(await canView(ROAD, STRANGER)).toBe(false);
    expect(await canView(ROAD2, OWNER)).toBe(false);
  });

  test("road can be claimed again after release, by anyone, with a fresh accessList", async () => {
    await setup(VIEWER);
    await share.release({ road: ROAD });
    await share.claim({ road: ROAD, user: STRANGER });
    expect(await isOwner(ROAD, STRANGER)).toBe(true);
    expect(await isOwner(ROAD, OWNER)).toBe(false);
    expect(await canView(ROAD, OWNER)).toBe(false);
    expect(await canView(ROAD, VIEWER)).toBe(false); // old sharing is gone
    expect(await viewers(ROAD)).toEqual([]);
  });
});

// ---------------------------------------------------------------- release

describe("release", () => {
  test("never-claimed road is refused with NO_SUCH_ROAD", async () => {
    await expectRefusal("release", "NO_SUCH_ROAD", share.release({ road: ROAD }));
  });

  test("already-released road is refused with NO_SUCH_ROAD", async () => {
    await share.claim({ road: ROAD, user: OWNER });
    await share.release({ road: ROAD });
    await expectRefusal("release", "NO_SUCH_ROAD", share.release({ road: ROAD }));
  });

  test("owned road with empty accessList: nobody owns or can view it afterwards", async () => {
    await share.claim({ road: ROAD, user: OWNER });
    expect(await share.release({ road: ROAD })).toEqual({});
    expect(await canView(ROAD, OWNER)).toBe(false);
    expect(await isOwner(ROAD, OWNER)).toBe(false);
    expect(await owned(OWNER)).toEqual([]);
  });

  test("owned road with viewers removes access for owner and all viewers", async () => {
    await setup(VIEWER, VIEWER2);
    expect(await share.release({ road: ROAD })).toEqual({});
    for (const u of [OWNER, VIEWER, VIEWER2, STRANGER]) {
      expect(await canView(ROAD, u)).toBe(false);
      expect(await isOwner(ROAD, u)).toBe(false);
    }
    expect(await owned(OWNER)).toEqual([]);
    expect(await sharedWith(VIEWER)).toEqual([]);
    expect(await sharedWith(VIEWER2)).toEqual([]);
  });

  test("later share/unshare on released road are refused as NO_SUCH_ROAD", async () => {
    await setup(VIEWER);
    await share.release({ road: ROAD });
    await expectRefusal("share", "NO_SUCH_ROAD", share.share({ road: ROAD, requester: OWNER, user: VIEWER2 }));
    await expectRefusal("unshare", "NO_SUCH_ROAD", share.unshare({ road: ROAD, requester: OWNER, user: VIEWER }));
  });

  test("does not affect other roads, their owners, or their viewers", async () => {
    await setup(VIEWER);
    await share.claim({ road: ROAD2, user: OWNER });
    await share.share({ road: ROAD2, requester: OWNER, user: VIEWER });
    await share.claim({ road: ROAD3, user: STRANGER });

    await share.release({ road: ROAD });

    expect(await owned(OWNER)).toEqual([ROAD2]);
    expect(await sharedWith(VIEWER)).toEqual([ROAD2]);
    expect(await canView(ROAD2, VIEWER)).toBe(true);
    expect(await viewers(ROAD2)).toEqual([VIEWER]);
    expect(await owned(STRANGER)).toEqual([ROAD3]);
  });
});

// ---------------------------------------------------------------- share

describe("share", () => {
  test("owner shares with a new user (empty accessList)", async () => {
    await share.claim({ road: ROAD, user: OWNER });
    expect(await share.share({ road: ROAD, requester: OWNER, user: VIEWER })).toEqual({});
    expect(await canView(ROAD, VIEWER)).toBe(true);
    expect(await viewers(ROAD)).toEqual([VIEWER]);
    expect(await sharedWith(VIEWER)).toEqual([ROAD]);
  });

  test("owner shares with additional users (accessList size 1 -> many)", async () => {
    await setup(VIEWER);
    await share.share({ road: ROAD, requester: OWNER, user: VIEWER2 });
    await share.share({ road: ROAD, requester: OWNER, user: STRANGER });
    expect(await viewers(ROAD)).toEqual(sorted([VIEWER, VIEWER2, STRANGER]));
    for (const u of [VIEWER, VIEWER2, STRANGER]) {
      expect(await canView(ROAD, u)).toBe(true);
    }
  });

  test("sharing with a user already in accessList succeeds and adds no duplicate", async () => {
    await setup(VIEWER);
    expect(await share.share({ road: ROAD, requester: OWNER, user: VIEWER })).toEqual({});
    expect(await viewers(ROAD)).toEqual([VIEWER]);
    expect(await sharedWith(VIEWER)).toEqual([ROAD]);
    // one unshare is enough to remove them, proving there was only one entry
    await share.unshare({ road: ROAD, requester: OWNER, user: VIEWER });
    expect(await canView(ROAD, VIEWER)).toBe(false);
    expect(await viewers(ROAD)).toEqual([]);
  });

  test("owner sharing with themself is refused with SHARE_WITH_OWNER", async () => {
    await share.claim({ road: ROAD, user: OWNER });
    await expectRefusal("share", "SHARE_WITH_OWNER", share.share({ road: ROAD, requester: OWNER, user: OWNER }));
    expect(await viewers(ROAD)).toEqual([]); // owner not put in accessList
    expect(await sharedWith(OWNER)).toEqual([]);
  });

  test("unowned road is refused with NO_SUCH_ROAD, whoever the requester", async () => {
    await expectRefusal("share", "NO_SUCH_ROAD", share.share({ road: ROAD, requester: OWNER, user: VIEWER }));
    await expectRefusal("share", "NO_SUCH_ROAD", share.share({ road: ROAD, requester: VIEWER, user: VIEWER }));
    expect(await canView(ROAD, VIEWER)).toBe(false);
    expect(await sharedWith(VIEWER)).toEqual([]);
  });

  test("stranger is refused with NO_SUCH_ROAD (same as a road that does not exist)", async () => {
    await share.claim({ road: ROAD, user: OWNER });
    await expectRefusal("share", "NO_SUCH_ROAD", share.share({ road: ROAD, requester: STRANGER, user: VIEWER }));
    expect(await canView(ROAD, VIEWER)).toBe(false);
    expect(await viewers(ROAD)).toEqual([]);
  });

  test("stranger sharing with themself or with the owner is still NO_SUCH_ROAD", async () => {
    await share.claim({ road: ROAD, user: OWNER });
    await expectRefusal("share", "NO_SUCH_ROAD", share.share({ road: ROAD, requester: STRANGER, user: STRANGER }));
    await expectRefusal("share", "NO_SUCH_ROAD", share.share({ road: ROAD, requester: STRANGER, user: OWNER }));
    expect(await canView(ROAD, STRANGER)).toBe(false);
    expect(await viewers(ROAD)).toEqual([]);
  });

  test("viewer is refused with NOT_AN_OWNER (third party)", async () => {
    await setup(VIEWER);
    await expectRefusal("share", "NOT_AN_OWNER", share.share({ road: ROAD, requester: VIEWER, user: VIEWER2 }));
    expect(await canView(ROAD, VIEWER2)).toBe(false);
    expect(await viewers(ROAD)).toEqual([VIEWER]);
  });

  test("viewer is refused with NOT_AN_OWNER even when sharing with themself or the owner", async () => {
    await setup(VIEWER);
    await expectRefusal("share", "NOT_AN_OWNER", share.share({ road: ROAD, requester: VIEWER, user: VIEWER }));
    await expectRefusal("share", "NOT_AN_OWNER", share.share({ road: ROAD, requester: VIEWER, user: OWNER }));
    expect(await viewers(ROAD)).toEqual([VIEWER]);
  });

  test("sharing one road does not share the owner's other roads", async () => {
    await share.claim({ road: ROAD, user: OWNER });
    await share.claim({ road: ROAD2, user: OWNER });
    await share.share({ road: ROAD, requester: OWNER, user: VIEWER });
    expect(await canView(ROAD, VIEWER)).toBe(true);
    expect(await canView(ROAD2, VIEWER)).toBe(false);
    expect(await sharedWith(VIEWER)).toEqual([ROAD]);
  });

  test("same user can be a viewer of roads owned by different owners", async () => {
    await share.claim({ road: ROAD, user: OWNER });
    await share.claim({ road: ROAD2, user: STRANGER });
    await share.share({ road: ROAD, requester: OWNER, user: VIEWER });
    await share.share({ road: ROAD2, requester: STRANGER, user: VIEWER });
    expect(await sharedWith(VIEWER)).toEqual(sorted([ROAD, ROAD2]));
  });

  test("owner of one road can be a viewer of another and remains owner of theirs", async () => {
    await share.claim({ road: ROAD, user: OWNER });
    await share.claim({ road: ROAD2, user: VIEWER });
    await share.share({ road: ROAD, requester: OWNER, user: VIEWER });
    expect(await isOwner(ROAD2, VIEWER)).toBe(true);
    expect(await isOwner(ROAD, VIEWER)).toBe(false);
    expect(await owned(VIEWER)).toEqual([ROAD2]);
    expect(await sharedWith(VIEWER)).toEqual([ROAD]);
  });

  test("shared viewer never becomes owner", async () => {
    await setup(VIEWER);
    expect(await isOwner(ROAD, VIEWER)).toBe(false);
    expect(await owned(VIEWER)).toEqual([]);
  });
});

// ---------------------------------------------------------------- unshare

describe("unshare", () => {
  test("owner removes the only viewer", async () => {
    await setup(VIEWER);
    expect(await share.unshare({ road: ROAD, requester: OWNER, user: VIEWER })).toEqual({});
    expect(await canView(ROAD, VIEWER)).toBe(false);
    expect(await viewers(ROAD)).toEqual([]);
    expect(await sharedWith(VIEWER)).toEqual([]);
  });

  test("owner removes one of many viewers, others keep access", async () => {
    await setup(VIEWER, VIEWER2, STRANGER);
    await share.unshare({ road: ROAD, requester: OWNER, user: VIEWER2 });
    expect(await canView(ROAD, VIEWER2)).toBe(false);
    expect(await canView(ROAD, VIEWER)).toBe(true);
    expect(await canView(ROAD, STRANGER)).toBe(true);
    expect(await viewers(ROAD)).toEqual(sorted([VIEWER, STRANGER]));
  });

  test("removing a viewer from one road leaves their access to other roads", async () => {
    await setup(VIEWER);
    await share.claim({ road: ROAD2, user: OWNER });
    await share.share({ road: ROAD2, requester: OWNER, user: VIEWER });
    await share.unshare({ road: ROAD, requester: OWNER, user: VIEWER });
    expect(await canView(ROAD, VIEWER)).toBe(false);
    expect(await canView(ROAD2, VIEWER)).toBe(true);
    expect(await sharedWith(VIEWER)).toEqual([ROAD2]);
  });

  test("owner can share again after unsharing", async () => {
    await setup(VIEWER);
    await share.unshare({ road: ROAD, requester: OWNER, user: VIEWER });
    await share.share({ road: ROAD, requester: OWNER, user: VIEWER });
    expect(await canView(ROAD, VIEWER)).toBe(true);
    expect(await viewers(ROAD)).toEqual([VIEWER]);
  });

  test("user never shared with is refused with NOT_SHARED", async () => {
    await setup(VIEWER);
    await expectRefusal("unshare", "NOT_SHARED", share.unshare({ road: ROAD, requester: OWNER, user: VIEWER2 }));
    expect(await viewers(ROAD)).toEqual([VIEWER]);
  });

  test("user already unshared is refused with NOT_SHARED", async () => {
    await setup(VIEWER);
    await share.unshare({ road: ROAD, requester: OWNER, user: VIEWER });
    await expectRefusal("unshare", "NOT_SHARED", share.unshare({ road: ROAD, requester: OWNER, user: VIEWER }));
  });

  test("owner unsharing the owner is refused with NOT_SHARED and owner keeps access", async () => {
    await setup(VIEWER);
    await expectRefusal("unshare", "NOT_SHARED", share.unshare({ road: ROAD, requester: OWNER, user: OWNER }));
    expect(await canView(ROAD, OWNER)).toBe(true);
    expect(await isOwner(ROAD, OWNER)).toBe(true);
  });

  test("unowned road is refused with NO_SUCH_ROAD", async () => {
    await expectRefusal("unshare", "NO_SUCH_ROAD", share.unshare({ road: ROAD, requester: OWNER, user: VIEWER }));
  });

  test("stranger is refused with NO_SUCH_ROAD, even for a user who is not shared with", async () => {
    await setup(VIEWER);
    // user is a real viewer
    await expectRefusal("unshare", "NO_SUCH_ROAD", share.unshare({ road: ROAD, requester: STRANGER, user: VIEWER }));
    // user is not a viewer: still NO_SUCH_ROAD, not NOT_SHARED
    await expectRefusal("unshare", "NO_SUCH_ROAD", share.unshare({ road: ROAD, requester: STRANGER, user: VIEWER2 }));
    // user is the stranger themself
    await expectRefusal("unshare", "NO_SUCH_ROAD", share.unshare({ road: ROAD, requester: STRANGER, user: STRANGER }));
    expect(await viewers(ROAD)).toEqual([VIEWER]);
  });

  test("viewer cannot remove another viewer (NOT_AN_OWNER)", async () => {
    await setup(VIEWER, VIEWER2);
    await expectRefusal("unshare", "NOT_AN_OWNER", share.unshare({ road: ROAD, requester: VIEWER, user: VIEWER2 }));
    expect(await viewers(ROAD)).toEqual(sorted([VIEWER, VIEWER2]));
  });

  test("viewer cannot remove themself (NOT_AN_OWNER)", async () => {
    await setup(VIEWER);
    await expectRefusal("unshare", "NOT_AN_OWNER", share.unshare({ road: ROAD, requester: VIEWER, user: VIEWER }));
    expect(await canView(ROAD, VIEWER)).toBe(true);
  });

  test("viewer is refused with NOT_AN_OWNER even if the target is the owner or not shared", async () => {
    await setup(VIEWER);
    await expectRefusal("unshare", "NOT_AN_OWNER", share.unshare({ road: ROAD, requester: VIEWER, user: OWNER }));
    await expectRefusal("unshare", "NOT_AN_OWNER", share.unshare({ road: ROAD, requester: VIEWER, user: STRANGER }));
    expect(await canView(ROAD, OWNER)).toBe(true);
    expect(await viewers(ROAD)).toEqual([VIEWER]);
  });
});

// ---------------------------------------------------------------- _canView

describe("_canView", () => {
  test("road with no owner is false for everyone", async () => {
    for (const u of [OWNER, VIEWER, STRANGER]) {
      expect(await share._canView({ road: ROAD, user: u })).toEqual({ allowed: false });
    }
  });

  test("true for owner, true for viewer, false for stranger", async () => {
    await setup(VIEWER);
    expect(await share._canView({ road: ROAD, user: OWNER })).toEqual({ allowed: true });
    expect(await share._canView({ road: ROAD, user: VIEWER })).toEqual({ allowed: true });
    expect(await share._canView({ road: ROAD, user: STRANGER })).toEqual({ allowed: false });
  });

  test("owned road with empty accessList is visible only to the owner", async () => {
    await share.claim({ road: ROAD, user: OWNER });
    expect(await canView(ROAD, OWNER)).toBe(true);
    expect(await canView(ROAD, VIEWER)).toBe(false);
  });

  test("is per road (access to one road gives none to another)", async () => {
    await setup(VIEWER);
    await share.claim({ road: ROAD2, user: STRANGER });
    expect(await canView(ROAD2, VIEWER)).toBe(false);
    expect(await canView(ROAD2, OWNER)).toBe(false);
    expect(await canView(ROAD, STRANGER)).toBe(false);
  });

  test("refused share does not grant view", async () => {
    await setup(VIEWER);
    await expectRefusal("share", "NOT_AN_OWNER", share.share({ road: ROAD, requester: VIEWER, user: STRANGER }));
    await expectRefusal("share", "NO_SUCH_ROAD", share.share({ road: ROAD, requester: STRANGER, user: STRANGER }));
    expect(await canView(ROAD, STRANGER)).toBe(false);
  });
});

// ---------------------------------------------------------------- _isOwner

describe("_isOwner", () => {
  test("road with no owner is false for everyone", async () => {
    for (const u of [OWNER, VIEWER, STRANGER]) {
      expect(await share._isOwner({ road: ROAD, user: u })).toEqual({ owner: false });
    }
  });

  test("true only for the owner, not for viewers or strangers", async () => {
    await setup(VIEWER);
    expect(await share._isOwner({ road: ROAD, user: OWNER })).toEqual({ owner: true });
    expect(await share._isOwner({ road: ROAD, user: VIEWER })).toEqual({ owner: false });
    expect(await share._isOwner({ road: ROAD, user: STRANGER })).toEqual({ owner: false });
  });

  test("owner remains owner after sharing and unsharing", async () => {
    await setup(VIEWER);
    await share.unshare({ road: ROAD, requester: OWNER, user: VIEWER });
    expect(await isOwner(ROAD, OWNER)).toBe(true);
    expect(await isOwner(ROAD, VIEWER)).toBe(false);
  });
});

// ---------------------------------------------------------------- _roadsOwnedBy

describe("_roadsOwnedBy", () => {
  test("user who owns nothing gets no rows", async () => {
    expect(await share._roadsOwnedBy({ user: OWNER })).toEqual([]);
  });

  test("one owned road", async () => {
    await share.claim({ road: ROAD, user: OWNER });
    expect(await share._roadsOwnedBy({ user: OWNER })).toEqual([{ road: ROAD }]);
  });

  test("many owned roads, excluding others' roads and roads shared with the user", async () => {
    await share.claim({ road: ROAD, user: OWNER });
    await share.claim({ road: ROAD2, user: OWNER });
    await share.claim({ road: ROAD3, user: STRANGER });
    await share.share({ road: ROAD3, requester: STRANGER, user: OWNER });
    expect(await owned(OWNER)).toEqual(sorted([ROAD, ROAD2]));
    expect(await owned(STRANGER)).toEqual([ROAD3]);
  });

  test("viewer who owns nothing gets no rows", async () => {
    await setup(VIEWER);
    expect(await owned(VIEWER)).toEqual([]);
  });

  test("released road is no longer listed", async () => {
    await share.claim({ road: ROAD, user: OWNER });
    await share.claim({ road: ROAD2, user: OWNER });
    await share.release({ road: ROAD });
    expect(await owned(OWNER)).toEqual([ROAD2]);
  });
});

// ---------------------------------------------------------------- _roadsSharedWith

describe("_roadsSharedWith", () => {
  test("user with no shares gets no rows", async () => {
    await setup();
    expect(await share._roadsSharedWith({ user: VIEWER })).toEqual([]);
  });

  test("one shared road", async () => {
    await setup(VIEWER);
    expect(await share._roadsSharedWith({ user: VIEWER })).toEqual([{ road: ROAD }]);
  });

  test("many shared roads, excluding unshared ones and other users' shares", async () => {
    await share.claim({ road: ROAD, user: OWNER });
    await share.claim({ road: ROAD2, user: OWNER });
    await share.claim({ road: ROAD3, user: OWNER });
    await share.share({ road: ROAD, requester: OWNER, user: VIEWER });
    await share.share({ road: ROAD2, requester: OWNER, user: VIEWER });
    await share.share({ road: ROAD3, requester: OWNER, user: VIEWER2 });
    expect(await sharedWith(VIEWER)).toEqual(sorted([ROAD, ROAD2]));
    expect(await sharedWith(VIEWER2)).toEqual([ROAD3]);
  });

  test("does not list roads the user owns", async () => {
    await setup(VIEWER);
    expect(await sharedWith(OWNER)).toEqual([]);
  });

  test("unshared road is no longer listed", async () => {
    await setup(VIEWER);
    await share.claim({ road: ROAD2, user: OWNER });
    await share.share({ road: ROAD2, requester: OWNER, user: VIEWER });
    await share.unshare({ road: ROAD, requester: OWNER, user: VIEWER });
    expect(await sharedWith(VIEWER)).toEqual([ROAD2]);
  });

  test("released road is no longer listed", async () => {
    await setup(VIEWER);
    await share.release({ road: ROAD });
    expect(await sharedWith(VIEWER)).toEqual([]);
  });

  test("refused share does not add a row", async () => {
    await setup(VIEWER);
    await expectRefusal("share", "NOT_AN_OWNER", share.share({ road: ROAD, requester: VIEWER, user: VIEWER2 }));
    expect(await sharedWith(VIEWER2)).toEqual([]);
  });
});

// ---------------------------------------------------------------- _viewers

describe("_viewers", () => {
  test("owned road with no sharing gets no rows (owner is not listed)", async () => {
    await share.claim({ road: ROAD, user: OWNER });
    expect(await share._viewers({ road: ROAD })).toEqual([]);
  });

  test("one viewer", async () => {
    await setup(VIEWER);
    expect(await share._viewers({ road: ROAD })).toEqual([{ user: VIEWER }]);
  });

  test("many viewers, owner excluded, other roads' viewers excluded", async () => {
    await setup(VIEWER, VIEWER2);
    await share.claim({ road: ROAD2, user: OWNER });
    await share.share({ road: ROAD2, requester: OWNER, user: STRANGER });
    expect(await viewers(ROAD)).toEqual(sorted([VIEWER, VIEWER2]));
    expect(await viewers(ROAD2)).toEqual([STRANGER]);
  });

  test("reflects unshare", async () => {
    await setup(VIEWER, VIEWER2);
    await share.unshare({ road: ROAD, requester: OWNER, user: VIEWER });
    expect(await viewers(ROAD)).toEqual([VIEWER2]);
  });

  test("a road claimed again after release starts with no viewers", async () => {
    await setup(VIEWER, VIEWER2);
    await share.release({ road: ROAD });
    await share.claim({ road: ROAD, user: OWNER });
    expect(await viewers(ROAD)).toEqual([]);
  });
});

// ---------------------------------------------------------------- invariants

describe("invariants", () => {
  test("refused operations leave all observable state unchanged", async () => {
    await setup(VIEWER);
    const before = {
      owned: await owned(OWNER),
      viewers: await viewers(ROAD),
      shared: await sharedWith(VIEWER),
    };

    await expectRefusal("claim", "ROAD_ALREADY_OWNED", share.claim({ road: ROAD, user: STRANGER }));
    await expectRefusal("share", "SHARE_WITH_OWNER", share.share({ road: ROAD, requester: OWNER, user: OWNER }));
    await expectRefusal("share", "NOT_AN_OWNER", share.share({ road: ROAD, requester: VIEWER, user: VIEWER2 }));
    await expectRefusal("share", "NO_SUCH_ROAD", share.share({ road: ROAD, requester: STRANGER, user: VIEWER2 }));
    await expectRefusal("unshare", "NOT_SHARED", share.unshare({ road: ROAD, requester: OWNER, user: VIEWER2 }));
    await expectRefusal("unshare", "NOT_AN_OWNER", share.unshare({ road: ROAD, requester: VIEWER, user: VIEWER }));
    await expectRefusal("unshare", "NO_SUCH_ROAD", share.unshare({ road: ROAD, requester: STRANGER, user: VIEWER }));
    await expectRefusal("release", "NO_SUCH_ROAD", share.release({ road: ROAD2 }));

    expect(await owned(OWNER)).toEqual(before.owned);
    expect(await viewers(ROAD)).toEqual(before.viewers);
    expect(await sharedWith(VIEWER)).toEqual(before.shared);
    expect(await isOwner(ROAD, OWNER)).toBe(true);
  });

  test("a stranger gets the same refusal for a hidden road and a nonexistent road", async () => {
    await share.claim({ road: ROAD, user: OWNER }); // exists, but STRANGER can't see it
    const hidden = await share.share({ road: ROAD, requester: STRANGER, user: VIEWER }).catch((e: Error) => e.message);
    const missing = await share
      .share({ road: "no-such-road", requester: STRANGER, user: VIEWER })
      .catch((e: Error) => e.message);
    expect(hidden).toBe("There is no such road.");
    expect(missing).toBe(hidden);

    const hiddenU = await share
      .unshare({ road: ROAD, requester: STRANGER, user: VIEWER })
      .catch((e: Error) => e.message);
    const missingU = await share
      .unshare({ road: "no-such-road", requester: STRANGER, user: VIEWER })
      .catch((e: Error) => e.message);
    expect(hiddenU).toBe("There is no such road.");
    expect(missingU).toBe(hiddenU);
  });

  test("viewing permission never allows changing sharing", async () => {
    await setup(VIEWER, VIEWER2);
    // VIEWER tries everything a non-owner could: share, unshare, claim
    await expectRefusal("share", "NOT_AN_OWNER", share.share({ road: ROAD, requester: VIEWER, user: STRANGER }));
    await expectRefusal("unshare", "NOT_AN_OWNER", share.unshare({ road: ROAD, requester: VIEWER, user: VIEWER2 }));
    await expectRefusal("claim", "ROAD_ALREADY_OWNED", share.claim({ road: ROAD, user: VIEWER }));
    expect(await viewers(ROAD)).toEqual(sorted([VIEWER, VIEWER2]));
    expect(await isOwner(ROAD, OWNER)).toBe(true);
    expect(await isOwner(ROAD, VIEWER)).toBe(false);
  });
});
