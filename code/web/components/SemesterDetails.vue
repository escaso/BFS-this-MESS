<script setup lang="ts">
// Ratings and units for every class in one semester of a plan.
import { computed, ref, watch } from "vue";
import { api, unwrap, type Ratings, type Schedule } from "../api.ts";
import { unitSum } from "../util.ts";

const props = defineProps<{ semester: number; courses: string[] }>();

type Row = { course: string; r: Ratings | null; s: Schedule | null };

const details = ref<Row[]>([]);
const loading = ref(false);
let token = 0;

async function lookUp(course: string): Promise<Row> {
  const [r, s] = await Promise.all([
    unwrap(api.viewRatings({ course }))
      .then((d) => d.ratings.ratings[0] ?? null)
      .catch(() => null),
    unwrap(api.viewSchedule({ course }))
      .then((d) => d.schedule.schedule[0] ?? null)
      .catch(() => null),
  ]);
  return { course, r, s };
}

watch(
  () => props.courses,
  async (courses) => {
    const mine = ++token;
    loading.value = true;
    const rows = await Promise.all(courses.map(lookUp));
    if (mine !== token) return; // the user clicked something else meanwhile
    details.value = rows;
    loading.value = false;
  },
  { immediate: true },
);

const totalUnits = computed(() =>
  details.value.reduce((n, { s }) => n + (unitSum(s?.units) ?? 0), 0),
);
</script>

<template>
  <p v-if="loading" class="hint">Loading…</p>
  <template v-else>
    <h2>Sem {{ semester }} · {{ totalUnits }} units</h2>
    <table>
      <thead>
        <tr><th>Class</th><th>Class rating</th><th>Professor rating</th><th>Units</th></tr>
      </thead>
      <tbody>
        <tr v-for="row in details" :key="row.course">
          <td>{{ row.course }}</td>
          <td>{{ row.r?.found ? row.r.classRating : "—" }}</td>
          <td>{{ row.r?.found ? row.r.professorRating : "—" }}</td>
          <td>{{ row.s?.found ? (unitSum(row.s.units) ?? row.s.units) : "—" }}</td>
        </tr>
        <tr v-if="!details.length"><td colspan="4" class="hint">Nothing this semester.</td></tr>
      </tbody>
    </table>
  </template>
</template>
