// Turns Fireroad's requirement lists (https://fireroad.mit.edu/requirements/, from
// sipb/fireroad-server's .reql files) into a requirements snapshot for Requirements.load.
// Pure: scripts/build-catalog.ts does the fetching and writing.
//
// A list is a tree of all/any groups with thresholds. Constrain only understands blocks
// ("at least count of these options"), so the tree is flattened (see the table in the
// Requirements design): an "any" over subjects is a block, a choice between groups (a
// track) is a CHOICE the student makes, and what blocks cannot say is a NOTE that is
// shown but not planned.

import type { RequirementItem, RequirementList, RequirementsSnapshot } from "../concepts/Requirements.ts";
import type { CatalogIndex } from "./fireroad.ts";

export const REQUIREMENTS_URL = "https://fireroad.mit.edu/requirements/";

/** A node of a Fireroad requirement list. */
export type FireroadRequirement = {
  title?: string;
  "short-title"?: string;
  "medium-title"?: string;
  "title-no-degree"?: string;
  "list-id"?: string;
  req?: string;
  reqs?: FireroadRequirement[];
  "connection-type"?: "all" | "any";
  threshold?: { cutoff: number; criterion: "subjects" | "units"; type: "GTE" | "GT" | "LTE" | "LT" };
  "distinct-threshold"?: { cutoff: number; criterion: string; type: string };
  "plain-string"?: boolean;
  "threshold-desc"?: string;
};

/**
 * A block with more options than this is shown as a note instead of being planned: the
 * planner considers every option of every block, and groups like HASS (about 1,400
 * subjects) would swamp it.
 */
export const BROAD = 100;

export type RequirementsStats = Record<string, { blocks: number; choices: number; notes: number; approximate: number; broad: number }>;

// ───────────── Flattening ─────────────

// The tree before keys are given out. GROUP holds pieces: a heading, or an alternative of a CHOICE.
type Piece =
  | { kind: "BLOCK"; title: string; count: number; options: string[]; approximate: boolean }
  | { kind: "NOTE"; title: string; count: number; options: string[]; approximate: boolean }
  | { kind: "CHOICE"; title: string; count: number; children: Piece[] }
  | { kind: "GROUP"; title: string; children: Piece[] };

const cutoffOf = (node: FireroadRequirement) => {
  const t = node.threshold;
  if (!t) return null;
  if (t.criterion === "units") return { count: Math.ceil(t.cutoff / 12), units: true };
  if (t.type === "GT") return { count: t.cutoff + 1, units: false };
  if (t.type === "GTE") return { count: t.cutoff, units: false };
  return null; // "at most": not a requirement to take something
};

const isUpperBound = (node: FireroadRequirement) => node.threshold?.type === "LTE" || node.threshold?.type === "LT";

export class Flattener {
  constructor(private readonly index: CatalogIndex) {}

  /** The subjects a leaf stands for, or null if it is free text. */
  leafOptions(node: FireroadRequirement): string[] | null {
    if (!node.req || node["plain-string"]) return null;
    const attribute = this.index.attribute(node.req);
    if (attribute) return attribute;
    const id = this.index.canonical(node.req);
    return this.index.known.has(id) ? this.index.withJoint([id]) : [];
  }

  // A small "all" of subjects inside an "any" (e.g. 6.C01 together with 6.C011).
  private isPair(node: FireroadRequirement) {
    return (
      (node["connection-type"] ?? "all") === "all" && !node.title && !node.threshold && !!node.reqs &&
      node.reqs.length <= 3 && node.reqs.every((r) => this.leafOptions(r) !== null && !r.reqs)
    );
  }

  private isLeaf(node: FireroadRequirement) {
    return !node.reqs && this.leafOptions(node) !== null;
  }

  /** Every subject under a node, and whether collecting them threw structure away. */
  private union(node: FireroadRequirement): { options: string[]; lossy: boolean } {
    const leaf = this.leafOptions(node);
    if (leaf) return { options: leaf, lossy: !!node.threshold };
    if (!node.reqs) return { options: [], lossy: true };
    const parts = node.reqs.map((r) => this.union(r));
    const nested = node.reqs.some((r) => r.reqs || r.threshold);
    return { options: [...new Set(parts.flatMap((p) => p.options))], lossy: nested || parts.some((p) => p.lossy) };
  }

  private block(title: string, count: number, options: string[], approximate: boolean): Piece {
    // An optional item (count 0) only counts toward its parent's threshold; alone it asks for nothing.
    if (count === 0) return { kind: "NOTE", title: `${title} (optional)`, count, options, approximate };
    if (options.length === 0) return { kind: "NOTE", title, count, options, approximate };
    if (options.length > BROAD) return { kind: "NOTE", title: `${count} subject${count === 1 ? "" : "s"}: ${title}`, count, options, approximate };
    return { kind: "BLOCK", title, count: Math.min(count, options.length), options, approximate: approximate || count > options.length };
  }

  /** The number of subjects a piece asks for, counting a choice by its first alternatives. */
  private size(piece: Piece): number {
    switch (piece.kind) {
      case "BLOCK":
      case "NOTE":
        return piece.count;
      case "GROUP":
        return piece.children.reduce((n, c) => n + this.size(c), 0);
      case "CHOICE":
        return piece.children.slice(0, piece.count).reduce((n, c) => n + this.size(c), 0);
    }
  }

  /** A short name for an untitled node, from what it asks for (e.g. "6.100A or 6.100L"). */
  describe(node: FireroadRequirement): string {
    if (node.title) return node.title;
    if (node.req) return node.req;
    const parts = (node.reqs ?? []).map((r) => this.describe(r));
    const joined = parts.join((node["connection-type"] ?? "all") === "any" ? " or " : ", ");
    return parts.length <= 4 && joined.length <= 60 ? joined : `${node["threshold-desc"] ?? "Select"} of ${parts.length}`;
  }

