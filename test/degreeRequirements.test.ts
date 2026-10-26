// Tests for the Degree requirements part of the BFSThisMess composition
// (design/compositions/BFSThisMess.md), through the assembled application and a local client.
//
// Run with: bun test test/degreeRequirements.test.ts (needs MongoDB at MONGODB_URI)

import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createLocalClient } from "@mit-sdg/sync-engine/client";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import type { BFSThisMessWire } from "../generated/wire.ts";
import { assembleApplication } from "../src/assembly.ts";
import { importCatalog } from "../src/catalog/import.ts";
import { ConstrainConcept } from "../src/concepts/Constrain.ts";
import type { SnapshotCourse } from "../src/concepts/CourseOffering.ts";
import type { RequirementItem } from "../src/concepts/Requirements.ts";
import { useFreshDb } from "./support.ts";

/*
 * Testing strategy
 *
 * NewRoad: partition on major: a major, the GIRs (not a major), unknown
 *   -> blocks of the major and of the GIRs are in place when it answers, with titles,
 *      origins, technical (major) / not technical (GIRs), and groups: the major's blocks share
 *      the major's group, an overlay and each GIR block have their own; the GIRs' blocks are early
 * SetMajor: partition on major: another major, unknown; requester: owner, viewer
 *   -> listed blocks replaced, the student's own blocks kept
 * ChooseAlternative: partition on requester: owner, someone else; alternative: another one
 * RefreshRequirements: partition on requester: owner, someone else, no session
 *   -> listed blocks listed again, the student's kept
 *   -> blocks follow the choice; outline marks it chosen
 * ListMajors: only majors, in order
 * AddOption / AddPrior: partition on subject: known, unknown (NO_LISTING)
 * DeleteRoad: the road's choices are forgotten
 */

const db = useFreshDb("degree_requirements_test");
const dir = mkdtempSync(join(tmpdir(), "degree-"));
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
  item("majorA/1", "BLOCK", { title: "Core", options: ["A.1"], overlay: true }),
  item("majorA/2", "CHOICE", { title: "Track" }),
  item("majorA/2.1", "GROUP", { parent: "majorA/2", title: "Theory" }),
  item("majorA/2.1.1", "BLOCK", { parent: "majorA/2.1", title: "Theory subjects", options: ["T.1", "T.2"] }),
  item("majorA/2.2", "GROUP", { parent: "majorA/2", title: "Systems" }),
  item("majorA/2.2.1", "BLOCK", { parent: "majorA/2.2", title: "Systems subjects", options: ["S.1"] }),
  item("majorA/3", "NOTE", { title: "2 history subjects", count: 2 }),
  item("majorB/1", "BLOCK", { title: "B core", options: ["B.1", "A.1"] }),
  item("girs/1", "BLOCK", { title: "Calculus", options: ["C.1"] }),
];

async function loadCatalog() {
  const path = join(dir, "subjects.json");
  writeFileSync(path, JSON.stringify({ id: "s", source: "test", academicYear: 2026, courses: ["A.1", "T.1", "T.2", "S.1", "B.1", "C.1", "X.1"].map(course) }));
  const requirementsPath = join(dir, "requirements.json");
  writeFileSync(requirementsPath, JSON.stringify({
    id: "r", source: "test",
    lists: [
      { id: "majorB", title: "B degree", shortTitle: "B", mediumTitle: "B Major", kind: "MAJOR" },
      { id: "majorA", title: "A degree", shortTitle: "A", mediumTitle: "A Major", kind: "MAJOR" },
      { id: "girs", title: "GIRs", shortTitle: "GIRs", mediumTitle: "GIRs", kind: "GIRS" },
    ],
    items: ITEMS,
  }));
  await importCatalog(db(), { path, requirementsPath, log: () => {} });
}

type Client = ReturnType<typeof createLocalClient<BFSThisMessWire>>;
let api: Client["bfsthismess"];

