<script setup lang="ts">
// Tabs for each possible path, the semester grid for the chosen one, and
// details for a clicked semester. Prior credit is part of every path, so it is
// shown once, before the first semester. A path's open slots (such as HASS
// subjects) are for the student to fill: clicking one lists the subjects that fit.
// Any subject of a path can be pinned where the path puts it, and a whole semester can be
// locked as the path has it. Subjects are coloured by the requirement they count toward.
// Each semester says whether its study fits the owner's free time; a hard road shows only
// the paths that fit, and says which semesters keep the others out. A table compares the
// paths by when they finish, their units and their hours.
import { computed, nextTick, ref, watch } from "vue";
import { call, message, type Constraints, type Output, type PlanRow } from "../api.ts";
import { canEdit, canShare, isOwner } from "../access.ts";
import { key, label, MAX_PATHS, rank, sameSeason, seasonsBetween, type Season } from "../util.ts";
import SemesterDetails from "./SemesterDetails.vue";
import SubjectDetails from "./SubjectDetails.vue";
import SlotPicker from "./SlotPicker.vue";

type Judged = Pick<Output<"viewRoad">["paths"], "mode" | "dropped" | "binding">;
const props = defineProps<{
  road: string;
  constraints: Constraints;
  plans: PlanRow[];
  judged: Judged | null;
  includeIAPAndSummer: boolean;
}>();
const emit = defineEmits<{
  edit: [];
  share: [];
  copy: [];
  "update:includeIAPAndSummer": [value: boolean];
  changed: [note?: string];
  error: [message: string];
}>();

// viewRoad answers one row per subject per season per plan; group them by plan.
const byPlan = computed(() => {
  const plans = new Map<number, PlanRow[]>();
  for (const row of props.plans) plans.set(row.plan, [...(plans.get(row.plan) ?? []), row]);
  return [...plans.entries()].sort(([a], [b]) => a - b).map(([, rows]) => rows);
});

const pathIndex = ref(0);
const selected = ref<Season | null>(null);

// ---------- Hours against the time budget ----------
// The hours of every semester of every path, against the owner's week. They come after the
// paths, so a slow answer never holds up the grid.
type Metrics = Output<"viewPlanMetrics">["metrics"]["semesters"][number];
const metrics = ref<Metrics[]>([]);
let metricsToken = 0;
async function loadMetrics() {
  const mine = ++metricsToken;
  try {
    const m = (await call("viewPlanMetrics", { road: props.road, includeIAPAndSummer: props.includeIAPAndSummer, limit: MAX_PATHS })).metrics;
    if (mine === metricsToken) metrics.value = m.semesters;
  } catch {
    if (mine === metricsToken) metrics.value = []; // the badges just don't show
  }
}
watch(() => [props.plans, props.includeIAPAndSummer], loadMetrics, { immediate: true });
const metricsOf = (s: Season) => metrics.value.find((m) => m.plan === pathIndex.value + 1 && sameSeason(m, s));
const STATUS = { FEASIBLE: "✓ Fits", TIGHT: "⚠ Tight", OVER: "✕ Over" } as const;

// ---------- Soft or hard ----------

type RoadTime = Output<"viewRoadTime">["time"];
const time = ref<RoadTime | null>(null);
async function loadTime() {
  try {
    time.value = (await call("viewRoadTime", { road: props.road })).time;
  } catch {
    time.value = null;
  }
}
watch(() => props.road, loadTime, { immediate: true });

async function changeTime(run: () => Promise<unknown>, note: string) {
  busy.value = true;
  try {
    await run();
    await loadTime();
    emit("changed", note);
  } catch (e) {
    emit("error", message(e));
  } finally {
    busy.value = false;
  }
}
const setMode = (mode: "SOFT" | "HARD") =>
  changeTime(() => call("setScheduleMode", { road: props.road, mode }),
    mode === "HARD" ? "Showing only paths whose semesters fit your free time." : "Showing every path, with its hours.");
function setReserve(value: string) {
  if (value === "") return changeTime(() => call("clearRoadReserve", { road: props.road }), "This road uses your usual reserve.");
  return changeTime(() => call("setRoadReserve", { road: props.road, buffer: Number(value) }), `This road keeps ${value}% in reserve.`);
}
const RESERVES = [0, 5, 10, 15, 20, 25, 30, 40, 50];
const setShare = (shareMode: "METRICS" | "DETAILS") =>
  changeTime(() => call("setShareMode", { road: props.road, shareMode }),
    shareMode === "DETAILS"
      ? "People on this road can now see your blocked time and its categories."
      : "People on this road now see your hours only, not your blocked time.");

