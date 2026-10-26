// Tests for the Sharing part of the BFSThisMess composition (design/compositions/BFSThisMess.md),
// through the assembled application and a local client, written from the design.
//
// Run with: bun test test/sharing.test.ts (needs MongoDB at MONGODB_URI)

import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLocalClient } from "@mit-sdg/sync-engine/client";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import type { BFSThisMessWire } from "../generated/wire.ts";
import { assembleApplication } from "../src/assembly.ts";
import { importCatalog } from "../src/catalog/import.ts";
import type { SnapshotCourse } from "../src/concepts/CourseOffering.ts";
import type { RequirementItem } from "../src/concepts/Requirements.ts";
import { useFreshDb } from "./support.ts";

/*
 * Testing strategy
 *
 * Roles across the change endpoints: owner (allowed), editor (allowed for content, NOT_AN_OWNER
 *   for delete, unshare, setRole and links), viewer (NOT_AN_EDITOR), stranger (NO_SUCH_ROAD)
 * ShareRoad: owner adds viewer / editor; editor adds viewer / tries editor; unknown username;
 *   editor re-adding someone who already has access (same answer, no change)
 * FindUsers: prefix of 0-1 letters (none) / matches over 8 (at most 8) / excludes the requester,
 *   the owner and who the requester knows; for an editor, the owner's other people are not excluded
 * ViewSharing: owner (everyone, with added by) / editor (own invitees) / viewer (refused)
 * Links: enable, view, join (new person; never lowers), regenerate (old link invalid), disable
 * CopyRoad: viewer copies; what is copied (blocks, pins, locks, caps, choices) and not (prior);
 *   the copy is the copier's own and independent; empty name copies nothing; stranger refused
 * Owner privacy: a viewer an editor added never gets the owner's username (viewRoad, myRoads,
 *   viewSharing, copyRoad, joinLink); others with access do
 */

const db = useFreshDb("sharing_test");
const dir = mkdtempSync(join(tmpdir(), "sharing-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const course = (subject: string): SnapshotCourse => ({
  subject, name: subject, courseId: subject, description: "", lecturer: "Staff", level: "Undergraduate",
  terms: ["FALL", "SPRING"], offering: "Offered normally", canBeRepeated: false, prerequisitesText: "",
  corequisitesText: "", units: "3-0-9", prerequisites: [], corequisites: [], totalUnits: 12,
});

let order = 0;
const item = (key: string, kind: RequirementItem["kind"], fields: Partial<RequirementItem> = {}): RequirementItem => ({
  key, list: key.split("/")[0], parent: null, kind, title: key, count: kind === "GROUP" ? 0 : 1, options: [],
  approximate: false, technical: !key.startsWith("girs"), order: order++, ...fields,
});

const ITEMS = [
  item("majorA/1", "BLOCK", { title: "Core", options: ["A.1"] }),
  item("majorA/2", "CHOICE", { title: "Track" }),
  item("majorA/2.1", "GROUP", { parent: "majorA/2", title: "Theory" }),
  item("majorA/2.1.1", "BLOCK", { parent: "majorA/2.1", title: "Theory subjects", options: ["T.1"] }),
  item("majorA/2.2", "GROUP", { parent: "majorA/2", title: "Systems" }),
  item("majorA/2.2.1", "BLOCK", { parent: "majorA/2.2", title: "Systems subjects", options: ["S.1"] }),
];

type Client = ReturnType<typeof createLocalClient<BFSThisMessWire>>;
let api: Client["bfsthismess"];

beforeEach(async () => {
  const path = join(dir, "subjects.json");
  writeFileSync(path, JSON.stringify({ id: "s", source: "test", academicYear: 2026, courses: ["A.1", "T.1", "S.1", "X.1"].map(course) }));
  const requirementsPath = join(dir, "requirements.json");
  writeFileSync(requirementsPath, JSON.stringify({
    id: "r", source: "test",
    lists: [
      { id: "majorA", title: "A degree", shortTitle: "A", mediumTitle: "A Major", kind: "MAJOR" },
      { id: "girs", title: "GIRs", shortTitle: "GIRs", mediumTitle: "GIRs", kind: "GIRS" },
    ],
    items: ITEMS,
  }));
  await importCatalog(db(), { path, requirementsPath, log: () => {} });
  api = createLocalClient<BFSThisMessWire>({ invoker: createGateway({ application: assembleApplication(db()) }) }).bfsthismess;
});

