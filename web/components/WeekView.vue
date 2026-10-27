<script setup lang="ts">
// The weekly time budget: a 7-day grid of 15-minute slots where the person paints the
// time already spoken for (sleep, meals, work, practice), and the same week as a table
// of hours per category per day, as on a time-budgeting worksheet. Both read the same
// blocks. A semester can have a week of its own, a copy of the regular one.
//
// Everything works from the keyboard: arrow keys move through the grid, Space starts and
// ends a new block, and a selected block moves with the arrows, grows or shrinks with
// Shift+Up/Down, and is deleted with Delete. The form below the grid does the same.
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { call, message, type Output, type Term } from "../api.ts";
import { label, type Season } from "../util.ts";
import {
  DAYS, SHORT_DAYS, SLOTS_PER_DAY, SLOTS_PER_WEEK, describe, firstSlot, segments, textOn, timeOf, type BlockLike,
} from "../week.ts";
import Modal from "./Modal.vue";

type Setup = Output<"viewWeek">["setup"];
type Week = Output<"viewWeek">["week"];
type Block = Week["blocks"][number];
type Category = Setup["categories"][number];

const setup = ref<Setup | null>(null);
const week = ref<Week | null>(null);
const overridden = ref(false);
const season = ref<Season | null>(null); // null: the regular week
const error = ref("");
const note = ref("");
const busy = ref(false);

// ---------- Loading ----------

async function load() {
  error.value = "";
  try {
    const regular = await call("viewWeek", {});
    setup.value = regular.setup;
    if (season.value) {
      const w = (await call("viewSemesterWeek", season.value)).week;
      week.value = w;
      overridden.value = w.overridden;
    } else {
      week.value = regular.week;
      overridden.value = false;
    }
    if (!paint.value) paint.value = paintable.value[0]?.category ?? "";
  } catch (e) {
    error.value = message(e);
  }
}
onMounted(load);
watch(season, () => {
  selected.value = null;
  load();
});

async function attempt(run: () => Promise<unknown>, done = "") {
  busy.value = true;
  error.value = "";
  note.value = "";
  try {
    await run();
    note.value = done;
    await load();
    return true;
  } catch (e) {
    error.value = message(e);
    await load(); // put back what a refused drag showed
    return false;
  } finally {
    busy.value = false;
  }
}

// ---------- Semesters ----------

const TERMS: Term[] = ["IAP", "SPRING", "SUMMER", "FALL"];
/** The current semester and the next 2 years of them: past semesters need no week. */
const seasons = computed<Season[]>(() => {
  if (!setup.value) return [];
  const out: Season[] = [];
  let r = setup.value.currentYear * 4 + TERMS.indexOf(setup.value.currentTerm);
  for (let i = 0; i < 9; i++, r++) out.push({ year: Math.floor(r / 4), term: TERMS[r % 4]! });
  return out;
});
const seasonKey = (s: Season | null) => (s ? `${s.year}-${s.term}` : "");
const hasOwn = (s: Season) => !!setup.value?.overrides.some((o) => o.year === s.year && o.term === s.term);
function pickSeason(key: string) {
  season.value = seasons.value.find((s) => seasonKey(s) === key) ?? null;
}
const giveOwn = () => attempt(() => call("overrideWeek", season.value!), `${label(season.value!)} has a week of its own now: a copy of your regular week.`);
const confirmReset = ref(false);
async function reset() {
  confirmReset.value = false;
  await attempt(() => call("resetWeek", season.value!), `${label(season.value!)} uses your regular week again.`);
}
// A semester that uses the regular week shows it, but changes go to the regular week.
const editingWhat = computed(() =>
  !season.value ? "your regular week" : overridden.value ? `${label(season.value)}'s own week` : "your regular week");

// ---------- Categories ----------

