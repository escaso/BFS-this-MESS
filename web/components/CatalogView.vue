<script setup lang="ts">
// The course listing. Searches the catalog by text, level and term, and shows the
// details of the subject that is clicked. The catalog itself is loaded on the
// server from catalog/snapshot.json (bun run catalog:build), not from here.
import { computed, ref, watch } from "vue";
import { call, message, type CourseRow } from "../api.ts";
import SubjectDetails from "./SubjectDetails.vue";

const TERMS = ["FALL", "IAP", "SPRING", "SUMMER"] as const;
// The listing can hold thousands of subjects; only this many rows are drawn at once.
const SHOWN = 200;

const query = ref("");
const level = ref("");
const term = ref("");
const results = ref<CourseRow[]>([]);
const searched = ref(false);
const busy = ref(false);
const error = ref("");

const selected = ref("");

const hasFilter = computed(() => query.value.trim().length >= 2 || !!level.value || !!term.value);

let token = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

async function search() {
  const mine = ++token;
  if (!hasFilter.value) {
    results.value = [];
    searched.value = false;
    return;
  }
  busy.value = true;
  error.value = "";
  try {
    const { courses } = await call("searchSubjects", {
      query: query.value.trim(),
      level: level.value,
      term: term.value,
    });
    if (mine !== token) return; // a newer search is on its way
    results.value = courses.courses;
    searched.value = true;
  } catch (e) {
    if (mine === token) error.value = message(e);
  } finally {
    if (mine === token) busy.value = false;
  }
}

// Search as the person types, once they pause.
watch([query, level, term], () => {
  clearTimeout(timer);
  timer = setTimeout(search, 250);
});

function open(course: string) {
  selected.value = course;
}

const termLabel = (t: string) => (t === "IAP" ? "IAP" : t.charAt(0) + t.slice(1).toLowerCase());
const termsLabel = (terms: string) => terms.split(" ").filter(Boolean).map(termLabel).join(", ") || "—";

</script>

<template>
  <main class="catalog">
    <h1>Catalog</h1>
    <form class="filters" @submit.prevent="search">
      <input v-model="query" type="search" placeholder="Search by number, name or description (e.g. 6.1210, algorithms)" autofocus />
      <select v-model="level" aria-label="Level">
        <option value="">Any level</option>
        <option value="Undergraduate">Undergraduate</option>
        <option value="Graduate">Graduate</option>
      </select>
      <select v-model="term" aria-label="Term">
        <option value="">Any term</option>
        <option v-for="t in TERMS" :key="t" :value="t">{{ termLabel(t) }}</option>
      </select>
    </form>
    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <div class="catalog-body">
      <section class="results">
        <p v-if="!hasFilter" class="hint">Type at least two characters, or pick a level or term.</p>
        <p v-else-if="busy && !searched" class="hint">Searching…</p>
        <template v-else-if="searched">
          <p class="hint">
            {{ results.length }} subject{{ results.length === 1 ? "" : "s" }}
            <template v-if="results.length > SHOWN"> · showing the first {{ SHOWN }}, narrow the search to see more</template>
            <template v-if="busy"> · updating…</template>
          </p>
          <table v-if="results.length">
            <thead>
              <tr><th>Subject</th><th>Title</th><th>Units</th><th>Terms</th><th>Level</th></tr>
            </thead>
            <tbody>
              <tr
                v-for="c in results.slice(0, SHOWN)"
                :key="c.course"
                :class="{ picked: c.course === selected }"
                @click="open(c.course)"
              >
                <td><button class="link" type="button">{{ c.courseId }}</button></td>
                <td>{{ c.name }}</td>
                <td :title="c.unitsKnown ? '' : 'No fixed units; plans assume 12'">
                  {{ c.units || "—" }}<span v-if="!c.unitsKnown">*</span>
                </td>
                <td>{{ termsLabel(c.terms) }}</td>
                <td>{{ c.level === "Graduate" ? "G" : c.level === "Undergraduate" ? "U" : "—" }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="results.some((c) => !c.unitsKnown)" class="hint">* No fixed units; plans assume 12.</p>
        </template>
      </section>

      <aside v-if="selected" class="details">
        <SubjectDetails :course="selected" />
      </aside>
    </div>
  </main>
</template>