const value = <T>(result: T): Exclude<T, { error: unknown }> => {
  if (result && typeof result === "object" && "error" in result) throw new Error(`refused: ${String(result.error)}`);
  return result as Exclude<T, { error: unknown }>;
};

async function signUp(username: string) {
  await api.register({ username, password: "pw" });
  return String(value(await api.logIn({ username, password: "pw" })).session);
}

/** student owns a road; ed is an editor and vic a viewer, both added by student. */
async function sharedRoad() {
  const student = await signUp("student");
  const ed = await signUp("ed");
  const vic = await signUp("vic");
  const road = String(value(await api.newRoad({ session: student, name: "Road", major: "majorA", startYear: 2026, startTerm: "FALL" })).road);
  value(await api.shareRoad({ session: student, road, username: "ed", role: "EDIT" }));
  value(await api.shareRoad({ session: student, road, username: "vic", role: "VIEW" }));
  return { student, ed, vic, road };
}

const access = async (session: string, road: string) => value(await api.viewRoad({ session, road, includeIAPAndSummer: false, limit: 1 })).access;
const peopleOf = async (session: string, road: string) =>
  value(await api.viewSharing({ session, road })).people.people.map((p) => `${p.username}:${p.role}:${p.addedBy}`).sort();

describe("roles", () => {
  test("covers: editors change content; viewers are refused NOT_AN_EDITOR; strangers NO_SUCH_ROAD", async () => {
    const { ed, vic, road } = await sharedRoad();
    const stranger = await signUp("stranger");
    const changes = (session: string) => [
      api.renameRoad({ session, road, name: "Renamed" }),
      api.addPrior({ session, road, subject: "X.1" }),
      api.pin({ session, road, subject: "A.1", year: 2026, term: "FALL" }),
      api.setCap({ session, road, year: 2026, term: "FALL", capType: "total", limit: 48 }),
      api.setLocked({ session, road, year: 2027, term: "SPRING", locked: true }),
      api.addBlock({ session, road, count: 1, technical: true }),
      api.refreshRequirements({ session, road }),
    ];
    for (const r of await Promise.all(changes(vic))) expect(r).toEqual({ error: "NOT_AN_EDITOR" });
    for (const r of await Promise.all(changes(stranger))) expect(r).toEqual({ error: "NO_SUCH_ROAD" });
    for (const r of await Promise.all(changes(ed))) expect(r).not.toHaveProperty("error");
    expect(value(await api.viewRoad({ session: vic, road, includeIAPAndSummer: false, limit: 1 })).constraints.name).toBe("Renamed");

    // Block-level changes are checked through the block's road in the same way.
    const { constraints } = value(await api.viewRoad({ session: ed, road, includeIAPAndSummer: false, limit: 1 }));
    const block = String(constraints.blocks[0].block);
    expect(await api.setCount({ session: vic, block, count: 1 })).toEqual({ error: "NOT_AN_EDITOR" });
    expect(await api.setCount({ session: ed, block, count: 1 })).toEqual({});
  });

  test("covers: owner-only requests refuse an editor and a viewer with NOT_AN_OWNER", async () => {
    const { student, ed, vic, road } = await sharedRoad();
    for (const session of [ed, vic]) {
      expect(await api.deleteRoad({ session, road })).toEqual({ error: "NOT_AN_OWNER" });
      expect(await api.unshareRoad({ session, road, username: "vic" })).toEqual({ error: "NOT_AN_OWNER" });
      expect(await api.setRole({ session, road, username: "vic", role: "EDIT" })).toEqual({ error: "NOT_AN_OWNER" });
      expect(await api.enableLink({ session, road, role: "VIEW" })).toEqual({ error: "NOT_AN_OWNER" });
      expect(await api.viewLinks({ session, road })).toEqual({ error: "NOT_AN_OWNER" });
    }
    expect((await access(vic, road)).role).toBe("VIEW");
    expect(await api.deleteRoad({ session: student, road })).toEqual({});
    expect(await api.viewRoad({ session: ed, road, includeIAPAndSummer: false, limit: 1 })).toEqual({ error: "NO_SUCH_ROAD" });
  });

  test("covers: the owner changes a role, and an upgraded viewer can then edit", async () => {
    const { student, vic, road } = await sharedRoad();
    expect(await api.setRole({ session: student, road, username: "vic", role: "EDIT" })).toEqual({});
    expect((await access(vic, road)).role).toBe("EDIT");
    expect(await api.renameRoad({ session: vic, road, name: "Ours" })).toEqual({});
    expect(await api.setRole({ session: student, road, username: "nobody", role: "EDIT" })).toEqual({ error: "NO_SUCH_USER" });
  });
});

