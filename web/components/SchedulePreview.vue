<script setup lang="ts">
// One Fall or Spring semester of a plan on the week: the time the road's owner has
// blocked, greyed, with the sections picked for each class over it. Conflicts are
// hatched and marked ⚠, and listed below, so they never rely on colour. Classes with
// more than one section can be swapped by the owner and editors; "Picked for you" lets
// the planner choose again. Classes with no time (TBA, or no schedule this term) count
// in the hours but have no place here.
import { computed, ref, watch } from "vue";
import { call, message, type Output } from "../api.ts";
import { canEdit } from "../access.ts";
import { label, type Season } from "../util.ts";
import { DAYS, SHORT_DAYS, segments, textOn, timeOf } from "../week.ts";

const props = defineProps<{ road: string; season: Season; subjects: string[] }>();
const emit = defineEmits<{ changed: [] }>();

type Schedule = Output<"viewSemesterSchedule">["schedule"];
type Sections = Output<"viewClassHours">["hours"]["sections"];
const schedule = ref<Schedule | null>(null);
const options = ref<Record<string, Sections>>({}); // subject -> every section of it this season
const error = ref("");
const busy = ref(false);

const subjects = computed(() => [...props.subjects].sort().join(","));
async function load() {
  error.value = "";
  try {
    const [s, ...hours] = await Promise.all([
      call("viewSemesterSchedule", { road: props.road, year: props.season.year, term: props.season.term, subjects: subjects.value }),
      ...props.subjects.map((subject) => call("viewClassHours", { subject, year: props.season.year, term: props.season.term })),
    ]);
    schedule.value = s.schedule;
    options.value = Object.fromEntries(props.subjects.map((subject, i) => [subject, hours[i]!.hours.sections]));
  } catch (e) {
    error.value = message(e);
  }
}
watch(() => [props.road, props.season.year, props.season.term, subjects.value], load, { immediate: true });

// ---------- Drawing ----------

const FIRST = 7 * 4; // 7am
const LAST = 23 * 4; // 11pm
const PX = 7; // per 15 minutes
const hours = Array.from({ length: (LAST - FIRST) / 4 }, (_, i) => FIRST + i * 4);
const PALETTE = ["#7248d7", "#0b7a75", "#b3261e", "#1f5fbf", "#8a5a00", "#7b0082", "#556600", "#21286d"];
const colorOf = (subject: string) => PALETTE[props.subjects.slice().sort().indexOf(subject) % PALETTE.length] ?? PALETTE[0]!;
const categories = computed(() => new Map(schedule.value?.categories.map((c) => [c.category, c]) ?? []));
const categoryName = (id: string) => categories.value.get(id)?.name ?? "Blocked time";
const KIND: Record<string, string> = { LECTURE: "lecture", RECITATION: "recitation", LAB: "lab", DESIGN: "design" };

/** A segment clipped to the hours drawn: its top and height, or null if outside them. */
function place(start: number, slots: number) {
  const from = Math.max(start, FIRST);
  const to = Math.min(start + slots, LAST);
  return to > from ? { top: (from - FIRST) * PX, height: (to - from) * PX } : null;
}
const blocksOn = (day: number) =>
  (schedule.value?.blocks ?? []).flatMap((b) => segments(b).filter((s) => s.day === day).map((s) => ({ b, at: place(s.start, s.slots) })))
    .filter((x) => x.at);
const classesOn = (day: number) =>
  (schedule.value?.placement ?? []).filter((p) => p.day === day).map((p) => ({ p, at: place(p.start, p.slots) })).filter((x) => x.at);
const outside = computed(() => (schedule.value?.placement ?? []).filter((p) => !place(p.start, p.slots)));

// ---------- Sections ----------

/** The parts of each class, with the section picked and the times of every section. */
const parts = computed(() => {
  const seen = new Map<string, { subject: string; kind: string; section: number; options: number; chosen: boolean }>();
  for (const p of schedule.value?.placement ?? []) seen.set(`${p.subject}|${p.kind}`, p);
  return [...seen.values()].map((p) => {
    const rows = (options.value[p.subject] ?? []).filter((r) => r.kind === p.kind);
    const numbers = [...new Set(rows.map((r) => r.section))];
    const timesOf = (n: number) => rows.filter((r) => r.section === n)
      .map((r) => `${SHORT_DAYS[r.day]} ${timeOf(r.start)}–${timeOf(r.start + r.slots)}`).join(", ");
    return { ...p, choices: numbers.map((n) => ({ n, text: timesOf(n) })) };
  });
});

async function swap(subject: string, kind: string, value: string) {
  busy.value = true;
  error.value = "";
  try {
    const where = { road: props.road, year: props.season.year, term: props.season.term, subject, kind };
    if (value === "auto") await call("clearSection", where);
    else await call("chooseSection", { ...where, section: Number(value) });
    await load();
    emit("changed");
  } catch (e) {
    error.value = message(e);
  } finally {
    busy.value = false;
  }
}