const categories = computed(() => setup.value?.categories ?? []);
const paintable = computed(() => categories.value.filter((c) => !c.managed));
const own = computed(() => categories.value.filter((c) => c.own));
const byId = computed(() => new Map(categories.value.map((c) => [c.category, c])));
const nameOf = (id: string) => byId.value.get(id)?.name ?? "Deleted category";
const colorOf = (id: string) => byId.value.get(id)?.color ?? "#6b6b6b";
const paint = ref("");

const newCategory = ref({ name: "", color: "#0b7a75" });
async function addCategory() {
  const name = newCategory.value.name.trim();
  if (!name) return (error.value = "A category needs a name.");
  const ok = await attempt(async () => {
    const { category } = await call("addCategory", { name, color: newCategory.value.color });
    paint.value = category;
  }, `Added ${name}.`);
  if (ok) newCategory.value.name = "";
}
const rename = (c: Category, name: string) =>
  name.trim() && name.trim() !== c.name ? attempt(() => call("renameCategory", { category: c.category, name }), `Renamed to ${name.trim()}.`) : undefined;
const recolor = (c: Category, color: string) => attempt(() => call("recolorCategory", { category: c.category, color }));
const removing = ref<Category | null>(null);
async function removeCategory() {
  const c = removing.value!;
  removing.value = null;
  if (paint.value === c.category) paint.value = paintable.value[0]?.category ?? "";
  await attempt(() => call("deleteCategory", { category: c.category }), `Deleted ${c.name} and its blocks.`);
}

// ---------- Grid geometry ----------

const ZOOMS = [{ minutes: 15, slots: 1, px: 12 }, { minutes: 30, slots: 2, px: 8 }, { minutes: 60, slots: 4, px: 6 }] as const;
const zoom = ref<(typeof ZOOMS)[number]>(ZOOMS[1]);
const unit = computed(() => zoom.value.slots); // slots per cell
const px = computed(() => zoom.value.px); // pixels per slot
const rows = computed(() => Array.from({ length: SLOTS_PER_DAY / unit.value }, (_, i) => i * unit.value));
const scroller = ref<HTMLElement | null>(null);
watch(zoom, async () => {
  await nextTick();
  scroller.value?.scrollTo({ top: 7 * 4 * px.value });
});
onMounted(async () => {
  await nextTick();
  scroller.value?.scrollTo({ top: 7 * 4 * px.value });
});

// ---------- Painting a new block (pointer or keyboard) ----------

const cursor = ref({ day: 0, slot: 9 * 4 }); // the grid cell with focus
const anchor = ref<number | null>(null); // week slot where a new block starts
const hover = ref<number | null>(null);
let dragging = false;

const cellSlot = (day: number, slot: number) => day * SLOTS_PER_DAY + slot;
/** The new block between the anchor and the cell under the pointer or cursor, in whole cells. */
const pending = computed<BlockLike | null>(() => {
  if (anchor.value === null || hover.value === null) return null;
  const a = Math.min(anchor.value, hover.value);
  const b = Math.max(anchor.value, hover.value) + unit.value;
  return { day: Math.floor(a / SLOTS_PER_DAY), start: a % SLOTS_PER_DAY, slots: Math.min(b - a, SLOTS_PER_WEEK - 1) };
});

function startPaint(day: number, slot: number) {
  if (!paint.value || busy.value) return;
  selected.value = null;
  anchor.value = hover.value = cellSlot(day, slot);
}
async function commitPaint() {
  const b = pending.value;
  anchor.value = hover.value = null;
  if (!b || !week.value) return;
  await attempt(
    () => call("addTimeBlock", { template: week.value!.template, category: paint.value, day: b.day, start: b.start, slots: b.slots }),
    `Added ${describe(nameOf(paint.value), b)}.`,
  );
}

function onCellDown(e: PointerEvent, day: number, slot: number) {
  if (e.button !== 0) return;
  e.preventDefault();
  cursor.value = { day, slot };
  dragging = true;
  startPaint(day, slot);
}
function onCellEnter(day: number, slot: number) {
  if (dragging && anchor.value !== null) hover.value = cellSlot(day, slot);
}

