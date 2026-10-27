<script setup lang="ts">
// The details of one subject, as the catalog lists it: description, units (with their
// breakdown), terms, prerequisites, schedule and rating. Shown by the catalog and by a
// path's semester summary, which also says what the subject counts toward in that path
// and, for that semester, the hours a week it takes.
import { ref, watch } from "vue";
import { call, message, type CourseDetails, type Ratings, type Schedule } from "../api.ts";
import type { Season } from "../util.ts";
import ClassHours from "./ClassHours.vue";

const props = defineProps<{ course: string; countsToward?: string[]; season?: Season }>();

const details = ref<{ subject: CourseDetails; ratings: Ratings | null; schedule: Schedule | null } | null>(null);
const detailsError = ref("");
const selected = ref("");

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
watch(() => props.course, open, { immediate: true });

const termLabel = (t: string) => (t === "IAP" ? "IAP" : t.charAt(0) + t.slice(1).toLowerCase());

/** "5-0-7" -> "5 lecture · 0 lab · 7 preparation · 12 total", or null if the units have no breakdown. */
function breakdown(units: string) {
  const parts = units.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [lecture, lab, prep] = parts;
  return `${lecture} lecture · ${lab} lab · ${prep} preparation · ${lecture + lab + prep} total`;
}

// Dependencies come as one row per option; put each "or" group back together.
function groups(rows: { dependency: string; subject: string }[]) {
  const byDependency = new Map<string, string[]>();
  for (const { dependency, subject } of rows) byDependency.set(dependency, [...(byDependency.get(dependency) ?? []), subject]);
  return [...byDependency.values()];
}
</script>

<template>
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
      <template v-if="countsToward">
        <dt>Counts toward</dt>
        <dd>{{ countsToward.length ? countsToward.join(" · ") : "No requirement (in this path for a prerequisite)" }}</dd>
      </template>

      <template v-if="breakdown(details.subject.units)">
        <dt>Units</dt>
        <dd>{{ details.subject.units }}: {{ breakdown(details.subject.units) }}</dd>
      </template>

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
    <ClassHours v-if="season" :course="details.subject.courseId" :season="season" />
  </template>
</template>
