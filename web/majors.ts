// The majors a road can have, loaded once and shared by every view. A road stores its major
// as a list id (e.g. "major6-3"); majorLabel turns it into what students call it ("6-3").
import { ref } from "vue";
import { call, type Major } from "./api.ts";

export const majors = ref<Major[]>([]);
let loading: Promise<void> | null = null;

export function loadMajors(): Promise<void> {
  loading ??= call("listMajors", {})
    .then((d) => {
      majors.value = d.majors.majors;
    })
    .catch((e) => {
      loading = null; // try again next time
      throw e;
    });
  return loading;
}

/** "6-3 — Computer Science and Engineering", or the id itself for a major that is not listed (an old road). */
export function majorLabel(id: string, long = false): string {
  const m = majors.value.find((m) => m.list === id);
  if (!m) return id;
  return long ? `${m.shortTitle} — ${m.title.replace(/^Bachelor of Science in /, "")}` : m.shortTitle;
}

export const isListedMajor = (id: string) => majors.value.some((m) => m.list === id);
