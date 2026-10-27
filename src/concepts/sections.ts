// Picking one section for each part of a semester's classes, with as few conflicts as
// possible (pick in design/concepts/TimeBudget.md). Pure: TimeBudget gives it the parts
// and the blocked slots of the week, and keeps the answer until either changes.

export type Meeting = { day: number; start: number; slots: number };

/** One part of one class (its lecture, say) and the sections to pick from, numbered from 1. */
export type PartToPick = {
  subject: string;
  kind: string;
  sections: { room: string; meetings: Meeting[] }[];
  /** The section picked by hand, if any: it is kept as it is. */
  chosen?: number;
};

/** Who holds each of the week's 672 slots: a block's id and category, or nothing. */
export type BlockedSlots = ({ block: string; category: string } | undefined)[];

export type Conflict = {
  subject: string;
  kind: string;
  meeting: Meeting;
  withBlock: boolean;
  /** The block's category, or the other class's subject. */
  with: string;
};

export type Pick = { sections: number[]; conflicts: Conflict[]; steps: number; complete: boolean };

export const MAX_STEPS = 20000;
const SLOTS_PER_DAY = 96;

const overlaps = (a: Meeting, b: Meeting) => a.day === b.day && a.start < b.start + b.slots && b.start < a.start + a.slots;

/** The distinct blocks a meeting overlaps, with their categories. */
function blocksUnder(m: Meeting, blocked: BlockedSlots) {
  const found = new Map<string, string>();
  for (let s = m.start; s < m.start + m.slots; s++) {
    const b = blocked[m.day * SLOTS_PER_DAY + s];
    if (b) found.set(b.block, b.category);
  }
  return [...found.values()];
}

/**
 * One section per part, as indexes from 1, with the conflicts they leave. Parts picked
 * by hand keep their section. The others are searched from the part with the fewest
 * sections (then by subject and kind), each part's sections in order, dropping a partial
 * pick as soon as it has as many conflicts as the best so far, and stopping at none or
 * after MAX_STEPS steps.
 */
export function pickSections(parts: PartToPick[], blocked: BlockedSlots, maxSteps = MAX_STEPS): Pick {
  // What each section of each part costs on its own: the blocks its meetings overlap.
  const own = parts.map((p) => p.sections.map((s) => s.meetings.reduce((n, m) => n + blocksUnder(m, blocked).length, 0)));
  const clash = (a: number, ia: number, b: number, ib: number) => {
    if (parts[a]!.subject === parts[b]!.subject && parts[a]!.kind === parts[b]!.kind) return 0;
    let n = 0;
    for (const m of parts[a]!.sections[ia]!.meetings) for (const o of parts[b]!.sections[ib]!.meetings) if (overlaps(m, o)) n++;
    return n;
  };

  const fixed = parts.map((p, i) => (p.chosen && p.sections[p.chosen - 1] ? i : -1)).filter((i) => i >= 0);
  const free = parts
    .map((_, i) => i)
    .filter((i) => !fixed.includes(i) && parts[i]!.sections.length > 0)
    .sort((a, b) =>
      parts[a]!.sections.length - parts[b]!.sections.length ||
      parts[a]!.subject.localeCompare(parts[b]!.subject) || parts[a]!.kind.localeCompare(parts[b]!.kind));

  const pick = parts.map(() => 0); // index into sections, from 0
  let base = 0;
  for (const [n, i] of fixed.entries()) {
    pick[i] = parts[i]!.chosen! - 1;
    base += own[i]![pick[i]!]!;
    for (const j of fixed.slice(0, n)) base += clash(i, pick[i]!, j, pick[j]!);
  }

  let best = Infinity;
  let bestPick = [...pick];
  let steps = 0;
  let stopped = false;
  const placed: number[] = [...fixed];

  function search(depth: number, cost: number) {
    if (cost >= best || stopped) return;
    if (depth === free.length) {
      best = cost;
      bestPick = [...pick];
      return;
    }
    const i = free[depth]!;
    for (let s = 0; s < parts[i]!.sections.length; s++) {
      if (++steps > maxSteps) {
        stopped = true;
        return;
      }
      let c = cost + own[i]![s]!;
      for (const j of placed) c += clash(i, s, j, pick[j]!);
      if (c >= best) continue;
      pick[i] = s;
      placed.push(i);
      search(depth + 1, c);
      placed.pop();
      if (best === 0 || stopped) return;
    }
  }
  search(0, base);
  // With the steps used up before any whole pick, take each part's first section.
  if (best === Infinity) bestPick = parts.map((p, i) => (fixed.includes(i) ? p.chosen! - 1 : 0));

  return { sections: bestPick.map((s) => s + 1), conflicts: conflictsOf(parts, bestPick, blocked), steps, complete: !stopped };
}

/** The conflicts of a pick (indexes from 0): each meeting with each block it overlaps, and each overlapping pair. */
function conflictsOf(parts: PartToPick[], pick: number[], blocked: BlockedSlots): Conflict[] {
  const out: Conflict[] = [];
  const meetings = parts.flatMap((p, i) => (p.sections[pick[i]!]?.meetings ?? []).map((m) => ({ p, m })));
  for (const { p, m } of meetings) {
    for (const category of blocksUnder(m, blocked)) out.push({ subject: p.subject, kind: p.kind, meeting: m, withBlock: true, with: category });
  }
  for (let a = 0; a < meetings.length; a++) {
    for (let b = a + 1; b < meetings.length; b++) {
      const x = meetings[a]!;
      const y = meetings[b]!;
      if (x.p.subject === y.p.subject && x.p.kind === y.p.kind) continue;
      if (overlaps(x.m, y.m)) {
        out.push({ subject: x.p.subject, kind: x.p.kind, meeting: x.m, withBlock: false, with: y.p.subject });
      }
    }
  }
  return out.sort((a, b) => a.meeting.day - b.meeting.day || a.meeting.start - b.meeting.start);
}