async function signUp(username: string) {
  await api.register({ username, password: "pw" });
  const result = await api.logIn({ username, password: "pw" });
  if ("error" in result) throw new Error(String(result.error));
  return String(result.session);
}

async function newRoad(session: string, major: string) {
  const result = await api.newRoad({ session, name: "Road", major, startYear: 2026, startTerm: "FALL" });
  if ("error" in result) throw new Error(String(result.error));
  return String(result.road);
}

async function view(session: string, road: string) {
  const result = await api.viewRoad({ session, road, includeIAPAndSummer: false, limit: 1 });
  if ("error" in result) throw new Error(String(result.error));
  return result;
}

/** Each block of the road as "title: options", sorted (reactions list the major's and the GIRs' blocks in either order). */
async function blocks(session: string, road: string) {
  const { constraints } = await view(session, road);
  const byBlock = new Map<string, { title: string; technical: boolean; options: string[] }>();
  for (const row of constraints.blocks) {
    const b = byBlock.get(String(row.block)) ?? { title: String(row.title), technical: Boolean(row.technical), options: [] };
    b.options.push(String(row.subject));
    byBlock.set(String(row.block), b);
  }
  return [...byBlock.values()].map((b) => `${b.title}${b.technical ? "" : " (not technical)"}: ${b.options.sort().join(" ")}`).sort();
}

beforeEach(async () => {
  await loadCatalog();
  const { gateway } = (() => {
    const application = assembleApplication(db());
    return { gateway: createGateway({ application }) };
  })();
  api = createLocalClient<BFSThisMessWire>({ invoker: gateway }).bfsthismess;
});

