export const SEMESTERS = 8;
export const MAX_PATHS = 10;

// One pastel color per department, like CourseRoad.
export function color(course: string): string {
  let h = 0;
  for (const ch of course.split(".")[0] ?? "") h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 60% 85%)`;
}

// MIT units look like "3-0-9" (= 12).
export function unitSum(u: unknown): number | null {
  if (!u) return null;
  const parts = String(u).split("-").map(Number);
  return parts.every((n) => !isNaN(n)) ? parts.reduce((a, b) => a + b, 0) : null;
}
