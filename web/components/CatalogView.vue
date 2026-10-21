<script setup lang="ts">
// The course listing. Searches the catalog by text, level and term, and shows the
// details of the subject that is clicked. The catalog itself is loaded on the
// server from catalog/snapshot.json (bun run catalog:build), not from here.
import { computed, ref, watch } from "vue";
import { call, message, type CourseDetails, type CourseRow, type Ratings, type Schedule } from "../api.ts";

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
const details = ref<{ subject: CourseDetails; ratings: Ratings | null; schedule: Schedule | null } | null>(null);
const detailsError = ref("");

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

async function open(course: string) {
  selected.value = course;
  details.value = null;
  detailsError.value = "";
  try {
    const [subject, ratings, schedule] = await Promise.all([
      call("viewSubject", { course }),
      call("viewRatings", { course }),
      call("viewSchedule", { course }),
    ]);
    if (selected.value !== course) return;
    details.value = {
      subject: subject.subject,
      ratings: ratings.ratings.ratings[0] ?? null,
      schedule: schedule.schedule.schedule[0] ?? null,
    };
  } catch (e) {
    if (selected.value === course) detailsError.value = message(e);
  }
}

const termLabel = (t: string) => (t === "IAP" ? "IAP" : t.charAt(0) + t.slice(1).toLowerCase());
const termsLabel = (terms: string) => terms.split(" ").filter(Boolean).map(termLabel).join(", ") || "—";

// Dependencies come as one row per option; put each "or" group back together.
function groups(rows: { dependency: string; subject: string }[]) {
  const byDependency = new Map<string, string[]>();
  for (const { dependency, subject } of rows) byDependency.set(dependency, [...(byDependency.get(dependency) ?? []), subject]);
  return [...byDependency.values()];
}
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
        <p v-if="detailsError" class="error">{{ detailsError }}</p>
        <p v-else-if="!details" class="hint">Loading {{ selected }}…</p>
        <template v-else-if="!details.subject.found">
          <p class="hint">{{ selected }} is not in the catalog.</p>
        </template>
        <template v-else>
          <h2>{{ details.subject.courseId }} {{ details.subject.name }}</h2>
          <p class="hint">
            {{ details.subject.level || "Level unknown" }} ·
            {{ details.subject.units || "units unknown" }} units ·
            {{ details.subject.terms.map((t) => termLabel(t.term)).join(", ") || "no terms listed" }}
            <template v-if="details.subject.canBeRepeated"> · can be repeated for credit</template>
          </p>
          <p v-if="details.subject.offering !== 'Offered normally'" class="error">{{ details.subject.offering }}</p>
          <p>{{ details.subject.description }}</p>
          <dl>
            <dt>Instructors</dt>
            <dd>{{ details.subject.lecturer }}</dd>

            <dt>Prerequisites</dt>
            <dd>
              {{ details.subject.prerequisitesText || "None" }}
              <div v-if="details.subject.prerequisites.length" class="hint">
                Plans need:
                <span v-for="(options, i) in groups(details.subject.prerequisites)" :key="i" class="chip">
                  {{ options.length > 4 ? `one of ${options.slice(0, 4).join(", ")}, …` : options.join(" or ") }}
                </span>
              </div>
            </dd>

            <template v-if="details.subject.corequisitesText">
              <dt>Corequisites</dt>
              <dd>{{ details.subject.corequisitesText }}</dd>
            </template>

            <template v-if="details.schedule?.found">
              <dt>Schedule</dt>
              <dd>{{ details.schedule.meetingTimes }} <span v-if="details.schedule.location">· {{ details.schedule.location }}</span></dd>
            </template>

            <template v-if="details.subject.cancellations.length">
              <dt>Not offered in</dt>
              <dd>{{ details.subject.cancellations.map((c) => `${termLabel(c.term)} ${c.year}`).join(", ") }}</dd>
            </template>

            <dt>Class rating</dt>
            <dd>
              <template v-if="details.ratings?.found">
                {{ details.ratings.classRating.toFixed(1) }} / 7 ·
                <a :href="details.ratings.url" target="_blank" rel="noopener">evaluations</a>
              </template>
              <template v-else>No evaluations</template>
            </dd>
          </dl>
        </template>
      </aside>
    </div>
  </main>
</template>