  convert(node: FireroadRequirement, fallbackTitle = ""): Piece {
    const title = node.title ?? (fallbackTitle || this.describe(node));
    if (isUpperBound(node)) return { kind: "NOTE", title: node["threshold-desc"] ? `${title} (${node["threshold-desc"]})` : title, count: 0, options: [], approximate: true };

    // A leaf: one subject, or an attribute such as GIR:CAL1, possibly with a count ("8 HASS subjects").
    if (!node.reqs) {
      const options = this.leafOptions(node);
      const cutoff = cutoffOf(node);
      const count = cutoff?.count ?? 1;
      if (options === null) return { kind: "NOTE", title: node.req ?? title, count, options: [], approximate: false };
      return this.block(title || node.req!, count, options, !!cutoff?.units);
    }

    const children = node.reqs;
    const cutoff = cutoffOf(node);
    const connection = node["connection-type"] ?? "all";
    const distinct = node["distinct-threshold"];

    // "Select any 2 from at least 1 category": the student picks the categories.
    if (distinct) {
      return {
        kind: "CHOICE",
        title,
        count: Math.max(1, distinct.cutoff),
        children: children.map((c, i) => this.alternative(c, `${title} ${i + 1}`)),
      };
    }

    if (connection === "any") {
      const count = cutoff?.count ?? 1;
      // Over subjects (and small pairs of subjects): one block.
      if (children.every((c) => this.isLeaf(c) || this.isPair(c))) {
        const { options, lossy } = this.union(node);
        return this.block(title, count, options, lossy || !!cutoff?.units || children.some((c) => this.isPair(c)));
      }
      // Pick one of several groups, such as a track.
      if (count === 1 && !cutoff?.units) {
        return { kind: "CHOICE", title, count: 1, children: children.map((c, i) => this.alternative(c, `${title || "Option"} ${i + 1}`)) };
      }
      // Several subjects from anywhere among groups: their union.
      const { options } = this.union(node);
      return this.block(title, count, options, true);
    }

    // "all": every child, unless a threshold asks for a different number of subjects than
    // they add up to, or some children are optional and only count toward it.
    const pieces = children.map((c) => this.convert(c));
    const optional = children.some((c) => c.threshold?.cutoff === 0);
    if (cutoff && (cutoff.units || optional || cutoff.count !== pieces.reduce((n, p) => n + this.size(p), 0))) {
      const { options, lossy } = this.union(node);
      return this.block(title, cutoff.count, options, lossy || cutoff.units);
    }
    return { kind: "GROUP", title, children: pieces };
  }

  private alternative(node: FireroadRequirement, fallbackTitle: string): Piece {
    let piece = this.convert(node, fallbackTitle);
    // Taking an optional category means taking at least one subject from it.
    if (piece.kind === "NOTE" && piece.count === 0 && piece.options.length > 0) {
      piece = this.block(node.title ?? node.req ?? fallbackTitle, 1, piece.options, piece.approximate);
    }
    return piece.kind === "GROUP" ? piece : { kind: "GROUP", title: node.title ?? fallbackTitle, children: [piece] };
  }
}

// ───────────── Snapshot ─────────────

/** The lists a road can use: majors, and the GIRs. Minors and graduate degrees are left out. */
export function isPlannedList(id: string) {
  return id === "girs" || id.startsWith("major");
}

export function fromFireroadRequirements(
  lists: Record<string, FireroadRequirement>,
  index: CatalogIndex,
  { id }: { id: string },
): { snapshot: RequirementsSnapshot; stats: RequirementsStats } {
  const flattener = new Flattener(index);
  const outLists: RequirementList[] = [];
  const items: RequirementItem[] = [];
  const stats: RequirementsStats = {};

  for (const [listId, root] of Object.entries(lists).sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }))) {
    const kind = listId === "girs" ? "GIRS" : "MAJOR";
    outLists.push({
      id: listId,
      title: root.title ?? listId,
      shortTitle: root["short-title"] ?? root["medium-title"] ?? listId,
      mediumTitle: root["medium-title"] ?? root["short-title"] ?? listId,
      kind,
    });
    const s = (stats[listId] = { blocks: 0, choices: 0, notes: 0, approximate: 0, broad: 0 });
    let order = 0;

    const emit = (piece: Piece, key: string, parent: string | null) => {
      const base = { key, list: listId, parent, title: piece.title, order: order++, technical: kind === "MAJOR" };
      if (piece.kind === "BLOCK" || piece.kind === "NOTE") {
        items.push({ ...base, kind: piece.kind, count: piece.count, options: piece.options, approximate: piece.approximate });
        if (piece.kind === "BLOCK") s.blocks++;
        else if (piece.options.length > BROAD) s.broad++;
        else s.notes++;
        if (piece.approximate) s.approximate++;
        return;
      }
      items.push({ ...base, kind: piece.kind, count: piece.kind === "CHOICE" ? piece.count : 0, options: [], approximate: false });
      if (piece.kind === "CHOICE") s.choices++;
      piece.children.forEach((child, i) => emit(child, `${key}.${i + 1}`, key));
    };

    // The root's own requirements become the top level of the list.
    (root.reqs ?? []).forEach((node, i) => emit(flattener.convert(node), `${listId}/${i + 1}`, null));
  }

  return { snapshot: { id, source: REQUIREMENTS_URL, lists: outLists, items }, stats };
}