const REASON: Record<string, string> = {
  ARRANGED: "some meetings are arranged (TBA)",
  NONE: "no schedule is published for this term",
  TERM: "no weekly schedule in this term",
};
</script>

<template>
  <section class="schedule-preview" :aria-label="`Week of ${label(season)}`">
    <h3>The week of {{ label(season) }}</h3>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-else-if="!schedule" class="hint">Loading…</p>
    <template v-else>
      <div class="preview-scroll">
        <div class="preview-grid" :style="{ '--hours': hours.length }">
          <span class="time-col" />
          <span v-for="(d, i) in SHORT_DAYS" :key="d" class="preview-day" :aria-label="DAYS[i]">{{ d }}</span>
          <div class="time-col preview-times" :style="{ height: `${hours.length * 4 * PX}px` }" aria-hidden="true">
            <span v-for="(h, i) in hours" :key="h" :style="{ top: `${i * 4 * PX}px` }">{{ timeOf(h) }}</span>
          </div>
          <div v-for="(d, day) in DAYS" :key="d" class="preview-col" :style="{ height: `${hours.length * 4 * PX}px` }">
            <div
              v-for="({ b, at }, i) in blocksOn(day)"
              :key="`b${i}`"
              class="preview-block"
              :style="{ top: `${at!.top}px`, height: `${at!.height}px` }"
              :title="categoryName(b.category)"
            ><span v-if="at!.height >= 14">{{ categoryName(b.category) }}</span></div>
            <div
              v-for="({ p, at }, i) in classesOn(day)"
              :key="`c${i}`"
              class="preview-class"
              :class="{ conflicted: p.conflicted }"
              :style="{ top: `${at!.top}px`, height: `${at!.height}px`, background: colorOf(p.subject), color: textOn(colorOf(p.subject)) }"
              :title="`${p.subject} ${KIND[p.kind]}, ${timeOf(p.start)}–${timeOf(p.start + p.slots)}${p.room ? ` in ${p.room}` : ''}${p.conflicted ? ' (conflict)' : ''}`"
            >
              <span>{{ p.conflicted ? "⚠ " : "" }}{{ p.subject }}</span>
              <span v-if="at!.height >= 24" class="preview-kind">{{ KIND[p.kind] }}</span>
            </div>
          </div>
        </div>
      </div>
      <p class="hint">Grey: your blocked time. Hatched with ⚠: a class that overlaps blocked time or another class.</p>
      <p v-if="outside.length" class="hint">
        Also meets outside 7am–11pm: {{ outside.map((p) => `${p.subject} ${SHORT_DAYS[p.day]} ${timeOf(p.start)}`).join(", ") }}.
      </p>

      <h4>Conflicts</h4>
      <ul v-if="schedule.conflicts.length" class="conflict-list">
        <li v-for="(c, i) in schedule.conflicts" :key="i">
          ⚠ {{ c.subject }} {{ KIND[c.kind] }}, {{ DAYS[c.day] }} {{ timeOf(c.start) }}–{{ timeOf(c.start + c.slots) }},
          overlaps {{ c.withBlock ? categoryName(c.with) : c.with }}
        </li>
      </ul>
      <p v-else class="ok">No conflicts: every class fits around your blocked time.</p>

      <h4>Sections</h4>
      <table v-if="parts.length" class="sections-table">
        <tbody>
          <tr v-for="p in parts" :key="`${p.subject}|${p.kind}`">
            <th scope="row"><span class="swatch" :style="{ background: colorOf(p.subject) }" aria-hidden="true" /> {{ p.subject }} {{ KIND[p.kind] }}</th>
            <td>
              <select
                v-if="canEdit && p.options > 1"
                :value="p.chosen ? p.section : 'auto'"
                :disabled="busy"
                :aria-label="`Section of ${p.subject} ${KIND[p.kind]}`"
                @change="swap(p.subject, p.kind, ($event.target as HTMLSelectElement).value)"
              >
                <option value="auto">Picked for you: {{ p.choices.find((c) => c.n === p.section)?.text }}</option>
                <option v-for="c in p.choices" :key="c.n" :value="c.n">{{ c.text }}</option>
              </select>
              <span v-else>{{ p.choices.find((c) => c.n === p.section)?.text }}<span v-if="p.options > 1" class="hint"> · {{ p.options }} sections</span></span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="schedule.unplaced.length" class="hint">
        Counted in the hours but not on the week:
        <template v-for="(u, i) in schedule.unplaced" :key="u.subject">{{ i ? "; " : "" }}{{ u.subject }} ({{ REASON[u.reason] ?? u.reason }})</template>.
      </p>
    </template>
  </section>
</template>
