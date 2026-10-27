// Turns a Fireroad schedule string into structured meetings. Pure: no fetching, no state.
//
// Fireroad writes a subject's schedule as components separated by ";", each a kind and
// its section options separated by ",", e.g.
//   "Lecture,26-100/TR/0/11-12.30;Recitation,34-304/WF/0/10,35-310/WF/0/10"
// A section is a room followed by one or more groups of days/evening/time:
//   "26-152/MW/0/9-10.30/F/0/9"   MW 9–10:30 and F 9–10, one section
//   "E52-432/R/1/4.30-7 PM"       an evening flag of 1, with the time in the evening
//   "TBA"                         the time is arranged: no placement possible
// Times follow the MIT listing: without PM, 8 to 12 are before or at noon and 1 to 7 are
// afternoon hours; a single time lasts an hour.

export type Kind = "lecture" | "recitation" | "lab" | "design";

/** A meeting on one day, in minutes from midnight. Day 0 is Monday. */
export type Meeting = { day: number; start: number; end: number };

/** One section option: the meetings a student who picks it attends every week. */
export type Section = { room: string; meetings: Meeting[] };

/**
 * One component, such as the lecture: the student attends one of its sections. A
 * component whose time is arranged (TBA) has no sections and counts as arranged.
 */
export type Component = { kind: Kind; sections: Section[]; arranged: boolean };

export type ParsedSchedule = {
  components: Component[];
  /** Parts of the string that could not be read, kept so a build can report them. */
  problems: string[];
};

const KINDS: Record<string, Kind> = {
  lecture: "lecture", lectures: "lecture", lec: "lecture",
  recitation: "recitation", recitations: "recitation", recit: "recitation", rec: "recitation",
  lab: "lab", labs: "lab", laboratory: "lab",
  design: "design",
};
const DAYS: Record<string, number> = { M: 0, T: 1, W: 2, R: 3, F: 4, S: 5 };

/**
 * Minutes from midnight of a listing time such as "9", "9.30" or "12". In the evening
 * (pm), every hour before 12 is after noon; otherwise only 1 to 7 are.
 */
function minutesOf(text: string, pm: boolean): number | null {
  const m = text.match(/^(\d{1,2})(?:[.:](\d{2}))?$/);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2] ?? 0);
  if (hour < 1 || hour > 12 || minute >= 60) return null;
  if (pm ? hour < 12 : hour < 8) hour += 12;
  return hour * 60 + minute;
}

/** A time or range such as "10", "11-12.30" or "7-9 PM", as start and end minutes. */
export function parseTime(text: string, evening: boolean): { start: number; end: number } | null {
  const trimmed = text.trim();
  const pm = evening || / ?PM$/i.test(trimmed);
  const body = trimmed.replace(/ ?[AP]M$/i, "");
  const [from, to, ...rest] = body.split("-");
  if (from === undefined || rest.length > 0) return null;
  const start = minutesOf(from, pm);
  if (start === null) return null;
  if (to === undefined) return { start, end: start + 60 };
  let end = minutesOf(to, pm);
  if (end === null) return null;
  // "11-1" ends after noon even though 1 alone could be read either way.
  while (end <= start) end += 12 * 60;
  if (end - start > 12 * 60) return null;
  return { start, end };
}

/** Days such as "MWF" or "TR"; null if a letter is not a day. */
function parseDays(text: string): number[] | null {
  if (!text) return null;
  const days = [...text].map((c) => DAYS[c]);
  return days.every((d) => d !== undefined) ? [...new Set(days as number[])].sort() : null;
}

function parseSection(text: string, problems: string[]): Section | null {
  const fields = text.split("/");
  const room = fields[0]?.trim() ?? "";
  const groups = fields.slice(1);
  if (groups.length === 0 || groups.length % 3 !== 0) {
    problems.push(text);
    return null;
  }
  const meetings: Meeting[] = [];
  for (let i = 0; i < groups.length; i += 3) {
    const days = parseDays(groups[i]!.trim());
    const time = parseTime(groups[i + 2]!, groups[i + 1]!.trim() === "1");
    if (!days || !time) {
      problems.push(text);
      return null;
    }
    for (const day of days) meetings.push({ day, ...time });
  }
  meetings.sort((a, b) => a.day - b.day || a.start - b.start);
  return { room, meetings };
}

/** Same meetings, ignoring the room, so the same time in two rooms is one choice. */
const sameTimes = (a: Section, b: Section) =>
  a.meetings.length === b.meetings.length &&
  a.meetings.every((m, i) => m.day === b.meetings[i]!.day && m.start === b.meetings[i]!.start && m.end === b.meetings[i]!.end);

export function parseSchedule(schedule: string | undefined | null): ParsedSchedule {
  const problems: string[] = [];
  const byKind = new Map<Kind, Component>();
  for (const part of (schedule ?? "").split(";")) {
    if (!part.trim()) continue;
    const [rawKind = "", ...rawSections] = part.split(",");
    const kind = KINDS[rawKind.trim().toLowerCase()];
    const sections = rawSections.map((s) => s.trim()).filter(Boolean);
    if (!kind) {
      // Free text in the kind's place (e.g. "wed," or "Fridays,") with nothing after it.
      problems.push(part);
      continue;
    }
    const component = byKind.get(kind) ?? { kind, sections: [], arranged: false };
    byKind.set(kind, component);
    if (sections.length === 0) {
      problems.push(part);
      continue;
    }
    for (const text of sections) {
      if (/^(TBA|TBD|arranged)$/i.test(text)) {
        component.arranged = true;
        continue;
      }
      const section = parseSection(text, problems);
      if (section && !component.sections.some((s) => sameTimes(s, section))) component.sections.push(section);
    }
  }
  // A component with neither a time nor TBA was unreadable; one with both keeps its times.
  const components = [...byKind.values()]
    .filter((c) => c.sections.length > 0 || c.arranged)
    .map((c) => (c.sections.length > 0 ? { ...c, arranged: false } : c));
  return { components, problems };
}

/** Hours a week of a section: the sum of its meetings. */
export const sectionHours = (s: Section) => s.meetings.reduce((n, m) => n + (m.end - m.start), 0) / 60;

/**
 * Hours a week in class from the schedule: for each component, its sections' most common
 * length (ties go to the shorter). null if any component is arranged or there are none,
 * since then the schedule does not say.
 */
export function scheduledHours(parsed: ParsedSchedule): number | null {
  if (parsed.components.length === 0 || parsed.components.some((c) => c.arranged)) return null;
  let total = 0;
  for (const c of parsed.components) {
    const counts = new Map<number, number>();
    for (const s of c.sections) counts.set(sectionHours(s), (counts.get(sectionHours(s)) ?? 0) + 1);
    const [typical] = [...counts.entries()].sort(([ha, na], [hb, nb]) => nb - na || ha - hb)[0]!;
    total += typical;
  }
  return total;
}
