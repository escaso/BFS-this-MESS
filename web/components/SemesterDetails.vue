<script setup lang="ts">
// Ratings and units for every class in one semester of a plan. Both come from
// CourseOffering, so they show "—" for a subject the catalog does not have.
// Clicking a class shows its catalog details and what it counts toward in the path.
import { computed, ref, watch } from "vue";
import { call, type Ratings } from "../api.ts";
import { label, unitSum, type Season } from "../util.ts";
import SubjectDetails from "./SubjectDetails.vue";

// countsToward: the titles of the requirements each class counts toward in this path.
const props = defineProps<{ season: Season; courses: { subject: string; countsToward: string[] }[] }>();

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
