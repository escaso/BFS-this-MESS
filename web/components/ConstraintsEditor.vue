<script setup lang="ts">
// Edit a road's major, caps for all fall and spring semesters at once, the
// settings of one semester (caps and lock) and its pins. The major's requirements are shown in RequirementsView; the student's own
// requirement blocks are edited in BlocksEditor. Each edit calls the
// backend, then tells App to reload the road, so every view stays in sync
// without a page refresh.
import { computed, ref, watch } from "vue";
import { call, message, type Constraints, type Requirements } from "../api.ts";
import { isListedMajor, majorLabel, majors } from "../majors.ts";
import { key, label, sameSeason, seasonsOf, type Season } from "../util.ts";
import BlocksEditor from "./BlocksEditor.vue";
import RequirementsView from "./RequirementsView.vue";
import SubjectPicker from "./SubjectPicker.vue";
import { canEdit } from "../access.ts";

const props = defineProps<{ road: string; constraints: Constraints; requirements: Requirements | null }>();
const emit = defineEmits<{ back: []; changed: [note?: string]; error: [message: string] }>();

const busy = ref(false);

// Run one edit; on success ask App to reload, on failure report why.
async function attempt(run: () => Promise<unknown>, note?: string): Promise<boolean> {
  busy.value = true;
  try {
    await run();
    emit("changed", note);
    return true;
  } catch (e) {
    emit("error", message(e));
    return false;
  } finally {
    busy.value = false;
  }
}

// Every season of the road, including IAP and summer, so any of them can be set up.
const seasons = computed(() => seasonsOf(props.constraints, true));
const seasonOf = (k: string): Season | undefined => seasons.value.find((s) => key(s) === k);

// ---------- Major ----------

const major = ref(props.constraints.major);
watch(() => props.constraints.major, (m) => (major.value = m));

function saveMajor() {
  if (!isListedMajor(major.value)) return emit("error", "Pick a major from the list.");
  if (major.value === props.constraints.major) return;
  return attempt(
    () => call("setMajor", { road: props.road, major: major.value }),
    `Major set to ${majorLabel(major.value)}; its requirements replace the old ones.`,
  );
}

// ---------- One semester's settings ----------

const chosen = ref(key(seasons.value[0]));
const settings = ref({ total: "", technical: "", locked: false });

// What the road says now for a season. A season with no Semester takes the
// defaults: unlocked, no caps, except IAP whose total cap is 12. A cap of 0
// from _semesters means "no cap".
function current(s: Season) {
  const row = props.constraints.semesters.find((r) => sameSeason(r, s));
  if (!row) return { total: s.term === "IAP" ? "12" : "", technical: "", locked: false };
  return {
    total: row.maxUnits ? String(row.maxUnits) : "",
    technical: row.maxTechnicalUnits ? String(row.maxTechnicalUnits) : "",
    locked: row.locked,
  };
}

watch(
  [chosen, () => props.constraints],
  () => {
    const s = seasonOf(chosen.value);
    if (s) settings.value = current(s);
  },
  { immediate: true },
);

function parseCap(text: string): number | null | "bad" {
  const t = text.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isInteger(n) && n >= 0 ? n : "bad";
}

async function saveSemester() {
  const s = seasonOf(chosen.value);
  if (!s) return;
  const before = current(s);
  const caps = { total: parseCap(settings.value.total), technical: parseCap(settings.value.technical) };
  if (caps.total === "bad" || caps.technical === "bad") {
    return emit("error", "A cap must be a whole number of units, at least 0, or empty for no cap.");
  }
  const where = { road: props.road, year: s.year, term: s.term };
  // Only send what changed, so that saving IAP untouched keeps its default cap.
  await attempt(async () => {
    for (const capType of ["total", "technical"] as const) {
      const limit = caps[capType];
      if (settings.value[capType].trim() === before[capType]) continue;
      if (limit === null) await call("clearCap", { ...where, capType });
      else await call("setCap", { ...where, capType, limit: limit as number });
    }
    if (settings.value.locked !== before.locked) {
      await call("setLocked", { ...where, locked: settings.value.locked });
    }
  }, `${label(s)} saved.`);
}

// ---------- Caps for all semesters ----------

// What is set now, e.g. "max 48 units in all 8 fall and spring semesters; max 36 technical units in 6 of 8".
const capsSummary = computed(() => {
  const terms = seasonsOf(props.constraints, false);
  const part = (capType: "maxUnits" | "maxTechnicalUnits", noun: string) => {
    const counts = new Map<number, number>();
    for (const s of terms) {
      const cap = props.constraints.semesters.find((r) => sameSeason(r, s))?.[capType] ?? 0;
      if (cap > 0) counts.set(cap, (counts.get(cap) ?? 0) + 1);
    }
    return [...counts].sort((a, b) => b[1] - a[1]).map(([cap, n]) =>
      `max ${cap} ${noun} in ${n === terms.length ? `all ${n}` : `${n} of ${terms.length}`} fall and spring semesters`);
  };
  const parts = [...part("maxUnits", "units"), ...part("maxTechnicalUnits", "technical units")];
  return parts.length ? parts.join("; ") : "No caps on fall and spring semesters.";
});