// ---------- Comparing paths ----------

const comparison = computed(() =>
  byPlan.value.map((rows, i) => {
    const sems = metrics.value.filter((m) => m.plan === i + 1);
    const open = sems.filter((m) => !m.locked);
    const last = rows.reduce((a, r) => (rank(r) > rank(a) ? r : a), rows[0]!);
    const count = (status: string) => open.filter((m) => m.status === status).length;
    return {
      path: i + 1,
      finishes: label(last),
      pastEnd: pastEnd(last),
      units: rows.reduce((n, r) => n + r.units, 0),
      peak: sems.length ? Math.max(...open.map((m) => m.total), 0) : null,
      leastLeft: open.length ? Math.min(...open.map((m) => m.capacity)) : null,
      fits: count("FEASIBLE"),
      tight: count("TIGHT"),
      over: count("OVER"),
      conflicts: open.reduce((n, m) => n + m.conflicts, 0),
    };
  }));

// If the paths shrink after an edit, fall back to the first one.
watch(byPlan, (plans) => {
  if (pathIndex.value >= plans.length) pathIndex.value = 0;
});

// With no path, still show what the student has chosen: their pins. Every
// path contains the pins, so this is what all paths would have in common.
const noPath = computed(() => byPlan.value.length === 0);
// With no requirements and no pins there is nothing to plan, which is not a failure.
const nothingToPlan = computed(() => !props.constraints.blocks.length && !props.constraints.pins.length);
type Cell = Season & { subject: string; slot: string; title: string; units: number; counts: string };
const plan = computed<Cell[]>(() =>
  noPath.value
    ? props.constraints.pins.map((p) => ({ ...p, slot: "", title: "", units: 0, counts: "" })) // unknown without a path
    : (byPlan.value[pathIndex.value] ?? []),
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
const subjectsIn = (s: Season) => plan.value.filter((r) => sameSeason(r, s) && !r.slot);

// ---------- Categories ----------
// What a subject counts toward in the path decides its colour. Precedence as in styles.css:
// HASS, then the major (technical blocks), then the GIRs (other listed blocks), then the rest.
const OPEN = 100; // as in Constrain: a block with more options gets slots (HASS)
type Category = "hass" | "major" | "gir" | "nontech";
const LEGEND: { cat: Category; label: string }[] = [
  { cat: "gir", label: "GIR" },
  { cat: "hass", label: "HASS" },
  { cat: "major", label: "Major" },
  { cat: "nontech", label: "Non-technical / other" },
];
const blockInfo = computed(() => {
  const info = new Map<string, { title: string; technical: boolean; listed: boolean; options: number }>();
  for (const b of props.constraints.blocks) {
    const i = info.get(b.block) ?? { title: b.title, technical: b.technical, listed: !!b.origin, options: 0 };
    i.options++;
    info.set(b.block, i);
  }
  return info;
});
const countedToward = (cell: Cell) =>
  cell.counts.split(",").filter(Boolean).map((id) => blockInfo.value.get(id)).filter((b) => b !== undefined);
function categoryOf(cell: Cell): Category {
  const blocks = countedToward(cell);
  if (cell.slot || blocks.some((b) => !b.technical && b.options > OPEN)) return "hass";
  if (blocks.some((b) => b.technical)) return "major";
  if (blocks.some((b) => b.listed)) return "gir";
  return "nontech";
}
const countsTitles = (cell: Cell) => countedToward(cell).map((b) => b.title || "Your requirement");
const summaryOf = (s: Season) => subjectsIn(s).map((c) => ({ subject: c.subject, countsToward: countsTitles(c) }));
const slotsIn = (s: Season) => plan.value.filter((r) => sameSeason(r, s) && r.slot);
const hasSlots = computed(() => plan.value.some((r) => r.slot));
// "CI-H or CI-HW · HASS-A · HASS" -> "CI-H · HASS-A": every HASS-A, -H, -S or CI-H slot is also a HASS one.
function shortTitle(title: string) {
  const parts = title.split(" · ").map((p) => (p === "CI-H or CI-HW" ? "CI-H" : p));
  return (parts.length > 1 ? parts.filter((p) => p !== "HASS") : parts).join(" · ");
}
const isLocked = (s: Season) => props.constraints.semesters.some((r) => sameSeason(r, s) && r.locked);
// A semester of the owner's history: locked, and changed only in their history.
const fromHistory = (s: Season) => props.constraints.semesters.some((r) => sameSeason(r, s) && r.fromHistory);

// The caps of a semester (0 means none; IAP is capped at 12 unless set), and the units the path takes there.
function capsOf(s: Season) {
  const row = props.constraints.semesters.find((r) => sameSeason(r, s));
  return { total: row ? row.maxUnits : s.term === "IAP" ? 12 : 0, technical: row?.maxTechnicalUnits ?? 0 };
}
const unitsIn = (s: Season) => plan.value.filter((r) => sameSeason(r, s)).reduce((n, r) => n + r.units, 0);
const overCap = (s: Season) => capsOf(s).total > 0 && unitsIn(s) > capsOf(s).total;
const fill = (s: Season) => `${Math.min(100, (100 * unitsIn(s)) / capsOf(s).total)}%`;
const isPinned = (s: Season, subject: string) =>
  props.constraints.pins.some((p) => p.subject === subject && sameSeason(p, s));

function toggle(s: Season) {
  subject.value = null;
  selected.value = selected.value && sameSeason(selected.value, s) ? null : s;
}

// A subject clicked in the grid: its catalog details, as in the Catalog, and what it counts
// toward in this path.
const subject = ref<{ subject: string; season: Season; countsToward: string[] } | null>(null);
const details = ref<HTMLElement | null>(null);
async function openSubject(s: Season, c: Cell) {
  subject.value = { subject: c.subject, season: { year: s.year, term: s.term }, countsToward: countsTitles(c) };
  await nextTick();
  details.value?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

const picking = ref<Cell | null>(null);
const busy = ref(false);

async function togglePin(s: Season, subject: string) {
  busy.value = true;
  try {
    if (isPinned(s, subject)) {
      await call("unPin", { road: props.road, subject });
      emit("changed", `Unpinned ${subject}.`);
    } else {
      await call("pin", { road: props.road, subject, year: s.year, term: s.term });
      emit("changed", `Pinned ${subject} to ${label(s)}.`);
    }
  } catch (e) {
    emit("error", message(e));
  } finally {
    busy.value = false;
  }
}

// Locking keeps the semester as the path has it: every subject in it is pinned there, then
// the semester is locked. A locked semester holds only its pins, so open slots stay empty.
async function toggleLock(s: Season) {
  const locking = !isLocked(s);
  if (locking && slotsIn(s).length &&
    !confirm(`${label(s)} has ${slotsIn(s).length} open + slot(s). Lock it without them?`)) return;
  busy.value = true;
  try {
    if (locking) {
      for (const c of subjectsIn(s)) {
        if (!isPinned(s, c.subject)) await call("pin", { road: props.road, subject: c.subject, year: s.year, term: s.term });
      }
    }
    await call("setLocked", { road: props.road, year: s.year, term: s.term, locked: locking });
    emit("changed", locking ? `Locked ${label(s)}.` : `Unlocked ${label(s)}; its subjects stay pinned.`);
  } catch (e) {
    emit("error", message(e));
  } finally {
    busy.value = false;
  }
}

function picked(subject: string) {
  const s = picking.value!;
  picking.value = null;
  emit("changed", `Pinned ${subject} to ${label(s)}.`);
}
</script>

<template>
  <main>
    <div class="titlebar">
      <h1>Possible paths</h1>
      <span class="inline">
        <button v-if="canEdit" @click="emit('edit')">Edit constraints</button>
        <button v-if="canShare" @click="emit('share')">Share</button>
        <button @click="emit('copy')">Copy to my roads</button>
      </span>
    </div>

    <ul class="legend" aria-label="Colours">
      <li v-for="l in LEGEND" :key="l.cat" :data-cat="l.cat">{{ l.label }}</li>
    </ul>

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
      <span v-else-if="noPath && judged?.binding.length" class="error">
        No path fits your free time. Showing only your pinned subjects.
      </span>
      <span v-else-if="noPath" class="error">
        No path found. Showing only your pinned subjects.
      </span>
    </nav>

    <section class="time-mode" aria-labelledby="time-mode-title">
      <h2 id="time-mode-title" class="visually-hidden">Time budget</h2>
      <fieldset v-if="time && canEdit" class="inline">
        <legend>Time budget</legend>
        <label><input type="radio" name="mode" :checked="time.mode === 'SOFT'" :disabled="busy" @change="setMode('SOFT')" /> Soft: every path, with its hours</label>
        <label><input type="radio" name="mode" :checked="time.mode === 'HARD'" :disabled="busy" @change="setMode('HARD')" /> Hard: only paths whose semesters fit</label>
        <label>
          Reserve for this road
          <select :value="time.hasBuffer ? time.buffer : ''" :disabled="busy" @change="setReserve(($event.target as HTMLSelectElement).value)">
            <option value="">Usual</option>
            <option v-for="r in RESERVES" :key="r" :value="r">{{ r }}%</option>
          </select>
        </label>
      </fieldset>
      <p v-else-if="time" class="hint">
        Time budget: {{ time.mode === "HARD" ? "hard (only paths whose semesters fit)" : "soft (every path, with its hours)" }}.
      </p>
      <fieldset v-if="time && isOwner" class="inline">
        <legend>People on this road see</legend>
        <label><input type="radio" name="share" :checked="time.shareMode === 'METRICS'" :disabled="busy" @change="setShare('METRICS')" /> Hours only</label>
        <label><input type="radio" name="share" :checked="time.shareMode === 'DETAILS'" :disabled="busy" @change="setShare('DETAILS')" /> Hours and my blocked time (categories and times)</label>
      </fieldset>
      <p v-if="judged?.mode === 'HARD' && judged.dropped && !noPath" class="hint" role="note">
        {{ judged.dropped }} path{{ judged.dropped === 1 ? "" : "s" }} left out because a semester doesn't fit the free time.
      </p>
    </section>

    <div v-if="noPath && judged?.binding.length" class="binding" role="note">
      <p><strong>Every path has a semester whose study doesn't fit the free time:</strong></p>
      <ul>
        <li v-for="b in judged.binding" :key="b.plan">
          Path {{ b.plan }}, {{ label(b) }}: study needs {{ b.outOfClass }} h, but {{ b.free }} h is free
          ({{ b.usable }} h after the reserve){{ b.status === "TIGHT" ? ": it would fit only by using the reserve" : "" }}.
        </li>
      </ul>
      <p class="hint">
        Free up time in your <a href="#week">week</a>, lower the reserve, spread the subjects over more semesters (move the
        end of the road later), or switch to soft to see the paths anyway.
      </p>
    </div>

    <div v-if="noPath && !nothingToPlan && !judged?.binding.length" class="hint">
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
        <li v-if="!includeIAPAndSummer">
          A required subject only runs in IAP or the summer (some majors have one). Tick "Use IAP and summer".
        </li>
      </ul>
    </div>
    <p v-else-if="!nothingToPlan && !canEdit" class="hint">
      You can look at every path and semester; changing the road is up to its owner and editors. To try your own
      changes, copy it to your roads.
    </p>
    <p v-else-if="!nothingToPlan" class="hint">
      Paths cover the requirements the planner can check. Requirements with very many options, such as HASS,
      are left for you: a path keeps a <strong>+</strong> card for each in some semester. Click one to choose a
      subject for it, 📌 to pin a subject where the path puts it, or Lock to keep a whole semester as it is. Requirements marked "not planned" still need room:
      set a cap on units per semester to leave space for them.
    </p>

    <section v-if="comparison.length > 1" aria-labelledby="compare-title" class="compare">
      <h2 id="compare-title">Compare paths</h2>
      <div class="table-scroll">
        <table class="compare-table">
          <thead>
            <tr>
              <th scope="col">Path</th>
              <th scope="col">Finishes</th>
              <th scope="col">Units</th>
              <th scope="col">Busiest week</th>
              <th scope="col">Least study time left</th>
              <th scope="col">Semesters</th>
              <th scope="col">Conflicts</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in comparison" :key="c.path" :class="{ picked: c.path === pathIndex + 1 }">
              <th scope="row"><button type="button" class="link" :aria-pressed="c.path === pathIndex + 1" @click="pathIndex = c.path - 1">Path {{ c.path }}</button></th>
              <td>{{ c.finishes }}<span v-if="c.pastEnd" class="hint"> (after the end)</span></td>
              <td>{{ c.units }}</td>
              <td>{{ c.peak === null ? "–" : `${c.peak} h` }}</td>
              <td>{{ c.leastLeft === null ? "–" : `${c.leastLeft} h` }}</td>
              <td>
                <span v-if="c.fits">✓ {{ c.fits }}</span>
                <span v-if="c.tight"> ⚠ {{ c.tight }}</span>
                <span v-if="c.over"> ✕ {{ c.over }}</span>
                <span v-if="!c.fits && !c.tight && !c.over">–</span>
              </td>
              <td>{{ c.conflicts || "–" }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="hint">Busiest week: the most hours of class and study in one semester. ✓ fits, ⚠ only with the reserve, ✕ over. Locked semesters aren't counted.</p>
    </section>

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
        <h3>{{ label(s) }}</h3>
        <p v-if="fromHistory(s)" class="lock hint" :title="`${label(s)} is part of ${isOwner ? 'your' : 'the owner\'s'} history`">
          🔒 {{ isOwner ? "Your history" : "History" }}
        </p>
        <button
          v-else-if="canEdit && ((!noPath && !pastEnd(s)) || isLocked(s))"
          class="lock link"
          :disabled="busy"
          :title="isLocked(s) ? `Unlock ${label(s)} (its subjects stay pinned)` : `Lock ${label(s)} as this path has it`"
          @click.stop="toggleLock(s)"
        >{{ isLocked(s) ? "🔒 Unlock" : "🔓 Lock" }}</button>
        <p v-if="pastEnd(s)" class="hint">after the end of the road</p>
        <div
          v-for="c in subjectsIn(s)"
          :key="c.subject"
          class="course"
          :data-cat="categoryOf(c)"
          :title="countsTitles(c).length ? `Counts toward ${countsTitles(c).join(', ')}` : 'Counts toward no requirement'"
        >
          <button
            type="button"
            class="course-name"
            :aria-label="`Details of ${c.subject}`"
            @click.stop="openSubject(s, c)"
          >{{ c.subject }}</button>
          <!-- A locked semester is kept whole: no pin per subject. -->
          <button
            v-if="canEdit && !isLocked(s)"
            class="pin"
            :class="{ pinned: isPinned(s, c.subject) }"
            :disabled="busy"
            :title="isPinned(s, c.subject) ? `Unpin ${c.subject}` : `Pin ${c.subject} to ${label(s)}`"
            :aria-label="isPinned(s, c.subject) ? `Unpin ${c.subject}` : `Pin ${c.subject} to ${label(s)}`"
            @click.stop="togglePin(s, c.subject)"
          >📌</button>
        </div>
        <button
          v-for="(slot, i) in isLocked(s) ? [] : slotsIn(s)"
          :key="`${slot.slot}-${i}`"
          class="course slot"
          data-cat="hass"
          :disabled="!canEdit"
          :title="canEdit ? `Choose a subject for ${slot.title}` : `Open slot for ${slot.title}`"
          :aria-label="canEdit ? `Choose a subject for ${slot.title} in ${label(s)}` : `Open slot for ${slot.title} in ${label(s)}`"
          @click.stop="picking = slot"
        >
          <span class="plus" aria-hidden="true">+</span>{{ shortTitle(slot.title) }}
        </button>
        <div
          v-if="capsOf(s).total"
          class="unit-bar"
          :class="{ over: overCap(s) }"
          :style="{ '--fill': fill(s) }"
          aria-hidden="true"
        ><span></span></div>
        <p class="units" :class="{ over: overCap(s) }">
          {{ unitsIn(s) }}{{ capsOf(s).total ? ` / ${capsOf(s).total}` : "" }} units
          <template v-if="capsOf(s).technical"> · technical max {{ capsOf(s).technical }}</template>
          <template v-if="!capsOf(s).total && !capsOf(s).technical"> · no cap</template>
        </p>
        <p
          v-if="metricsOf(s) && !isLocked(s)"
          class="sem-status"
          :data-status="metricsOf(s)!.status"
          :title="`${metricsOf(s)!.outOfClass} h of study, ${metricsOf(s)!.usable} h usable of ${metricsOf(s)!.free} h free`"
        >
          {{ STATUS[metricsOf(s)!.status] }} · {{ metricsOf(s)!.free }} h free
          <template v-if="metricsOf(s)!.conflicts"> · ⚠ {{ metricsOf(s)!.conflicts }} clash{{ metricsOf(s)!.conflicts === 1 ? "" : "es" }}</template>
        </p>
      </div>
    </div>

    <SlotPicker
      v-if="picking && canEdit"
      :road="road"
      :slot="picking"
      @close="picking = null"
      @picked="picked"
      @error="emit('error', $event)"
    />
    <p v-else-if="hasSlots && canEdit" class="hint">Click a <strong>+</strong> card to choose a subject for it.</p>

    <section id="details" ref="details">
      <template v-if="subject">
        <p>
          <button type="button" class="link" @click="subject = null">
            ← {{ selected ? `Back to ${label(selected)}` : "Close" }}
          </button>
        </p>
        <SubjectDetails :course="subject.subject" :counts-toward="subject.countsToward" :season="subject.season" />
      </template>
      <p v-else-if="!selected" class="hint">Click a subject to see its details, or a semester to see its classes.</p>
      <SemesterDetails
        v-else
        :season="selected"
        :courses="summaryOf(selected)"
        :road="road"
        :metrics="metricsOf(selected)"
        @changed="loadMetrics"
      />
    </section>
  </main>
</template>
