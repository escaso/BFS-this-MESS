import { type Collection, type Db } from "mongodb";

const LIST_KINDS = ["MAJOR", "GIRS"] as const;
const ITEM_KINDS = ["BLOCK", "CHOICE", "GROUP", "NOTE"] as const;
type ListKind = (typeof LIST_KINDS)[number];
type ItemKind = (typeof ITEM_KINDS)[number];

// The format of a requirements snapshot, as written by scripts/build-catalog.ts.
export type RequirementList = { id: string; title: string; shortTitle: string; mediumTitle: string; kind: ListKind };
export type RequirementItem = {
  key: string;
  list: string;
  parent: string | null;
  kind: ItemKind;
  title: string;
  count: number;
  options: string[];
  approximate: boolean;
  technical: boolean;
  // Absent in snapshots made before it existed: false.
  overlay?: boolean;
  order: number;
};
export type RequirementsSnapshot = { id: string; source: string; lists: RequirementList[]; items: RequirementItem[] };

export class LoadFailed extends Error {
  constructor(message = "The requirements snapshot could not be parsed.") {
    super(message);
  }
}
export class NoSuchChoice extends Error {
  constructor(message = "There is no such choice.") {
    super(message);
  }
}
export class NotAnAlternative extends Error {
  constructor(message = "That is not one of the alternatives of this choice.") {
    super(message);
  }
}

const isString = (v: unknown): v is string => typeof v === "string";

function parseSnapshot(text: string): RequirementsSnapshot {
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new LoadFailed();
  }
  if (!isString(parsed?.id) || parsed.id === "" || !Array.isArray(parsed.lists) || !Array.isArray(parsed.items)) {
    throw new LoadFailed();
  }
  const lists = new Map<string, RequirementList>();
  for (const l of parsed.lists) {
    if (!["id", "title", "shortTitle", "mediumTitle"].every((k) => isString(l?.[k])) || !LIST_KINDS.includes(l.kind) || lists.has(l.id)) {
      throw new LoadFailed();
    }
    lists.set(l.id, l);
  }
  const items = new Map<string, RequirementItem>();
  for (const i of parsed.items) {
    const parent = i?.parent === null || i?.parent === undefined ? null : items.get(i.parent);
    const valid =
      isString(i?.key) && !items.has(i.key) && lists.has(i.list) && isString(i.title) &&
      ITEM_KINDS.includes(i.kind) && Number.isInteger(i.count) && Number.isFinite(i.order) &&
      Array.isArray(i.options) && i.options.every(isString) &&
      typeof i.approximate === "boolean" && typeof i.technical === "boolean" &&
      (i.overlay === undefined || typeof i.overlay === "boolean") &&
      // Parents come first, in the same list.
      (i.parent === null || i.parent === undefined || (parent !== undefined && parent!.list === i.list)) &&
      // A CHOICE holds GROUPs; anything else sits in a GROUP or at the top.
      (i.kind === "GROUP" ? !parent || parent.kind === "CHOICE" || parent.kind === "GROUP" : !parent || parent.kind === "GROUP") &&
      (parent?.kind !== "CHOICE" || i.kind === "GROUP") &&
      (i.kind === "BLOCK" || i.kind === "NOTE" || i.options.length === 0) &&
      (i.kind === "GROUP" ? i.count === 0 : i.kind === "NOTE" ? i.count >= 0 : i.count >= 1) &&
      (i.kind !== "BLOCK" || i.options.length >= i.count);
    if (!valid) throw new LoadFailed();
    items.set(i.key, { ...i, parent: i.parent ?? null, overlay: i.overlay ?? false });
  }
  return { id: parsed.id, source: parsed.source ?? "", lists: [...lists.values()], items: [...items.values()] };
}

type ItemRecord = Omit<RequirementItem, "key"> & { _id: string };

export class RequirementsConcept {
  private readonly lists: Collection<RequirementList & { _id: string }>;
  private readonly items: Collection<ItemRecord>;
  private readonly selections: Collection<{ _id: string; road: string; choice: string; alternatives: string[] }>;
  private readonly catalog: Collection<any>;
  private indexed = false;

  constructor(db: Db) {
    this.lists = db.collection("requirements.lists");
    this.items = db.collection("requirements.items");
    this.selections = db.collection("requirements.selections");
    this.catalog = db.collection("requirements.catalog");
  }