function onCellKey(e: KeyboardEvent) {
  const c = cursor.value;
  const moves: Record<string, [number, number]> = { ArrowUp: [0, -unit.value], ArrowDown: [0, unit.value], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
  if (moves[e.key]) {
    e.preventDefault();
    const [dd, ds] = moves[e.key]!;
    const w = (cellSlot(c.day, c.slot) + dd * SLOTS_PER_DAY + ds + SLOTS_PER_WEEK) % SLOTS_PER_WEEK;
    cursor.value = { day: Math.floor(w / SLOTS_PER_DAY), slot: w % SLOTS_PER_DAY };
    if (anchor.value !== null) hover.value = w;
    focusCursor();
  } else if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    if (anchor.value === null) startPaint(c.day, c.slot);
    else commitPaint();
  } else if (e.key === "Escape" && anchor.value !== null) {
    e.preventDefault();
    anchor.value = hover.value = null;
  }
}
const grid = ref<HTMLElement | null>(null);
async function focusCursor() {
  await nextTick();
  grid.value?.querySelector<HTMLElement>(`[data-day="${cursor.value.day}"][data-slot="${cursor.value.slot}"]`)?.focus();
}
const isCursor = (day: number, slot: number) => cursor.value.day === day && cursor.value.slot === slot;

// ---------- Moving and resizing a block ----------

const selected = ref<string | null>(null);
const draft = ref<(BlockLike & { block: string }) | null>(null); // a block being dragged
let grab: { mode: "move" | "resize"; from: number; block: Block } | null = null;

/** The week slot under a pointer, from the grid cell there. */
function slotAt(e: PointerEvent): number | null {
  const el = document.elementsFromPoint(e.clientX, e.clientY).find((n) => (n as HTMLElement).dataset?.slot !== undefined) as HTMLElement | undefined;
  if (!el) return null;
  const day = Number(el.dataset.day);
  const top = el.getBoundingClientRect().top;
  const within = Math.floor((e.clientY - top) / px.value);
  return cellSlot(day, Number(el.dataset.slot) + Math.max(0, Math.min(unit.value - 1, within)));
}

function onBlockDown(e: PointerEvent, b: Block, mode: "move" | "resize") {
  if (e.button !== 0 || busy.value) return;
  e.preventDefault();
  e.stopPropagation();
  selected.value = b.block;
  const from = slotAt(e);
  if (from === null) return;
  grab = { mode, from, block: b };
}

function onMove(e: PointerEvent) {
  if (dragging && anchor.value !== null) {
    const s = slotAt(e);
    if (s !== null) hover.value = Math.floor(s / unit.value) * unit.value;
    return;
  }
  if (!grab) return;
  const s = slotAt(e);
  if (s === null) return;
  const b = grab.block;
  const delta = Math.round((s - grab.from) / unit.value) * unit.value;
  if (grab.mode === "move") {
    const w = (firstSlot(b) + delta + SLOTS_PER_WEEK) % SLOTS_PER_WEEK;
    draft.value = { block: b.block, day: Math.floor(w / SLOTS_PER_DAY), start: w % SLOTS_PER_DAY, slots: b.slots };
  } else {
    draft.value = { block: b.block, day: b.day, start: b.start, slots: Math.max(1, Math.min(SLOTS_PER_WEEK - 1, b.slots + delta)) };
  }
}

async function onUp() {
  if (dragging) {
    dragging = false;
    if (anchor.value !== null) await commitPaint();
  }
  if (!grab) return;
  const b = grab.block;
  const d = draft.value;
  grab = null;
  if (!d || (d.day === b.day && d.start === b.start && d.slots === b.slots)) {
    draft.value = null;
    return;
  }
  await save(b, d);
  draft.value = null;
}
// A touch that turns into scrolling cancels the pointer: drop what it had started.
function onCancel() {
  dragging = false;
  grab = null;
  anchor.value = hover.value = null;
  draft.value = null;
}
onMounted(() => {
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onCancel);
});
onUnmounted(() => {
  window.removeEventListener("pointermove", onMove);
  window.removeEventListener("pointerup", onUp);
  window.removeEventListener("pointercancel", onCancel);
});

