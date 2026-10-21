// Turns Fireroad's catalog (https://fireroad.mit.edu/courses/all?full=true, parsed by
// sipb/fireroad-server from the MIT Subject Listing) into a catalog snapshot for
// CourseOffering.load. Pure: scripts/build-catalog.ts does the fetching and writing.

import type { Snapshot, SnapshotCourse, SnapshotDependency } from "../concepts/CourseOffering.ts";

/** The fields of a Fireroad course that the snapshot uses. */
export type FireroadCourse = {
  subject_id: string;
  title: string;
  description?: string;
  instructors?: string[];
  level?: string;
  offered_fall?: boolean;
  offered_IAP?: boolean;
  offered_spring?: boolean;
  offered_summer?: boolean;
  not_offered_year?: string;
  is_historical?: boolean;
  total_units?: number;
  lecture_units?: number;
  lab_units?: number;
  design_units?: number;
  preparation_units?: number;
  is_variable_units?: boolean;
  prerequisites?: string;
  corequisites?: string;
  schedule?: string;
  rating?: number;
  gir_attribute?: string;
  hass_attribute?: string;
  communication_requirement?: string;
  joint_subjects?: string[];
  old_id?: string;
};

export const FIREROAD_URL = "https://fireroad.mit.edu/courses/all?full=true";

/** What was left out while building a snapshot, so the build can report it. */
export type BuildStats = {
  /** Groups dropped because they can be met without a subject, e.g. ''permission of instructor''. */
  freeTextGroups: number;
  /** Options dropped because the subject is not in the catalog. */
  unknownSubjects: number;
  /** Requirement strings that could not be parsed, and so add no dependency. */
  unparsed: string[];
  /** Requirements whose CNF was too large and so were left out. */
  tooLarge: string[];
};

// ───────────── Requirement strings ─────────────
//
// Fireroad writes requirements with "," for and, "/" for or, parentheses for grouping,
// GIR:XXX for a General Institute Requirement and ''...'' for free text, e.g.
//   "GIR:CAL1, ((6.100A, 6.100B)/(6.100L, 16.C20))"   "18.03/''permission of instructor''"

export type Requirement =
  | { kind: "subject"; id: string }
  | { kind: "gir"; attribute: string }
  | { kind: "text"; text: string }
  | { kind: "and" | "or"; parts: Requirement[] };

/** Parses a requirement string; throws if it is not well formed. */
export function parseRequirement(source: string): Requirement {
  const tokens = tokenize(source);
  let i = 0;
  const peek = () => tokens[i];

  // expr := term ("," term)*   term := atom ("/" atom)*   atom := "(" expr ")" | word | text
  function expr(): Requirement {
    const parts = [term()];
    while (peek() === ",") {
      i++;
      parts.push(term());
    }
    return parts.length === 1 ? parts[0]! : { kind: "and", parts };
  }
  function term(): Requirement {
    const parts = [atom()];
    while (peek() === "/") {
      i++;
      parts.push(atom());
    }
    return parts.length === 1 ? parts[0]! : { kind: "or", parts };
  }
  function atom(): Requirement {
    const token = tokens[i++];
    if (token === "(") {
      const inner = expr();
      if (tokens[i++] !== ")") throw new Error(`expected ")" in ${source}`);
      return inner;
    }
    if (token === undefined || token === ")" || token === "," || token === "/") {
      throw new Error(`unexpected ${token ?? "end"} in ${source}`);
    }
    if (token.startsWith("''")) return { kind: "text", text: token.slice(2, -2) };
    if (token.startsWith("GIR:")) return { kind: "gir", attribute: token.slice(4) };
    return { kind: "subject", id: token };
  }

  const result = expr();
  if (i !== tokens.length) throw new Error(`unexpected ${tokens[i]} in ${source}`);
  return result;
}