  async #index() {
    if (this.indexed) return;
    await this.items.createIndex({ list: 1, order: 1 });
    await this.selections.createIndex({ road: 1 });
    this.indexed = true;
  }

  async load({ snapshot }: { snapshot: string }) {
    const { id, lists, items } = parseSnapshot(snapshot);
    await this.#index();

    await this.lists.deleteMany({});
    if (lists.length > 0) await this.lists.insertMany(lists.map((l) => ({ _id: l.id, ...l })));
    await this.items.deleteMany({});
    if (items.length > 0) await this.items.insertMany(items.map(({ key, ...rest }) => ({ _id: key, ...rest })));

    // Drop choices that no longer exist in this form.
    const byKey = new Map(items.map((i) => [i.key, i]));
    const stale = (await this.selections.find({}).toArray()).filter(
      (s) => byKey.get(s.choice)?.kind !== "CHOICE" || s.alternatives.some((a) => byKey.get(a)?.parent !== s.choice),
    );
    if (stale.length > 0) await this.selections.deleteMany({ _id: { $in: stale.map((s) => s._id) } });

    await this.catalog.updateOne({}, { $set: { snapshot: id } }, { upsert: true });
    return { count: lists.length };
  }

  async choose({ road, choice, alternative }: { road: string; choice: string; alternative: string }) {
    const item = await this.items.findOne({ _id: choice });
    if (item?.kind !== "CHOICE") throw new NoSuchChoice();
    const children = await this.items.find({ parent: choice }).sort({ order: 1 }).toArray();
    if (!children.some((c) => c._id === alternative)) throw new NotAnAlternative();

    const _id = `${road}|${choice}`;
    const existing = await this.selections.findOne({ _id });
    let alternatives = existing?.alternatives ?? children.slice(0, item.count).map((c) => c._id);
    if (!alternatives.includes(alternative)) alternatives = [...alternatives, alternative].slice(-item.count);
    await this.selections.updateOne({ _id }, { $set: { road, choice, alternatives } }, { upsert: true });
    return {};
  }

  async copyChoices({ from, to }: { from: string; to: string }) {
    const copies = (await this.selections.find({ road: from }).toArray()).map(({ choice, alternatives }) => ({
      _id: `${to}|${choice}`, road: to, choice, alternatives,
    }));
    await this.selections.deleteMany({ road: to });
    if (copies.length) await this.selections.insertMany(copies);
    return {};
  }

  async forget({ road }: { road: string }) {
    await this.selections.deleteMany({ road });
    return {};
  }

  async _loadedSnapshot(_: Record<string, never> = {}) {
    const record = await this.catalog.findOne({});
    return record?.snapshot ? { found: true, id: record.snapshot as string } : { found: false, id: "" };
  }

  async _lists(_: Record<string, never> = {}) {
    const lists = await this.lists.find({}).toArray();
    return lists
      .sort((a, b) =>
        a.kind !== b.kind ? (a.kind === "MAJOR" ? -1 : 1) :
        a.shortTitle.localeCompare(b.shortTitle, "en", { numeric: true }) || a.id.localeCompare(b.id, "en", { numeric: true }),
      )
      .map((l) => ({ list: l.id, title: l.title, shortTitle: l.shortTitle, mediumTitle: l.mediumTitle, kind: l.kind }));
  }

  async _list({ list }: { list: string }) {
    const l = await this.lists.findOne({ _id: list });
    if (!l) return { found: false, title: "", shortTitle: "", mediumTitle: "", kind: "MAJOR" as ListKind };
    return { found: true, title: l.title, shortTitle: l.shortTitle, mediumTitle: l.mediumTitle, kind: l.kind };
  }

  // Every item of a list in order, with whether the road takes it.
  async #walk(list: string, road: string) {
    const items = await this.items.find({ list }).sort({ order: 1 }).toArray();
    const selections = new Map(
      (await this.selections.find({ road, choice: { $in: items.filter((i) => i.kind === "CHOICE").map((i) => i._id) } }).toArray())
        .map((s) => [s.choice, new Set(s.alternatives)]),
    );
    const byKey = new Map(items.map((i) => [i._id, i]));
    const childrenOf = new Map<string, string[]>();
    for (const i of items) if (i.parent) childrenOf.set(i.parent, [...(childrenOf.get(i.parent) ?? []), i._id]);

    const active = new Map<string, boolean>();
    const chosen = new Map<string, boolean>();
    const depth = new Map<string, number>();
    for (const i of items) {
      const parent = i.parent ? byKey.get(i.parent) : undefined;
      depth.set(i._id, parent ? depth.get(parent._id)! + 1 : 0);
      if (parent?.kind === "CHOICE") {
        const taken = selections.get(parent._id) ?? new Set(childrenOf.get(parent._id)!.slice(0, parent.count));
        chosen.set(i._id, taken.has(i._id));
      }
      active.set(i._id, (!parent || active.get(parent._id)!) && chosen.get(i._id) !== false);
    }
    return items.map((i) => ({ item: i, active: active.get(i._id)!, chosen: chosen.get(i._id) ?? false, depth: depth.get(i._id)! }));
  }

  async _activeBlocks({ list, road }: { list: string; road: string }) {
    const girs = (await this.lists.findOne({ _id: list }))?.kind === "GIRS";
    // group(item): the blocks of a major share one group, except overlays; each GIR is its own.
    return (await this.#walk(list, road))
      .filter((w) => w.active && w.item.kind === "BLOCK")
      .map(({ item }) => ({
        item: item._id,
        title: item.title,
        count: item.count,
        technical: item.technical,
        group: girs || item.overlay ? item._id : list,
      }));
  }

  async _options({ item }: { item: string }) {
    const record = await this.items.findOne({ _id: item }, { projection: { options: 1 } });
    return (record?.options ?? []).map((subject) => ({ subject }));
  }

  async _outline({ list, road }: { list: string; road: string }) {
    return (await this.#walk(list, road)).map(({ item, active, chosen, depth }) => ({
      item: item._id,
      parent: item.parent ?? "",
      depth,
      kind: item.kind,
      title: item.title,
      count: item.count,
      approximate: item.approximate,
      active,
      chosen,
    }));
  }
}