describe("sharing", () => {
  test("covers: editors add viewers only, see only their invitees, and learn nothing from re-adding", async () => {
    const { student, ed, vic, road } = await sharedRoad();
    await signUp("third");
    expect(await api.shareRoad({ session: ed, road, username: "third", role: "EDIT" })).toEqual({ error: "EDITORS_ADD_VIEWERS" });
    expect(await api.shareRoad({ session: ed, road, username: "third", role: "VIEW" })).toEqual({});
    expect(await api.shareRoad({ session: ed, road, username: "vic", role: "VIEW" })).toEqual({}); // already has access
    expect(await api.shareRoad({ session: ed, road, username: "student", role: "VIEW" })).toEqual({}); // the owner
    expect(await api.shareRoad({ session: ed, road, username: "nobody", role: "VIEW" })).toEqual({ error: "NO_SUCH_USER" });
    expect(await api.shareRoad({ session: vic, road, username: "third", role: "VIEW" })).toEqual({ error: "NOT_AN_EDITOR" });

    expect(await peopleOf(student, road)).toEqual(["ed:EDIT:student", "third:VIEW:ed", "vic:VIEW:student"]);
    expect(await peopleOf(ed, road)).toEqual(["third:VIEW:ed"]);
    expect(await api.viewSharing({ session: vic, road })).toEqual({ error: "NOT_AN_EDITOR" });
  });

  test("covers: findUsers needs 2 letters, gives at most 8 usernames, leaves out only what the requester knows", async () => {
    const { student, ed, vic, road } = await sharedRoad();
    for (let i = 0; i < 10; i++) await signUp(`adv${i}`);
    await signUp("vicky");
    const find = async (session: string, prefix: string) =>
      value(await api.findUsers({ session, road, prefix })).people.people.map((p) => p.username);

    expect(await find(student, "a")).toEqual([]);
    expect(await find(student, "AD")).toEqual(["adv0", "adv1", "adv2", "adv3", "adv4", "adv5", "adv6", "adv7"]);
    expect(await find(student, "vi")).toEqual(["vicky"]); // vic is already on the road
    expect(await find(student, "st")).toEqual([]); // the owner themself
    // An editor is not told who else has access: vic (added by the owner) is still suggested.
    expect(await find(ed, "vi")).toEqual(["vic", "vicky"]);
    expect(await find(ed, "st")).toEqual([]); // the owner
    expect(await find(ed, "ed")).toEqual([]); // themself
    await api.shareRoad({ session: ed, road, username: "vicky", role: "VIEW" });
    expect(await find(ed, "vi")).toEqual(["vic"]); // their own invitee is left out
    expect(await api.findUsers({ session: vic, road, prefix: "ad" })).toEqual({ error: "NOT_AN_EDITOR" });
    const stranger = await signUp("zed");
    expect(await api.findUsers({ session: stranger, road, prefix: "ad" })).toEqual({ error: "NO_SUCH_ROAD" });
  });

  test("covers: links: join, never lower a role, regenerate kills the old link, disable", async () => {
    const { student, ed, road } = await sharedRoad();
    const fourth = await signUp("fourth");
    expect(await api.enableLink({ session: student, road, role: "VIEW" })).toEqual({});
    const links = () => api.viewLinks({ session: student, road }).then((r) => value(r).links.links);
    const token = (await links()).find((l) => l.role === "VIEW")!.token;

    expect(value(await api.joinLink({ session: fourth, token })).road).toBe(road);
    expect((await access(fourth, road)).role).toBe("VIEW");
    expect(value(await api.joinLink({ session: ed, token })).road).toBe(road);
    expect((await access(ed, road)).role).toBe("EDIT"); // not lowered
    expect(value(await api.joinLink({ session: student, token })).road).toBe(road); // the owner: just opens it

    expect(await api.regenerateLink({ session: student, road, role: "VIEW" })).toEqual({});
    const fifth = await signUp("fifth");
    expect(await api.joinLink({ session: fifth, token })).toEqual({ error: "INVALID_LINK" });
    const fresh = (await links()).find((l) => l.role === "VIEW")!.token;
    expect(await api.disableLink({ session: student, road, role: "VIEW" })).toEqual({});
    expect(await api.joinLink({ session: fifth, token: fresh })).toEqual({ error: "INVALID_LINK" });
    expect(await api.joinLink({ session: fifth, token: "made-up" })).toEqual({ error: "INVALID_LINK" });
    expect((await access(fourth, road)).role).toBe("VIEW"); // joined before: still there
    expect(await api.joinLink({ session: "no-session", token: fresh })).toEqual({ error: "NO_SUCH_SESSION" });
  });

  test("covers: myRoads gives each shared road's role; removing someone takes the road away", async () => {
    const { student, ed, vic, road } = await sharedRoad();
    const shared = async (session: string) => value(await api.myRoads({ session })).roads.shared.map((r) => `${r.name}:${r.role}`);
    expect(await shared(ed)).toEqual(["Road:EDIT"]);
    expect(await shared(vic)).toEqual(["Road:VIEW"]);
    expect(await api.unshareRoad({ session: student, road, username: "vic" })).toEqual({});
    expect(await shared(vic)).toEqual([]);
    expect(await api.viewRoad({ session: vic, road, includeIAPAndSummer: false, limit: 1 })).toEqual({ error: "NO_SUCH_ROAD" });
    expect(await api.unshareRoad({ session: student, road, username: "vic" })).toEqual({ error: "NOT_SHARED" });
  });
});