const save = (b: Block, to: BlockLike & { category?: string }) =>
  attempt(
    () => call("setTimeBlock", { block: b.block, category: to.category ?? b.category, day: to.day, start: to.start, slots: to.slots }),
    `Now ${describe(nameOf(to.category ?? b.category), to)}.`,
  );
const removeBlock = (b: Block) => attempt(() => call("removeTimeBlock", { block: b.block }), `Removed ${describe(nameOf(b.category), b)}.`);

function onBlockKey(e: KeyboardEvent, b: Block) {
  const step = unit.value;
  let to: BlockLike | null = null;
  const w = firstSlot(b);
  const at = (slot: number) => ({ day: Math.floor(((slot % SLOTS_PER_WEEK) + SLOTS_PER_WEEK) % SLOTS_PER_WEEK / SLOTS_PER_DAY), start: ((slot % SLOTS_PER_DAY) + SLOTS_PER_DAY) % SLOTS_PER_DAY });
  if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    removeBlock(b);
    return;
  }
  if (e.shiftKey && e.key === "ArrowDown") to = { day: b.day, start: b.start, slots: Math.min(SLOTS_PER_WEEK - 1, b.slots + step) };
  else if (e.shiftKey && e.key === "ArrowUp") to = { day: b.day, start: b.start, slots: Math.max(1, b.slots - step) };
  else if (e.key === "ArrowDown") to = { ...at(w + step), slots: b.slots };
  else if (e.key === "ArrowUp") to = { ...at(w - step), slots: b.slots };
  else if (e.key === "ArrowRight") to = { ...at(w + SLOTS_PER_DAY), slots: b.slots };
  else if (e.key === "ArrowLeft") to = { ...at(w - SLOTS_PER_DAY), slots: b.slots };
  else if (e.key === "Escape") {
    selected.value = null;
    return;
  }
  if (!to) return;
  e.preventDefault();
  save(b, to).then(async () => {
    await nextTick();
    grid.value?.querySelector<HTMLElement>(`[data-block="${b.block}"]`)?.focus();
  });
}

/** What is drawn: each block (or its draft while dragged), split at midnight. */
const drawn = computed(() =>
  (week.value?.blocks ?? []).flatMap((b) => {
    const shown = draft.value?.block === b.block ? draft.value : b;
    return segments(shown).map((seg) => ({ b, seg }));
  }));

// ---------- The form for the selected block ----------

const current = computed(() => week.value?.blocks.find((b) => b.block === selected.value) ?? null);
const form = ref({ category: "", day: 0, start: 0, end: 0 });
watch(current, (b) => {
  if (!b) return;
  const end = (b.start + b.slots) % SLOTS_PER_DAY;
  form.value = { category: b.category, day: b.day, start: b.start, end };
}, { immediate: true });
const times = Array.from({ length: SLOTS_PER_DAY }, (_, i) => i);
/** The form's length: an end at or before the start is the next day. */
const formSlots = computed(() => {
  const n = form.value.end - form.value.start;
  return n > 0 ? n : n + SLOTS_PER_DAY;
});
const saveForm = () =>
  current.value && save(current.value, { category: form.value.category, day: form.value.day, start: form.value.start, slots: formSlots.value });

// ---------- The worksheet table ----------

const table = computed(() => {
  const roll = week.value?.rollup ?? [];
  const ids = [...new Set(roll.map((r) => r.category))];
  const rowsOf = ids.map((id) => {
    const days = Array<number>(7).fill(0);
    for (const r of roll) if (r.category === id) days[r.day] = r.hours;
    return { id, name: nameOf(id), color: colorOf(id), days, total: days.reduce((a, b) => a + b, 0) };
  });
  const blockedDays = Array.from({ length: 7 }, (_, d) => rowsOf.reduce((n, r) => n + r.days[d]!, 0));
  return { rows: rowsOf, blockedDays, freeDays: blockedDays.map((h) => 24 - h) };
});
const fmt = (h: number) => (Number.isInteger(h) ? String(h) : h.toFixed(2).replace(/0$/, ""));

