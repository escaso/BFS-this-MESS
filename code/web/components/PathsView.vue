<script setup lang="ts">
// Tabs for each possible path, the semester grid for the chosen one, and
// details for a clicked semester.
import { computed, ref, watch } from "vue";
import type { Constraints, Plan } from "../api.ts";
import { SEMESTERS, color } from "../util.ts";
import SemesterDetails from "./SemesterDetails.vue";

const props = defineProps<{ plans: Plan[]; constraints: Constraints | null }>();
defineEmits<{ edit: [] }>();

const pathIndex = ref(0);
const selectedSem = ref<number | null>(null);

// If the paths shrink after an edit, fall back to the first one.
watch(
  () => props.plans,
  (plans) => {
    if (pathIndex.value >= plans.length) pathIndex.value = 0;
  },
);

const plan = computed<Plan>(() => props.plans[pathIndex.value] ?? []);
const locked = computed(() => props.constraints?.lockedThrough ?? 0);
const pinned = computed(
  () => new Set((props.constraints?.pins ?? []).map((p) => `${p.semester}:${p.subject}`)),
);

function toggleSem(s: number) {
  selectedSem.value = s === selectedSem.value ? null : s;
}
</script>

<template>
  <main>
    <div class="titlebar">
      <h1>Possible paths</h1>
      <button @click="$emit('edit')">Edit constraints</button>
    </div>

    <nav id="tabs">
      <button
        v-for="(_, i) in plans"
        :key="i"
        class="tab"
        :class="{ active: i === pathIndex }"
        @click="pathIndex = i"
      >
        Path {{ i + 1 }}
      </button>
      <span v-if="!plans.length" class="hint">No paths found.</span>
    </nav>

    <div id="road">
      <div
        v-for="s in SEMESTERS"
        :key="s"
        class="sem"
        :class="{ locked: s <= locked, selected: s === selectedSem }"
        @click="toggleSem(s)"
      >
        <h3>Sem {{ s }} {{ s <= locked ? "🔒" : "" }}</h3>
        <div v-for="c in plan[s] ?? []" :key="c" class="course" :style="{ background: color(c) }">
          {{ pinned.has(`${s}:${c}`) ? "📌 " : "" }}{{ c }}
        </div>
      </div>
    </div>

    <section id="details">
      <p v-if="!selectedSem" class="hint">Click a semester to see its classes.</p>
      <SemesterDetails v-else :semester="selectedSem" :courses="plan[selectedSem] ?? []" />
    </section>
  </main>
</template>