describe("copyRoad", () => {
  test("covers: a viewer copies the constraints but not the prior credit, into an independent road of their own", async () => {
    const { student, vic, road } = await sharedRoad();
    value(await api.addPrior({ session: student, road, subject: "X.1" }));
    value(await api.pin({ session: student, road, subject: "A.1", year: 2026, term: "FALL" }));
    value(await api.setCap({ session: student, road, year: 2027, term: "SPRING", capType: "total", limit: 36 }));
    value(await api.setLocked({ session: student, road, year: 2026, term: "FALL", locked: true }));
    const original = value(await api.viewRoad({ session: student, road, includeIAPAndSummer: false, limit: 1 }));
    const track = original.requirements.items.find((i) => i.item === "majorA/2.2")!;
    value(await api.chooseAlternative({ session: student, road, choice: "majorA/2", alternative: track.item }));

    const copy = String(value(await api.copyRoad({ session: vic, road, name: "My copy" })).road);
    expect(copy).not.toBe(road);
    const mine = value(await api.viewRoad({ session: vic, road: copy, includeIAPAndSummer: false, limit: 1 }));
    expect(mine.access.role).toBe("OWNER");
    expect(mine.constraints).toMatchObject({ name: "My copy", major: "majorA", startYear: 2026, startTerm: "FALL" });
    expect(mine.constraints.prior).toEqual([]);
    expect(mine.constraints.pins.map((p) => p.subject)).toEqual(["A.1"]);
    expect(mine.constraints.semesters.map((s) => [s.year, s.term, s.locked, s.maxUnits])).toEqual([
      [2026, "FALL", true, 0],
      [2027, "SPRING", false, 36],
    ]);
    expect(mine.requirements.items.find((i) => i.item === "majorA/2.2")?.chosen).toBe(true);
    expect(new Set(mine.constraints.blocks.map((b) => b.subject))).toEqual(new Set(["A.1", "S.1"]));

    // Independent: changing the copy leaves the original alone, and the copy is not shared.
    value(await api.setLocked({ session: vic, road: copy, year: 2026, term: "FALL", locked: false }));
    value(await api.unPin({ session: vic, road: copy, subject: "A.1" }));
    expect(value(await api.viewRoad({ session: student, road, includeIAPAndSummer: false, limit: 1 })).constraints.pins).toHaveLength(1);
    expect(await api.viewRoad({ session: student, road: copy, includeIAPAndSummer: false, limit: 1 })).toEqual({ error: "NO_SUCH_ROAD" });
    expect(await peopleOf(vic, copy)).toEqual([]);
  });

  test("covers: an empty name copies nothing; a stranger or no session is refused", async () => {
    const { vic, road } = await sharedRoad();
    const stranger = await signUp("stranger");
    const before = value(await api.myRoads({ session: vic })).roads.owned.length;
    expect(await api.copyRoad({ session: vic, road, name: "" })).toEqual({ error: "EMPTY_NAME" });
    expect(value(await api.myRoads({ session: vic })).roads.owned.length).toBe(before);
    expect(await api.copyRoad({ session: stranger, road, name: "Mine" })).toEqual({ error: "NO_SUCH_ROAD" });
    expect(await api.copyRoad({ session: "none", road, name: "Mine" })).toEqual({ error: "NO_SUCH_SESSION" });
    expect(value(await api.myRoads({ session: stranger })).roads.owned).toEqual([]);
  });
});

