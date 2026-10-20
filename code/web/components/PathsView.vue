<script setup lang="ts">
// Tabs for each possible path, the semester grid for the chosen one, and
// details for a clicked semester. Prior credit is part of every path, so it is
// shown once, before the first semester.
import { computed, ref, watch } from "vue";
import type { Constraints, PlanRow } from "../api.ts";
import { color, key, label, rank, sameSeason, seasonsBetween, type Season } from "../util.ts";
import SemesterDetails from "./SemesterDetails.vue";

const props = defineProps<{ constraints: Constraints; plans: PlanRow[]; includeIAPAndSummer: boolean }>();
const emit = defineEmits<{ edit: []; "update:includeIAPAndSummer": [value: boolean] }>();

// viewRoad answers one row per subject per season per plan; group them by plan.
const byPlan = computed(() => {
  const plans = new Map<number, PlanRow[]>();
  for (const row of props.plans) plans.set(row.plan, [...(plans.get(row.plan) ?? []), row]);
  return [...plans.entries()].sort(([a], [b]) => a - b).map(([, rows]) => rows);
});

const pathIndex = ref(0);
const selected = ref<Season | null>(null);

// If the paths shrink after an edit, fall back to the first one.
watch(byPlan, (plans) => {
  if (pathIndex.value >= plans.length) pathIndex.value = 0;
});

// With no path, still show what the student has chosen: their pins. Every
// path contains the pins, so this is what all paths would have in common.
const noPath = computed(() => byPlan.value.length === 0);
// With no requirements and no pins there is nothing to plan, which is not a failure.
const nothingToPlan = computed(() => !props.constraints.blocks.length && !props.constraints.pins.length);
const plan = computed<(Season & { subject: string })[]>(() =>
  noPath.value ? props.constraints.pins : (byPlan.value[pathIndex.value] ?? []),
);

// The road's seasons, extended when a plan has to finish after the end.
const columns = computed(() => {
  const c = props.constraints;
  const start: Season = { year: c.startYear, term: c.startTerm };
  let end: Season = { year: c.endYear, term: c.endTerm };
  for (const r of plan.value) if (rank(r) > rank(end)) end = r;
  return seasonsBetween(start, end, props.includeIAPAndSummer);
});

const pastEnd = (s: Season) =>
  rank(s) > rank({ year: props.constraints.endYear, term: props.constraints.endTerm });
const subjectsIn = (s: Season) => plan.value.filter((r) => sameSeason(r, s)).map((r) => r.subject);
const isLocked = (s: Season) => props.constraints.semesters.some((r) => sameSeason(r, s) && r.locked);
const isPinned = (s: Season, subject: string) =>
  props.constraints.pins.some((p) => p.subject === subject && sameSeason(p, s));

function toggle(s: Season) {
  selected.value = selected.value && sameSeason(selected.value, s) ? null : s;
}
</script>

<template>
  <main>
    <div class="titlebar">
      <h1>Possible paths</h1>
      <button @click="emit('edit')">Edit constraints</button>
    </div>

    <label class="inline">
      <input
        type="checkbox"
        :checked="includeIAPAndSummer"
        @change="emit('update:includeIAPAndSummer', ($event.target as HTMLInputElement).checked)"
      />
      Use IAP and summer
    </label>

    <nav id="tabs">
      <button
        v-for="(_, i) in byPlan"
        :key="i"
        class="tab"
        :class="{ active: i === pathIndex }"
        @click="pathIndex = i"
      >
        Path {{ i + 1 }}
      </button>
      <span v-if="nothingToPlan" class="hint">
        Add a requirement (Edit constraints) to find paths.
      </span>
      <span v-else-if="noPath" class="error">
        No path found. Showing only your pinned subjects.
      </span>
    </nav>

    <div v-if="noPath && !nothingToPlan" class="hint">
      <p>
        A path must meet every requirement, and every subject in it needs its prerequisites in an
        earlier semester. Paths add missing prerequisites themselves, so the usual reasons none is
        found are:
      </p>
      <ul>
        <li>
          A subject is pinned too early for its prerequisites, for example in the first semester.
          Unpin it or pin it later.
        </li>
        <li>A cap, a locked semester, or the terms a subject runs in leave no room for it.</li>
      </ul>
    </div>

    <p v-if="constraints.prior.length" class="hint">
      Prior credit: {{ constraints.prior.map((p) => p.subject).join(", ") }}
    </p>

    <div id="road" :style="{ gridTemplateColumns: `repeat(${columns.length}, minmax(110px, 1fr))` }">
      <div
        v-for="s in columns"
        :key="key(s)"
        class="sem"
        :class="{ locked: isLocked(s), selected: selected && key(selected) === key(s), extra: pastEnd(s) }"
        @click="toggle(s)"
      >
        <h3>{{ label(s) }} {{ isLocked(s) ? "🔒" : "" }}</h3>
        <p v-if="pastEnd(s)" class="hint">after the end of the road</p>
        <div v-for="c in subjectsIn(s)" :key="c" class="course" :style="{ background: color(c) }">
          {{ isPinned(s, c) ? "📌 " : "" }}{{ c }}
        </div>
      </div>
    </div>

    <section id="details">
      <p v-if="!selected" class="hint">Click a semester to see its classes.</p>
      <SemesterDetails v-else :season="selected" :courses="subjectsIn(selected)" />
    </section>
  </main>
</template>