// A subject ID such as 6.1210, 21G.308 or CMS.586, or a GIR such as GIR:CAL1.
const SUBJECT_ID = /^([A-Z0-9]{1,4}\.[A-Z0-9]{1,5}|GIR:[A-Z0-9]+)$/i;

function tokenize(source: string): string[] {
  const tokens: string[] = [];
  let words: string[] = [];
  // Plain words between operators are one token: a subject ID if it is a single ID,
  // "and"/"or" as an operator, and anything else free text (e.g. permission of instructor).
  const flush = () => {
    if (words.length === 1 && SUBJECT_ID.test(words[0]!)) tokens.push(words[0]!);
    else if (words.length === 1 && /^and$/i.test(words[0]!)) tokens.push(",");
    else if (words.length === 1 && /^or$/i.test(words[0]!)) tokens.push("/");
    else if (words.length > 0) tokens.push(`''${words.join(" ")}''`);
    words = [];
  };
  let i = 0;
  while (i < source.length) {
    const c = source[i]!;
    if (/\s/.test(c)) {
      i++;
    } else if ("(),/".includes(c)) {
      flush();
      tokens.push(c);
      i++;
    } else if (source.startsWith("''", i)) {
      flush();
      const end = source.indexOf("''", i + 2);
      if (end < 0) throw new Error(`unclosed '' in ${source}`);
      tokens.push(source.slice(i, end + 2));
      i = end + 2;
    } else {
      const match = /^[^\s(),/]+/.exec(source.slice(i))!;
      const word = match[0];
      // "AND"/"OR" between two subjects is an operator, not part of a phrase.
      if (/^(and|or)$/i.test(word) && words.length === 1 && SUBJECT_ID.test(words[0]!)) {
        flush();
        tokens.push(/^and$/i.test(word) ? "," : "/");
      } else {
        words.push(word);
      }
      i += word.length;
    }
  }
  flush();
  return tokens;
}

// A literal of the CNF: a subject, or null for a group that can be met without one.
type Clause = Set<string | null>;

const MAX_CLAUSES = 64;

/**
 * Converts a requirement to conjunctive normal form: a list of "or" groups that must all
 * be met. This is exact, since requirements only combine subjects with and/or.
 * gir expands a GIR attribute to the subjects that satisfy it.
 */
export function toClauses(req: Requirement, gir: (attribute: string) => string[]): Clause[] {
  switch (req.kind) {
    case "subject":
      return [new Set([req.id])];
    case "gir": {
      const options = gir(req.attribute);
      // An unknown GIR is treated like free text: it cannot be checked, so it does not block.
      return [options.length > 0 ? new Set(options) : new Set([null])];
    }
    case "text":
      return [new Set([null])];
    case "and":
      return simplify(req.parts.flatMap((p) => toClauses(p, gir)));
    case "or": {
      // (a1 ∧ a2) ∨ (b1 ∧ b2) = (a1 ∨ b1) ∧ (a1 ∨ b2) ∧ (a2 ∨ b1) ∧ (a2 ∨ b2)
      let product: Clause[] = [new Set()];
      for (const part of req.parts) {
        const clauses = toClauses(part, gir);
        const next: Clause[] = [];
        for (const left of product) for (const right of clauses) next.push(new Set([...left, ...right]));
        product = simplify(next);
        if (product.length > MAX_CLAUSES) throw new TooLarge();
      }
      return product;
    }
  }
}

class TooLarge extends Error {}

// Drops duplicate clauses and clauses implied by a smaller one (a ∧ (a ∨ b) = a).
function simplify(clauses: Clause[]): Clause[] {
  const sorted = [...clauses].sort((a, b) => a.size - b.size);
  const kept: Clause[] = [];
  for (const clause of sorted) {
    if (!kept.some((k) => [...k].every((x) => clause.has(x)))) kept.push(clause);
  }
  return kept;
}

/**
 * The dependencies of a requirement string. A group that can be met without a subject
 * (free text such as ''permission of instructor'') is dropped, as are options that are not
 * in the catalog; a group left with no options is dropped too.
 */