const capped = (s: Season) => {
  const row = props.constraints.semesters.find((r) => sameSeason(r, s));
  return !!row && (row.maxUnits > 0 || row.maxTechnicalUnits > 0);
};

// One cap typed once, sent as that cap on every fall and spring semester.
// IAP and summer keep their own caps. An empty field leaves that cap alone.
const allCaps = ref({ total: "", technical: "" });

async function saveAll() {
  const caps = { total: parseCap(allCaps.value.total), technical: parseCap(allCaps.value.technical) };
  if (caps.total === "bad" || caps.technical === "bad") {
    return emit("error", "A cap must be a whole number of units, at least 0, or empty for no cap.");
  }
  if (caps.total === null && caps.technical === null) return emit("error", "Give a cap to apply.");
  const terms = seasonsOf(props.constraints, false);
  const set = [
    caps.total !== null && `max ${caps.total} units`,
    caps.technical !== null && `max ${caps.technical} technical units`,
  ].filter(Boolean);
  const ok = await attempt(async () => {
    for (const s of terms) {
      for (const capType of ["total", "technical"] as const) {
        const limit = caps[capType];
        if (limit === null) continue;
        await call("setCap", { road: props.road, year: s.year, term: s.term, capType, limit });
      }
    }
  }, `Set ${set.join(" and ")} on all ${terms.length} fall and spring semesters.`);
  if (ok) allCaps.value = { total: "", technical: "" };
}

// ---------- Pins ----------

const pinForm = ref({ subject: "", season: key(seasons.value[0]) });

async function addPin() {
  const subject = pinForm.value.subject.trim();
  const s = seasonOf(pinForm.value.season);
  if (!subject || !s) return emit("error", "Give a subject and a semester to pin it to.");
  const ok = await attempt(
    () => call("pin", { road: props.road, subject, year: s.year, term: s.term }),
    `${subject} pinned to ${label(s)}.`,
  );
  if (ok) pinForm.value.subject = "";
}

function unPin(subject: string) {
  return attempt(() => call("unPin", { road: props.road, subject }), `${subject} unpinned.`);
}
</script>

<template>
  <main>
    <div class="titlebar">
      <h1>Constraints</h1>
      <button @click="emit('back')">Back to paths</button>
    </div>

    <h2>Major</h2>
    <form @submit.prevent="saveMajor">
      <select v-model="major" required aria-label="Major">
        <option v-if="!isListedMajor(major)" :value="major" disabled>{{ major }} (not a listed major)</option>
        <option v-for="m in majors" :key="m.list" :value="m.list">{{ majorLabel(m.list, true) }}</option>
      </select>
      <button :disabled="busy || major === constraints.major">Change major</button>
    </form>

    <RequirementsView
      :read-only="!canEdit"
      v-if="requirements"
      :road="road"
      :requirements="requirements"
      :constraints="constraints"
      @changed="emit('changed', $event)"
      @error="emit('error', $event)"
    />

    <h2>All semesters</h2>
    <p class="hint">
      Sets the cap of each fall and spring semester. IAP and summer keep their own; you can still change any
      semester below.
    </p>
    <p class="caps-now"><strong>Current caps:</strong> {{ capsSummary }}</p>
    <form class="grid" @submit.prevent="saveAll">
      <label>Max units <input v-model="allCaps.total" inputmode="numeric" placeholder="leave as is" /></label>
      <label>
        Max technical units
        <input v-model="allCaps.technical" inputmode="numeric" placeholder="leave as is" />
      </label>
      <button :disabled="busy">Apply to all semesters</button>
    </form>

    <h2>Semester settings</h2>
    <form class="grid" @submit.prevent="saveSemester">
      <label>
        Semester
        <select v-model="chosen">
          <option v-for="s in seasons" :key="key(s)" :value="key(s)">
            {{ label(s) }}{{ capped(s) ? " (capped)" : "" }}
          </option>
        </select>
      </label>
      <label>Max units <input v-model="settings.total" inputmode="numeric" placeholder="no cap" /></label>
      <label>
        Max technical units
        <input v-model="settings.technical" inputmode="numeric" placeholder="no cap" />
      </label>
      <label>
        Locked (taken already: only its pins, nothing added)
        <input v-model="settings.locked" type="checkbox" />
      </label>
      <button :disabled="busy">Save semester</button>
    </form>

    <h2>Pinned subjects</h2>
    <ul>
      <li v-for="p in constraints.pins" :key="p.subject">
        {{ p.subject }} in {{ label(p) }}
        <button :disabled="busy" @click="unPin(p.subject)">Unpin</button>
      </li>
      <li v-if="!constraints.pins.length" class="hint">None</li>
    </ul>
    <form class="pin-form" @submit.prevent="addPin">
      <SubjectPicker v-model="pinForm.subject" label="Subject to pin" keep required :busy="busy" />
      <label>
        Semester
        <select v-model="pinForm.season">
          <option v-for="s in seasons" :key="key(s)" :value="key(s)">{{ label(s) }}</option>
        </select>
      </label>
      <button :disabled="busy">Pin</button>
    </form>

    <BlocksEditor
      :road="road"
      :blocks="constraints.blocks"
      @changed="emit('changed', $event)"
      @error="emit('error', $event)"
    />
  </main>
</template>