describe("degree requirements", () => {
  test("covers: ListMajors answers the majors only, in order", async () => {
    const result = await api.listMajors({});
    expect("error" in result).toBe(false);
    if (!("error" in result)) expect(result.majors.majors.map((m) => m.list)).toEqual(["majorA", "majorB"]);
  });

  test("covers: NewRoad with a major lists its blocks and the GIRs' before answering", async () => {
    const session = await signUp("ada");
    const road = await newRoad(session, "majorA");
    expect(await blocks(session, road)).toEqual([
      "Calculus (not technical): C.1",
      "Core: A.1",
      "Theory subjects: T.1 T.2",
    ]);
    const { requirements, constraints } = await view(session, road);
    expect(requirements.title).toBe("A degree");
    expect(requirements.items.find((i) => i.item === "majorA/3")).toMatchObject({ kind: "NOTE", active: true });
    expect(requirements.girs.map((i) => i.item)).toEqual(["girs/1"]);
    expect(new Set(constraints.blocks.map((b) => b.origin))).toEqual(new Set(["majorA/1", "majorA/2.1.1", "girs/1"]));
    const groups = new Map((await new ConstrainConcept(db())._blocks({ road })).map((b) => [b.origin, b.group]));
    expect(Object.fromEntries(groups)).toEqual({ "majorA/1": "majorA/1", "majorA/2.1.1": "majorA", "girs/1": "girs/1" });
    const early = new Map((await new ConstrainConcept(db())._blocks({ road })).map((b) => [b.origin, b.early]));
    expect(Object.fromEntries(early)).toEqual({ "majorA/1": false, "majorA/2.1.1": false, "girs/1": true });
  });

  test("covers: NewRoad with the GIRs or an unknown major -> NO_SUCH_MAJOR, and no road", async () => {
    const session = await signUp("ada");
    for (const major of ["girs", "6-3"]) {
      expect(await api.newRoad({ session, name: "Road", major, startYear: 2026, startTerm: "FALL" })).toEqual({ error: "NO_SUCH_MAJOR" });
    }
  });

  test("covers: SetMajor replaces listed blocks and keeps the student's own; unknown major and viewers refused", async () => {
    const session = await signUp("ada");
    const road = await newRoad(session, "majorA");
    const own = await api.addBlock({ session, road, count: 1, technical: false });
    if ("error" in own) throw new Error(String(own.error));
    expect(await api.addOption({ session, block: own.block, subject: "X.1" })).toEqual({});

    expect(await api.setMajor({ session, road, major: "majorB" })).toEqual({});
    expect(await blocks(session, road)).toEqual([" (not technical): X.1", "B core: A.1 B.1", "Calculus (not technical): C.1"]);

    expect(await api.setMajor({ session, road, major: "nope" })).toEqual({ error: "NO_SUCH_MAJOR" });
    const bob = await signUp("bob");
    expect(await api.setMajor({ session: bob, road, major: "majorA" })).toEqual({ error: "NO_SUCH_ROAD" });
  });

  test("covers: ChooseAlternative swaps the blocks of a track; others are refused", async () => {
    const session = await signUp("ada");
    const road = await newRoad(session, "majorA");
    expect(await api.chooseAlternative({ session, road, choice: "majorA/2", alternative: "majorA/2.2" })).toEqual({});
    expect(await blocks(session, road)).toEqual(["Calculus (not technical): C.1", "Core: A.1", "Systems subjects: S.1"]);
    const { requirements } = await view(session, road);
    expect(requirements.items.find((i) => i.item === "majorA/2.2")).toMatchObject({ chosen: true, active: true });
    expect(requirements.items.find((i) => i.item === "majorA/2.1")).toMatchObject({ chosen: false, active: false });

    const bob = await signUp("bob");
    expect(await api.chooseAlternative({ session: bob, road, choice: "majorA/2", alternative: "majorA/2.1" })).toEqual({ error: "NO_SUCH_ROAD" });
  });

  test("covers: a plan for a new road meets the listed blocks", async () => {
    const session = await signUp("ada");
    const road = await newRoad(session, "majorA");
    const { paths } = await view(session, road);
    expect(new Set(paths.plans.map((p) => p.subject))).toEqual(new Set(["A.1", "T.1", "C.1"]));
  });

  test("covers: AddOption and AddPrior of an unknown subject are refused", async () => {
    const session = await signUp("ada");
    const road = await newRoad(session, "majorA");
    const own = await api.addBlock({ session, road, count: 1, technical: true });
    if ("error" in own) throw new Error(String(own.error));
    expect(await api.addOption({ session, block: own.block, subject: "6.O1O" })).toMatchObject({ error: "NO_LISTING" });
    expect(await api.addPrior({ session, road, subject: "6.O1O" })).toMatchObject({ error: "NO_LISTING" });
    expect(await api.addPrior({ session, road, subject: "X.1" })).toEqual({});
  });

  test("covers: RefreshRequirements relists the blocks for the owner, keeps the student's, refuses others", async () => {
    const ada = await signUp("ada");
    const road = await newRoad(ada, "majorA");
    const own = await api.addBlock({ session: ada, road, count: 1, technical: false });
    if ("error" in own) throw new Error(String(own.error));
    await api.addOption({ session: ada, block: own.block, subject: "X.1" });
    const before = await blocks(ada, road);
    expect(await api.refreshRequirements({ session: ada, road })).toEqual({});
    expect(await blocks(ada, road)).toEqual(before);

    const bob = await signUp("bob");
    expect(await api.refreshRequirements({ session: bob, road })).toEqual({ error: "NO_SUCH_ROAD" });
    expect(await api.refreshRequirements({ session: "nope", road })).toEqual({ error: "NO_SUCH_SESSION" });
  });

  test("covers: DeleteRoad forgets the road's choices", async () => {
    const session = await signUp("ada");
    const road = await newRoad(session, "majorA");
    await api.chooseAlternative({ session, road, choice: "majorA/2", alternative: "majorA/2.2" });
    expect(await api.deleteRoad({ session, road })).toEqual({});
    const selections = await db().collection("requirements.selections").countDocuments({ road });
    expect(selections).toBe(0);
  });
});