export function dependenciesOf(source: string | undefined, index: CatalogIndex, stats: BuildStats): SnapshotDependency[] {
  if (!source?.trim()) return [];
  let clauses: Clause[];
  try {
    clauses = toClauses(parseRequirement(source), (attribute) => index.attribute(`GIR:${attribute}`) ?? []);
  } catch (e) {
    (e instanceof TooLarge ? stats.tooLarge : stats.unparsed).push(source);
    return [];
  }
  const dependencies: SnapshotDependency[] = [];
  for (const clause of clauses) {
    if (clause.has(null)) {
      stats.freeTextGroups++;
      continue;
    }
    const options: string[] = [];
    for (const id of clause as Set<string>) {
      const current = index.canonical(id);
      if (index.known.has(current)) options.push(current);
      else stats.unknownSubjects++;
    }
    if (options.length > 0) dependencies.push({ count: 1, options: index.withJoint(options) });
  }
  return dependencies;
}

// ───────────── Catalog index ─────────────

/** Lookups over Fireroad's courses that the catalog and the requirements both need. */
export type CatalogIndex = {
  /** Every subject, one record each, in subject order. */
  courses: FireroadCourse[];
  known: Set<string>;
  /** The current number of a subject, given an old one (6.006 -> 6.1210), or the id itself. */
  canonical(id: string): string;
  /** The options together with their joint subjects (one class listed under two numbers), without repeats. */
  withJoint(options: string[]): string[];
  /** The current subjects that carry an attribute (GIR:CAL1, HASS-A, CI-H, ...), or null if it is not one. */
  attribute(token: string): string[] | null;
};

export function indexCatalog(raw: FireroadCourse[]): CatalogIndex {
  // The first record of a subject wins if Fireroad repeats one.
  const courses = [...new Map(raw.toReversed().map((c) => [c.subject_id, c])).values()].sort((a, b) =>
    a.subject_id.localeCompare(b.subject_id, "en", { numeric: true }),
  );
  const known = new Set(courses.map((c) => c.subject_id));
  const renamed = new Map<string, string>();
  for (const c of courses) if (c.old_id && !known.has(c.old_id)) renamed.set(c.old_id, c.subject_id);
  const joint = new Map(courses.map((c) => [c.subject_id, (c.joint_subjects ?? []).filter((j) => known.has(j))]));

  const byAttribute = new Map<string, string[]>();
  const add = (key: string, subject: string) => byAttribute.set(key, [...(byAttribute.get(key) ?? []), subject]);
  for (const c of courses) {
    if (c.is_historical) continue;
    // GIR:LAB is met by LAB and by LAB2 (half a lab) subjects; the others match exactly.
    if (c.gir_attribute) for (const key of new Set([c.gir_attribute, c.gir_attribute.replace(/2$/, "")])) add(`GIR:${key}`, c.subject_id);
    if (c.hass_attribute) {
      add("HASS", c.subject_id);
      for (const h of c.hass_attribute.split(",")) add(h.trim(), c.subject_id);
    }
    if (c.communication_requirement) add(c.communication_requirement, c.subject_id);
  }

  return {
    courses,
    known,
    canonical: (id) => renamed.get(id) ?? id,
    withJoint: (options) => [...new Set(options.flatMap((o) => [o, ...(joint.get(o) ?? [])]))],
    attribute: (token) => byAttribute.get(token) ?? (/^(GIR:|HASS|CI-)/.test(token) ? [] : null),
  };
}

// ───────────── Other attributes ─────────────

/** The offering of a subject, relative to the academic year starting in FALL of academicYear. */
export function offeringOf(course: FireroadCourse, academicYear: number): SnapshotCourse["offering"] {
  if (course.is_historical) return "Not currently listed";
  if (course.not_offered_year === `${academicYear}-${academicYear + 1}`) return "Not offered THIS year";
  if (course.not_offered_year === `${academicYear + 1}-${academicYear + 2}`) return "Not offered NEXT year";
  return "Offered normally";
}

