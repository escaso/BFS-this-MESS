<script setup lang="ts">
// The hours a week one subject takes in one semester, in class and outside it, each
// saying where it comes from, so an estimate never looks like a fact. Where the catalog
// has no hours outside class, they are the hours in class times a study factor (2 to 3),
// which the person can change for this subject or for all of them.
import { ref, watch } from "vue";
import { call, message, type Output } from "../api.ts";
import { label, type Season } from "../util.ts";

const props = defineProps<{ course: string; season: Season }>();

type Hours = Output<"viewClassHours">["hours"];
const hours = ref<Hours | null>(null);
const usual = ref(2);
const ownFactor = ref<number | null>(null);
const error = ref("");
const busy = ref(false);

const FACTORS = [2, 2.25, 2.5, 2.75, 3];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const KIND: Record<string, string> = { LECTURE: "Lecture", RECITATION: "Recitation", LAB: "Lab", DESIGN: "Design" };

const IN_CLASS: Record<string, string> = {
  SCHEDULE: "from the class schedule",
  EVALUATIONS: "estimate from subject evaluations",
  UNITS: "estimate from lecture and lab units",
  ASSUMED: "assumed, as for a typical 12-unit subject",
};
const SCHEDULE: Record<string, string> = {
  EXACT: "",
  ESTIMATE: "The times are this year's schedule; they may change.",
  ARRANGED: "Some meetings are arranged (TBA): they count toward hours but have no time.",
  NONE: "No schedule is published for this term.",
};

async function load() {
  error.value = "";
  try {
    const [h, s] = await Promise.all([
      call("viewClassHours", { subject: props.course, year: props.season.year, term: props.season.term }),
      call("viewStudySettings", {}),
    ]);
    hours.value = h.hours;
    usual.value = s.settings.factor;
    ownFactor.value = s.settings.subjectFactors.find((f) => f.subject === props.course)?.factor ?? null;
  } catch (e) {
    error.value = message(e);
  }
}
watch(() => [props.course, props.season.year, props.season.term], load, { immediate: true });

async function change(run: () => Promise<unknown>) {
  busy.value = true;
  try {
    await run();
    await load();
  } catch (e) {
    error.value = message(e);
  } finally {
    busy.value = false;
  }
}

function setOwn(value: string) {
  return change(() => value === "usual"
    ? call("clearSubjectFactor", { subject: props.course })
    : call("setSubjectFactor", { subject: props.course, factor: Number(value) }));
}
const setUsual = (value: string) => change(() => call("setStudyFactor", { factor: Number(value) }));

const time = (slot: number) => {
  const minutes = slot * 15;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
};

/** The sections of a part, each as "Tue, Thu 11am–12:30pm · 26-100". */
function sectionsOf(kind: string) {
  const rows = hours.value?.sections.filter((s) => s.kind === kind) ?? [];
  const bySection = new Map<number, typeof rows>();
  for (const r of rows) bySection.set(r.section, [...(bySection.get(r.section) ?? []), r]);
  return [...bySection.values()].map((meetings) => {
    const times = new Map<string, string[]>();
    for (const m of meetings) {
      const t = `${time(m.start)}–${time(m.start + m.length)}`;
      times.set(t, [...(times.get(t) ?? []), DAYS[m.day]!]);
    }
    const when = [...times.entries()].map(([t, days]) => `${days.join(", ")} ${t}`).join("; ");
    return meetings[0]!.room ? `${when} · ${meetings[0]!.room}` : when;
  });
}
const kinds = () => [...new Set(hours.value?.sections.map((s) => s.kind) ?? [])];
</script>

<template>
  <section class="class-hours" :aria-label="`Time ${course} takes in ${label(season)}`">
    <h3>Time each week in {{ label(season) }}</h3>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-else-if="!hours" class="hint">Loading…</p>
    <template v-else>
      <table class="hours-table">
        <tbody>
          <tr>
            <th scope="row">In class</th>
            <td>{{ hours.inClass }} h</td>
            <td class="hint">{{ IN_CLASS[hours.inClassSource] }}</td>
          </tr>
          <tr>
            <th scope="row">Outside class</th>
            <td>{{ hours.outOfClass }} h</td>
            <td class="hint">
              <template v-if="hours.outOfClassSource === 'EVALUATIONS'">from subject evaluations</template>
              <template v-else>estimate: {{ hours.inClass }} h in class × {{ hours.factor }}</template>
            </td>
          </tr>
          <tr class="total">
            <th scope="row">Total</th>
            <td>{{ hours.total }} h</td>
            <td />
          </tr>
        </tbody>
      </table>
      <p v-if="SCHEDULE[hours.schedule]" class="hint">{{ SCHEDULE[hours.schedule] }}</p>
      <div v-for="k in kinds()" :key="k" class="sections">
        <strong>{{ KIND[k] ?? k }}</strong>
        <span class="hint"> · {{ sectionsOf(k).length === 1 ? "1 time" : `${sectionsOf(k).length} times to choose from` }}</span>
        <ul>
          <li v-for="s in sectionsOf(k)" :key="s">{{ s }}</li>
        </ul>
      </div>
      <form v-if="hours.outOfClassSource === 'FORMULA'" class="inline factor-form" @submit.prevent>
        <label>
          Study hours per class hour for {{ course }}
          <select :value="ownFactor ?? 'usual'" :disabled="busy" @change="setOwn(($event.target as HTMLSelectElement).value)">
            <option value="usual">Your usual ({{ usual }})</option>
            <option v-for="f in FACTORS" :key="f" :value="f">{{ f }}</option>
          </select>
        </label>
        <label>
          Your usual, for all subjects
          <select :value="usual" :disabled="busy" @change="setUsual(($event.target as HTMLSelectElement).value)">
            <option v-for="f in FACTORS" :key="f" :value="f">{{ f }}</option>
          </select>
        </label>
      </form>
    </template>
  </section>
</template>