// ---------- Study settings ----------

const settings = ref<{ buffer: number; factor: number } | null>(null);
onMounted(async () => {
  try {
    const s = (await call("viewStudySettings", {})).settings;
    settings.value = { buffer: s.buffer, factor: s.factor };
  } catch {
    // The settings form just doesn't show.
  }
});
const saveReserve = (buffer: number) => attempt(() => call("setReserve", { buffer }), `You keep ${buffer}% of your free time in reserve.`);
const saveFactor = (factor: number) => attempt(() => call("setStudyFactor", { factor }), `Study hours per class hour: ${factor}.`);
</script>

<template>
  <main class="week-view">
    <h1>Your week</h1>
    <p class="hint">
      Paint the time that's already spoken for. What's left is free, and your classes and studying come out of it.
      Every week has 168 hours.
    </p>

    <div class="week-toolbar">
      <label>
        Week
        <select :value="seasonKey(season)" @change="pickSeason(($event.target as HTMLSelectElement).value)">
          <option value="">Regular week</option>
          <option v-for="s in seasons" :key="seasonKey(s)" :value="seasonKey(s)">
            {{ label(s) }}{{ hasOwn(s) ? " (its own week)" : "" }}
          </option>
        </select>
      </label>
      <fieldset class="zoom">
        <legend>Rows of</legend>
        <label v-for="z in ZOOMS" :key="z.minutes">
          <input v-model="zoom" type="radio" name="zoom" :value="z" /> {{ z.minutes }} min
        </label>
      </fieldset>
    </div>

    <p v-if="season && !overridden" class="history-nudge" role="note">
      {{ label(season) }} uses your regular week, so changes here change it for every semester that does.
      <button type="button" class="link" :disabled="busy" @click="giveOwn">Give {{ label(season) }} a week of its own</button>
    </p>
    <p v-else-if="season" class="access-banner editing" role="note">
      <strong>{{ label(season) }} has a week of its own.</strong>
      <button type="button" class="link" :disabled="busy" @click="confirmReset = true">Reset to your regular week</button>
    </p>

    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-else class="ok" role="status" aria-live="polite">{{ note }}</p>

    <fieldset v-if="setup" class="palette">
      <legend>Paint with</legend>
      <label v-for="c in paintable" :key="c.category" class="swatch-option">
        <input v-model="paint" type="radio" name="paint" :value="c.category" />
        <span class="swatch" :style="{ background: c.color }" aria-hidden="true" />
        {{ c.name }}
      </label>
      <p class="hint">In class isn't painted: it comes from the classes of a plan.</p>
    </fieldset>

    <p v-if="!week && !error" class="hint">Loading…</p>
    <div v-if="week" ref="scroller" class="week-scroll">
      <div
        ref="grid"
        class="week-grid"
        role="grid"
        :aria-label="`${editingWhat}: arrow keys move, Space starts and ends a new block`"
        :style="{ '--slot': `${px}px` }"
      >
        <div class="week-head" role="row">
          <span class="time-col" role="columnheader"><span class="visually-hidden">Time</span></span>
          <span v-for="(d, i) in SHORT_DAYS" :key="d" role="columnheader" :aria-label="DAYS[i]">{{ d }}</span>
        </div>
        <div class="week-body">
          <div class="time-col" aria-hidden="true">
            <span v-for="h in 24" :key="h" class="hour-label" :style="{ top: `${(h - 1) * 4 * px}px` }">{{ timeOf((h - 1) * 4) }}</span>
          </div>
          <div v-for="(d, day) in DAYS" :key="d" class="day-col" role="rowgroup" :style="{ height: `${SLOTS_PER_DAY * px}px` }">
            <button
              v-for="slot in rows"
              :key="slot"
              type="button"
              class="cell"
              role="gridcell"
              :class="{ hour: slot % 4 === 0, cursor: isCursor(day, slot) }"
              :tabindex="isCursor(day, slot) ? 0 : -1"
              :data-day="day"
              :data-slot="slot"
              :aria-label="`${d} ${timeOf(slot)}`"
              :style="{ height: `${unit * px}px` }"
              @pointerdown="onCellDown($event, day, slot)"
              @pointerenter="onCellEnter(day, slot)"
              @focus="cursor = { day, slot }"
              @keydown="onCellKey"
            />
            <template v-for="{ b, seg } in drawn.filter((x) => x.seg.day === day)" :key="`${b.block}-${seg.day}`">
              <button
                type="button"
                class="tblock"
                :class="{ selected: selected === b.block, continues: !seg.last, continued: !seg.first }"
                :data-block="seg.first ? b.block : undefined"
                :tabindex="seg.first ? 0 : -1"
                :aria-label="describe(nameOf(b.category), b)"
                :aria-pressed="selected === b.block"
                :style="{ top: `${seg.start * px}px`, height: `${seg.slots * px}px`, background: colorOf(b.category), color: textOn(colorOf(b.category)) }"
                @pointerdown="onBlockDown($event, b, 'move')"
                @click="selected = b.block"
                @keydown="onBlockKey($event, b)"
              >
                <span v-if="seg.first && seg.slots * px >= 14" class="tblock-name">{{ nameOf(b.category) }}</span>
                <span v-if="seg.first && seg.slots * px >= 28" class="tblock-time">{{ timeOf(b.start) }}</span>
                <span
                  v-if="seg.last"
                  class="tblock-handle"
                  aria-hidden="true"
                  @pointerdown="onBlockDown($event, b, 'resize')"
                />
              </button>
            </template>
            <template v-if="pending">
              <div
                v-for="seg in segments(pending).filter((s) => s.day === day)"
                :key="`pending-${seg.day}`"
                class="tblock pending"
                aria-hidden="true"
                :style="{ top: `${seg.start * px}px`, height: `${seg.slots * px}px`, borderColor: colorOf(paint) }"
              />
            </template>
          </div>
        </div>
      </div>
    </div>
    <p v-if="pending" class="hint" aria-live="polite">New block: {{ describe(nameOf(paint), pending) }}. Press Space to add it, Escape to cancel.</p>

    <section v-if="current" class="block-form" aria-labelledby="block-form-title">
      <h2 id="block-form-title">{{ describe(nameOf(current.category), current) }}</h2>
      <form class="inline" @submit.prevent="saveForm">
        <label>
          Category
          <select v-model="form.category">
            <option v-for="c in paintable" :key="c.category" :value="c.category">{{ c.name }}</option>
          </select>
        </label>
        <label>
          Day
          <select v-model.number="form.day">
            <option v-for="(d, i) in DAYS" :key="d" :value="i">{{ d }}</option>
          </select>
        </label>
        <label>
          From
          <select v-model.number="form.start">
            <option v-for="t in times" :key="t" :value="t">{{ timeOf(t) }}</option>
          </select>
        </label>
        <label>
          To
          <select v-model.number="form.end">
            <option v-for="t in times" :key="t" :value="t">{{ timeOf(t) }}{{ t <= form.start ? " (next day)" : "" }}</option>
          </select>
        </label>
        <button :disabled="busy">Save</button>
        <button type="button" class="link" :disabled="busy" @click="removeBlock(current)">Delete</button>
        <button type="button" class="link" @click="selected = null">Close</button>
      </form>
      <p class="hint">Selected block: arrow keys move it, Shift+Up and Shift+Down shorten or lengthen it, Delete removes it.</p>
    </section>

    <section v-if="week" aria-labelledby="table-title">
      <h2 id="table-title">Hours each week</h2>
      <div class="table-scroll">
        <table class="rollup">
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th v-for="(d, i) in SHORT_DAYS" :key="d" scope="col" :aria-label="DAYS[i]">{{ d }}</th>
              <th scope="col">Week</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in table.rows" :key="r.id">
              <th scope="row"><span class="swatch" :style="{ background: r.color }" aria-hidden="true" /> {{ r.name }}</th>
              <td v-for="(h, i) in r.days" :key="i">{{ h ? fmt(h) : "–" }}</td>
              <td><strong>{{ fmt(r.total) }}</strong></td>
            </tr>
            <tr class="muted-row">
              <th scope="row"><span class="swatch" :style="{ background: colorOf('system:class') }" aria-hidden="true" /> In class</th>
              <td colspan="7" class="hint">from the classes of a plan (see a plan's semesters)</td>
              <td>–</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Blocked</th>
              <td v-for="(h, i) in table.blockedDays" :key="i">{{ fmt(h) }}</td>
              <td><strong>{{ fmt(week.blocked) }}</strong></td>
            </tr>
            <tr>
              <th scope="row">Free</th>
              <td v-for="(h, i) in table.freeDays" :key="i">{{ fmt(h) }}</td>
              <td><strong>{{ fmt(week.free) }}</strong></td>
            </tr>
            <tr>
              <th scope="row">Total</th>
              <td v-for="d in 7" :key="d">24</td>
              <td><strong>168</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p>
        <strong>Time left for classes and study: {{ fmt(week.free) }} h</strong>
        <span class="hint"> = 168 h − {{ fmt(week.blocked) }} h blocked</span>
      </p>
    </section>

    <section v-if="settings" aria-labelledby="study-title">
      <h2 id="study-title">Study settings</h2>
      <form class="inline factor-form" @submit.prevent>
        <label>
          Keep in reserve (% of free time)
          <input
            type="number" min="0" max="50" step="5" :value="settings.buffer" :disabled="busy"
            @change="saveReserve(Number(($event.target as HTMLInputElement).value))"
          />
        </label>
        <label>
          Study hours per class hour, when the catalog doesn't say
          <select :value="settings.factor" :disabled="busy" @change="saveFactor(Number(($event.target as HTMLSelectElement).value))">
            <option v-for="f in [2, 2.25, 2.5, 2.75, 3]" :key="f" :value="f">{{ f }}</option>
          </select>
        </label>
      </form>
      <p class="hint">The reserve leaves room for midterms, finals and weeks that go wrong.</p>
    </section>

    <section v-if="setup" aria-labelledby="categories-title">
      <h2 id="categories-title">Your categories</h2>
      <ul class="own-categories">
        <li v-for="c in own" :key="c.category">
          <input type="color" :value="c.color" :aria-label="`Colour of ${c.name}`" @change="recolor(c, ($event.target as HTMLInputElement).value)" />
          <input :value="c.name" :aria-label="`Name of ${c.name}`" @change="rename(c, ($event.target as HTMLInputElement).value)" />
          <button type="button" class="link" :disabled="busy" @click="removing = c">Delete</button>
        </li>
        <li v-if="!own.length" class="hint">None yet. The worksheet's categories are always there.</li>
      </ul>
      <form class="inline" @submit.prevent="addCategory">
        <label>New category <input v-model="newCategory.name" placeholder="e.g. Crew practice" /></label>
        <label>Colour <input v-model="newCategory.color" type="color" /></label>
        <button :disabled="busy">Add</button>
      </form>
    </section>

    <Modal v-if="confirmReset && season" :title="`Reset ${label(season)}?`" @close="confirmReset = false">
      <p>Its own week is deleted, and it uses your regular week again.</p>
      <p class="actions inline">
        <button type="button" autofocus @click="reset">Reset</button>
        <button type="button" class="link" @click="confirmReset = false">Cancel</button>
      </p>
    </Modal>
    <Modal v-if="removing" :title="`Delete ${removing.name}?`" @close="removing = null">
      <p>Its blocks are deleted from all your weeks.</p>
      <p class="actions inline">
        <button type="button" autofocus @click="removeCategory">Delete</button>
        <button type="button" class="link" @click="removing = null">Cancel</button>
      </p>
    </Modal>
  </main>
</template>