/** Units as the listing writes them ("5-0-7", or "Arrange"), and their total as a number. */
export function unitsOf(course: FireroadCourse): { units: string; totalUnits: number } {
  const total = course.total_units ?? 0;
  if (course.is_variable_units || total <= 0) return { units: "Arrange", totalUnits: 12 };
  const lab = (course.lab_units ?? 0) + (course.design_units ?? 0);
  return { units: `${course.lecture_units ?? 0}-${lab}-${course.preparation_units ?? 0}`, totalUnits: total };
}

/**
 * Meeting times and location of the lecture (or else the first kind of section), from a
 * Fireroad schedule such as "Lecture,26-100/TR/0/11-12.30;Recitation,34-304/WF/0/10".
 * Each section is room/days/evening/time; an evening flag of 1 adds " PM".
 */
export function scheduleOf(schedule: string | undefined): { meetingTimes?: string; location?: string } {
  if (!schedule?.trim()) return {};
  const kinds = schedule.split(";").map((part) => {
    const [kind, ...sections] = part.split(",");
    return { kind: kind ?? "", sections: sections.map((s) => s.split("/")) };
  });
  const chosen = kinds.find((k) => k.kind === "Lecture") ?? kinds[0];
  const sections = chosen?.sections.filter((s) => s.length >= 4) ?? [];
  if (sections.length === 0) return {};
  const times = [...new Set(sections.map(([, days, evening, time]) => `${days}${time}${evening === "1" ? " PM" : ""}`))];
  const rooms = [...new Set(sections.map(([room]) => room!).filter(Boolean))];
  return { meetingTimes: times.join(", "), location: rooms.join(", ") };
}

export function evaluationUrl(subject: string) {
  return `https://sisapp.mit.edu/ose-rpt/subjectEvaluationSearch.htm?subjectCode=${encodeURIComponent(subject)}&search=Search`;
}

// ───────────── Snapshot ─────────────

/** The academic year (its FALL year) a date falls in: July to December is the fall of that year. */
export function academicYearOf(date: Date) {
  return date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
}

export function fromFireroad(
  raw: FireroadCourse[],
  { academicYear, id }: { academicYear: number; id: string },
): { snapshot: Snapshot; stats: BuildStats } {
  const stats: BuildStats = { freeTextGroups: 0, unknownSubjects: 0, unparsed: [], tooLarge: [] };
  const index = indexCatalog(raw);

  const courses = index.courses.map((c): SnapshotCourse => {
    const { units, totalUnits } = unitsOf(c);
    const description = c.description ?? "";
    const instructors = (c.instructors ?? []).map((s) => s.trim()).filter(Boolean);
    return {
      subject: c.subject_id,
      name: c.title,
      courseId: c.subject_id,
      description,
      lecturer: instructors.length > 0 ? instructors.join(", ") : "Staff",
      level: c.level === "G" ? "Graduate" : c.level === "U" ? "Undergraduate" : "",
      terms: [
        ...(c.offered_fall ? ["FALL"] : []),
        ...(c.offered_IAP ? ["IAP"] : []),
        ...(c.offered_spring ? ["SPRING"] : []),
        ...(c.offered_summer ? ["SUMMER"] : []),
      ],
      offering: offeringOf(c, academicYear),
      canBeRepeated: /repeated for credit/i.test(description),
      prerequisitesText: c.prerequisites ?? "",
      corequisitesText: c.corequisites ?? "",
      units,
      ...scheduleOf(c.schedule),
      prerequisites: dependenciesOf(c.prerequisites, index, stats),
      corequisites: dependenciesOf(c.corequisites, index, stats),
      ...(typeof c.rating === "number" ? { rating: { classRating: c.rating, url: evaluationUrl(c.subject_id) } } : {}),
      totalUnits,
    };
  });

  return { snapshot: { id, source: FIREROAD_URL, academicYear, courses }, stats };
}