describe("owner privacy", () => {
  test("covers: a viewer an editor added never learns the owner; everyone else with access does", async () => {
    const { student, ed, vic, road } = await sharedRoad();
    const quiet = await signUp("quiet");
    value(await api.shareRoad({ session: ed, road, username: "quiet", role: "VIEW" }));

    expect((await access(quiet, road)).sharedBy).toEqual([]);
    const roads = value(await api.myRoads({ session: quiet })).roads;
    expect(roads.shared.map((r) => r.role)).toEqual(["VIEW"]);
    expect(roads.sharedBy).toEqual([]);
    expect(JSON.stringify(roads)).not.toContain("student");
    expect(await api.viewSharing({ session: quiet, road })).toEqual({ error: "NOT_AN_EDITOR" });
    expect(await api.viewLinks({ session: quiet, road })).toEqual({ error: "NOT_AN_OWNER" });
    const whole = value(await api.viewRoad({ session: quiet, road, includeIAPAndSummer: false, limit: 1 }));
    expect(JSON.stringify(whole)).not.toContain("student");

    const copy = String(value(await api.copyRoad({ session: quiet, road, name: "Q" })).road);
    const copied = value(await api.viewRoad({ session: quiet, road: copy, includeIAPAndSummer: false, limit: 1 }));
    expect(JSON.stringify(copied)).not.toContain("student");
    expect(copied.access.sharedBy).toEqual([{ username: "quiet" }]); // their own road

    // The owner, an editor and an owner-added viewer may see whose road it is.
    for (const session of [student, ed, vic]) expect((await access(session, road)).sharedBy).toEqual([{ username: "student" }]);
    expect(value(await api.myRoads({ session: vic })).roads.sharedBy).toEqual([{ road, username: "student" }]);

    // Joining through the owner's link counts as added by the owner.
    value(await api.enableLink({ session: student, road, role: "VIEW" }));
    const token = value(await api.viewLinks({ session: student, road })).links.links[0].token;
    const joined = value(await api.joinLink({ session: quiet, token }));
    expect(joined).toEqual({ road });
    expect((await access(quiet, road)).sharedBy).toEqual([{ username: "student" }]);
  });
});
