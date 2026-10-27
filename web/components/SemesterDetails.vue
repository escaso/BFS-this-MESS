<script setup lang="ts">
// Ratings and units for every class in one semester of a plan. Both come from
// CourseOffering, so they show "—" for a subject the catalog does not have.
// Clicking a class shows its catalog details and what it counts toward in the path.
// With the semester's hours (from viewPlanMetrics), it also says whether its study fits
// the free time, and for Fall and Spring shows the classes on the week.
import { computed, ref, watch } from "vue";
import { call, type Output, type Ratings } from "../api.ts";
import { label, unitSum, type Season } from "../util.ts";
import SubjectDetails from "./SubjectDetails.vue";
import SchedulePreview from "./SchedulePreview.vue";

type Metrics = Output<"viewPlanMetrics">["metrics"]["semesters"][number];

// countsToward: the titles of the requirements each class counts toward in this path.
const props = defineProps<{
  season: Season;
  courses: { subject: string; countsToward: string[] }[];
  road?: string;
  metrics?: Metrics;
}>();
const emit = defineEmits<{ changed: [] }>();
const placed = computed(() => props.season.term === "FALL" || props.season.term === "SPRING");
const STATUS = {
  FEASIBLE: { icon: "✓", text: "Fits", kind: "ok" },
  TIGHT: { icon: "⚠", text: "Tight: only with your reserve", kind: "warn" },
  OVER: { icon: "✕", text: "Over: more study than free time", kind: "error" },
} as const;

type Row = { course: string; r: Ratings | null; units: string | null; countsToward: string[] };

const details = ref<Row[]>([]);
const loading = ref(false);
const open = ref("");
let token = 0;

async function lookUp({ subject: course, countsToward }: { subject: string; countsToward: string[] }): Promise<Row> {
  const [r, units] = await Promise.all([
    call("viewRatings", { course })
      .then((d) => d.ratings.ratings[0] ?? null)
      .catch(() => null),
    call("viewSubject", { course })
      .then((d) => (d.subject.found ? d.subject.units : null))
      .catch(() => null),
  ]);
  return { course, r, units, countsToward };
}

// Watch the contents, not the array: the parent builds a new array on every
// render, and only a different set of courses needs a new lookup.
watch(
  () => props.courses.map((c) => `${c.subject}:${c.countsToward.join("|")}`).join(","),
  async () => {
    const courses = props.courses;
    const mine = ++token;
    loading.value = true;
    const rows = await Promise.all(courses.map(lookUp));
    if (mine !== token) return; // the user clicked something else meanwhile
    details.value = rows;
    if (!rows.some((r) => r.course === open.value)) open.value = "";
    loading.value = false;
  },
  { immediate: true },
);

const totalUnits = computed(() =>
  details.value.reduce((n, { units }) => n + (unitSum(units) ?? 0), 0),
);
const openRow = computed(() => details.value.find((r) => r.course === open.value));
</script>

<template>
  <p v-if="loading" class="hint">Loading…</p>
  <template v-else>
    <h2>{{ label(season) }} · {{ totalUnits }} units</h2>
    <section v-if="metrics" class="semester-hours" aria-label="Hours each week">
      <p :class="STATUS[metrics.status].kind" class="status-line">
        <strong>{{ STATUS[metrics.status].icon }} {{ STATUS[metrics.status].text }}</strong>
        · study needs {{ metrics.outOfClass }} h of {{ metrics.usable }} h usable
        <template v-if="metrics.status !== 'FEASIBLE'">({{ metrics.free }} h free)</template>
        <template v-if="metrics.conflicts"> · {{ metrics.conflicts }} conflict{{ metrics.conflicts === 1 ? "" : "s" }}</template>
      </p>
      <table class="hours-table">
        <tbody>
          <tr><th scope="row">In class</th><td>{{ metrics.inClass }} h</td></tr>
          <tr><th scope="row">Outside class</th><td>{{ metrics.outOfClass }} h</td></tr>
          <tr><th scope="row">Blocked time</th><td>{{ metrics.blocked }} h</td></tr>
          <tr><th scope="row">Free</th><td>{{ metrics.free }} h <span class="hint">= 168 − {{ metrics.blocked }} blocked − {{ metrics.inClass }} in class</span></td></tr>
          <tr><th scope="row">Reserve</th><td>{{ metrics.buffer }}% <span class="hint">leaves {{ metrics.usable }} h for study</span></td></tr>
          <tr class="total"><th scope="row">Study time left</th><td>{{ metrics.capacity }} h <span class="hint">free − outside class</span></td></tr>
        </tbody>
      </table>
      <p v-if="metrics.estimated" class="hint">Some hours are estimates; click a class to see where its hours come from.</p>
      <p v-if="metrics.slots" class="hint">Each of the {{ metrics.slots }} open + slot{{ metrics.slots === 1 ? "" : "s" }} counts as 3 h in class.</p>
      <p v-if="!placed" class="hint">{{ label(season) }} has no weekly schedule preview: IAP and summer classes are counted in hours only.</p>
    </section>
    <SchedulePreview
      v-if="road && metrics && placed && courses.length"
      :road="road"
      :season="season"
      :subjects="courses.map((c) => c.subject)"
      @changed="emit('changed')"
    />
    <table>
      <thead>
        <tr><th>Class</th><th>Counts toward</th><th>Class rating</th><th>Units</th></tr>
      </thead>
      <tbody>
        <tr
          v-for="row in details"
          :key="row.course"
          :class="{ picked: row.course === open }"
          @click="open = open === row.course ? '' : row.course"
        >
          <td><button class="link" type="button" :aria-expanded="row.course === open">{{ row.course }}</button></td>
          <td>{{ row.countsToward.join(" · ") || "—" }}</td>
          <td>{{ row.r?.found ? row.r.classRating : "—" }}</td>
          <td>{{ row.units ? (unitSum(row.units) ?? row.units) : "—" }}</td>
        </tr>
        <tr v-if="!details.length"><td colspan="4" class="hint">Nothing this semester.</td></tr>
      </tbody>
    </table>
    <p v-if="details.length && !openRow" class="hint">Click a class to read its description.</p>
    <section v-if="openRow" class="details">
      <SubjectDetails :course="openRow.course" :counts-toward="openRow.countsToward" :season="season" />
    </section>
  </template>
</template>
