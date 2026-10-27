<script setup lang="ts">
// The account history, as a four-step setup that can be left and resumed: prior credit,
// the first semester, each past semester (IAP and summer too), then a review where a
// locked semester can be unlocked to correct it. Every change reaches all of the
// person's own roads; the server does that, and answers once they are up to date.
import { computed, onMounted, ref } from "vue";
import { call, message, type Output, type Term } from "../api.ts";
import { classYear, label, rank, sameSeason, type Season } from "../util.ts";
import Modal from "./Modal.vue";
import SubjectPicker from "./SubjectPicker.vue";

const emit = defineEmits<{ changed: [] }>();

type History = Output<"viewHistory">["history"];
type Step = "prior" | "start" | "past" | "review";
const STEPS: { id: Step; name: string }[] = [
  { id: "prior", name: "Credit before MIT" },
  { id: "start", name: "First semester" },
  { id: "past", name: "Past semesters" },
  { id: "review", name: "Review" },
];

const h = ref<History | null>(null);
const step = ref<Step>("prior");
const season = ref<Season | null>(null); // the past semester being answered or corrected
const error = ref("");
const note = ref("");
const busy = ref(false);
const unlocking = ref<Season | null>(null);

const start = computed<Season | null>(() => (h.value?.started ? { year: h.value.startYear, term: h.value.startTerm } : null));
// Requests take a season as just its year and term.
const only = (s: Season): Season => ({ year: s.year, term: s.term });
const subjectsOf = (s: Season) => h.value?.taken.filter((t) => sameSeason(t, s)).map((t) => t.subject) ?? [];
const stateOf = (s: Season) => h.value?.seasons.find((x) => sameSeason(x, s));
const position = computed(() => {
  if (!h.value || !season.value) return "";
  const i = h.value.seasons.findIndex((x) => sameSeason(x, season.value!));
  return `${i + 1} of ${h.value.seasons.length}`;
});
const reached = (s: Step) =>
  s === "prior" || (s === "start" && !!h.value?.priorDone) || (s !== "prior" && s !== "start" && !!h.value?.started);

/** The step to resume at: the first one not finished. */
function resumeStep(x: History): Step {
  if (!x.priorDone) return "prior";
  if (!x.started) return "start";
  return x.pending.length ? "past" : "review";
}

async function load(resume = false) {
  try {
    h.value = (await call("viewHistory", {})).history;
    if (resume) {
      step.value = resumeStep(h.value);
      season.value = h.value.pending[0] ? only(h.value.pending[0]) : null;
    }
    if (h.value.started) startForm.value = { year: h.value.startYear, term: h.value.startTerm };
  } catch (e) {
    error.value = message(e);
  }
}
onMounted(() => load(true));

/** Runs a change, shows its note and reloads. */
async function attempt(run: () => Promise<unknown>, done = "") {
  busy.value = true;
  error.value = "";
  note.value = "";
  try {
    await run();
    note.value = done;
    await load();
    emit("changed");
    return true;
  } catch (e) {
    error.value = message(e);
    return false;
  } finally {
    busy.value = false;
  }
}

// ---------- Step 1: prior credit ----------

const addPrior = (subject: string) => attempt(() => call("addPriorCredit", { subject }), `Added ${subject}.`);
const removePrior = (subject: string) => attempt(() => call("removePriorCredit", { subject }), `Removed ${subject}.`);

async function finishPrior() {
  if (await attempt(() => call("finishPriorCredit", {}))) step.value = "start";
}

// ---------- Step 2: first semester ----------

const thisYear = new Date().getFullYear();
const startForm = ref<{ year: number; term: Term }>({ year: thisYear, term: "FALL" });

async function saveStart() {
  const year = Number(startForm.value.year);
  if (!Number.isInteger(year) || year < thisYear - 15 || year > thisYear + 2) {
    error.value = `Enter the year you started, such as ${thisYear - 1}.`;
    return;
  }
  const moving = start.value && !sameSeason(start.value, { year, term: startForm.value.term });
  if (moving && h.value?.taken.length &&
    !confirm("Changing your first semester removes the semesters before it from your history. Continue?")) return;
  if (await attempt(() => call("setHistoryStart", { year, term: startForm.value.term }))) {
    season.value = h.value?.pending[0] ? only(h.value.pending[0]) : null;
    step.value = h.value?.seasons.length ? (season.value ? "past" : "review") : "review";
  }
}

// ---------- Step 3: past semesters ----------

const addTaken = (subject: string) =>
  attempt(() => call("addTaken", { ...season.value!, subject }), `Added ${subject} to ${label(season.value!)}.`);
const removeTaken = (subject: string) =>
  attempt(() => call("removeTaken", { ...season.value!, subject }), `Removed ${subject}.`);

async function lockSeason() {
  const s = season.value!;
  const nothing = subjectsOf(s).length === 0;
  if (!(await attempt(() => call("lockSeason", s), nothing ? `${label(s)}: nothing this term.` : `${label(s)} is saved and locked.`))) return;
  // On to the next semester still to answer, or to the review.
  const next = h.value?.pending.find((p) => rank(p) > rank(s)) ?? h.value?.pending[0];
  if (next) season.value = only(next);
  else step.value = "review";
}

function go(delta: number) {
  if (!h.value || !season.value) return;
  const i = h.value.seasons.findIndex((x) => sameSeason(x, season.value!));
  const next = h.value.seasons[i + delta];
  if (next) season.value = only(next);
}

// ---------- Step 4: review, unlock, correct ----------

function edit(s: Season) {
  season.value = only(s);
  step.value = "past";
}

async function confirmUnlock() {
  const s = unlocking.value!;
  unlocking.value = null;
  if (await attempt(() => call("unlockSeason", s), `${label(s)} is unlocked. Lock it again when it's right.`)) edit(s);
}

function openStep(s: Step) {
  if (!reached(s)) return;
  step.value = s;
  const first = h.value?.pending[0] ?? h.value?.seasons[0];
  if (s === "past" && !season.value && first) season.value = only(first);
}
</script>

<template>
  <main class="history">
    <h1>Your history</h1>
    <p class="hint">
      What you've already done, once for your whole account. Every road you own starts from it, and past semesters
      stay locked in your roads. You can stop at any point and come back.
    </p>

    <p v-if="!h && !error" class="hint">Loading…</p>
    <template v-if="h">
      <nav aria-label="Setup steps">
        <ol class="steps">
          <li v-for="(s, i) in STEPS" :key="s.id">
            <button
              type="button"
              class="step"
              :class="{ active: step === s.id }"
              :aria-current="step === s.id ? 'step' : undefined"
              :disabled="!reached(s.id)"
              @click="openStep(s.id)"
            >
              <span class="step-number" aria-hidden="true">{{ i + 1 }}</span> {{ s.name }}
            </button>
          </li>
        </ol>
      </nav>

      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-else-if="note" class="ok" role="status">{{ note }}</p>

      <!-- Step 1 -->
      <section v-if="step === 'prior'" aria-labelledby="prior-title">
        <h2 id="prior-title">Credit from before MIT</h2>
        <p class="hint">AP, transfer, placement and ASE credit. It counts toward prerequisites and requirements.</p>
        <ul class="chips" aria-label="Your prior credit">
          <li v-for="p in h.prior" :key="p.subject" class="chip">
            {{ p.subject }}
            <button type="button" class="link" :aria-label="`Remove ${p.subject}`" :disabled="busy" @click="removePrior(p.subject)">✕</button>
          </li>
          <li v-if="!h.prior.length" class="hint">None yet.</li>
        </ul>
        <SubjectPicker label="Add a subject" :busy="busy" @pick="addPrior" />
        <p class="actions">
          <button :disabled="busy" @click="finishPrior">{{ h.prior.length ? "Continue" : "I have no prior credit" }}</button>
        </p>
      </section>

      <!-- Step 2 -->
      <section v-else-if="step === 'start'" aria-labelledby="start-title">
        <h2 id="start-title">Your first semester at MIT</h2>
        <form class="grid narrow" @submit.prevent="saveStart">
          <label>
            Term
            <select v-model="startForm.term">
              <option value="FALL">Fall</option>
              <option value="SPRING">Spring</option>
            </select>
          </label>
          <label>Year <input v-model.number="startForm.year" type="number" inputmode="numeric" required /></label>
          <button :disabled="busy">Continue</button>
        </form>
        <p class="hint">If it's before {{ label({ year: h.currentYear, term: h.currentTerm }) }}, you'll say what you took in each semester since.</p>
      </section>

      <!-- Step 3 -->
      <section v-else-if="step === 'past'" aria-labelledby="past-title">
        <template v-if="season && stateOf(season)">
          <h2 id="past-title">
            {{ label(season) }}
            <span class="hint">· {{ classYear(start!, season) }} · {{ position }}</span>
          </h2>
          <p v-if="stateOf(season)!.locked" class="hint">
            Locked. <button type="button" class="link" @click="unlocking = only(season)">Unlock to correct it</button>
          </p>
          <p v-else-if="stateOf(season)!.answered" class="warn" role="note">Unlocked to correct it. Lock it again when it's right.</p>
          <ul class="chips" :aria-label="`Subjects in ${label(season)}`">
            <li v-for="s in subjectsOf(season)" :key="s" class="chip">
              {{ s }}
              <button
                v-if="!stateOf(season)!.locked"
                type="button"
                class="link"
                :aria-label="`Remove ${s}`"
                :disabled="busy"
                @click="removeTaken(s)"
              >✕</button>
            </li>
            <li v-if="!subjectsOf(season).length" class="hint">No subjects yet.</li>
          </ul>
          <template v-if="!stateOf(season)!.locked">
            <SubjectPicker :label="`Add a subject you took in ${label(season)}`" :busy="busy" @pick="addTaken" />
            <p class="actions">
              <button :disabled="busy" @click="lockSeason">
                {{ subjectsOf(season).length ? `Save and lock ${label(season)}` : "Nothing this term" }}
              </button>
            </p>
          </template>
          <p class="inline">
            <button type="button" class="link" :disabled="sameSeason(season, h.seasons[0])" @click="go(-1)">← Previous semester</button>
            <button type="button" class="link" :disabled="sameSeason(season, h.seasons[h.seasons.length - 1])" @click="go(1)">Next semester →</button>
          </p>
        </template>
        <p v-else class="hint">You started this semester, so there is nothing to fill in.</p>
      </section>

      <!-- Step 4 -->
      <section v-else aria-labelledby="review-title">
        <h2 id="review-title">Review</h2>
        <p v-if="h.complete" class="ok">Your history is complete.</p>
        <p v-else-if="h.pending.length" class="warn" role="note">
          {{ h.pending.length }} semester{{ h.pending.length === 1 ? "" : "s" }} still to fill in.
          <button type="button" class="link" @click="edit(h.pending[0])">Continue with {{ label(h.pending[0]) }}</button>
        </p>
        <p><strong>Before MIT:</strong> {{ h.prior.map((p) => p.subject).join(", ") || "none" }}</p>
        <p v-if="!h.seasons.length" class="hint">No past semesters: you start in {{ start ? label(start) : "the current semester" }}.</p>
        <table v-else class="history-table">
          <thead><tr><th scope="col">Semester</th><th scope="col">Subjects</th><th scope="col">State</th><th scope="col"><span class="visually-hidden">Actions</span></th></tr></thead>
          <tbody>
            <tr v-for="s in h.seasons" :key="`${s.year}-${s.term}`">
              <th scope="row">{{ label(s) }} <span class="hint">{{ classYear(start!, s) }}</span></th>
              <td>{{ subjectsOf(s).join(", ") || (s.answered ? "nothing" : "—") }}</td>
              <td>
                <span v-if="s.locked" class="badge">🔒 Locked</span>
                <span v-else-if="s.answered" class="badge muted">Unlocked</span>
                <span v-else class="badge muted">Not filled in</span>
              </td>
              <td>
                <button v-if="s.locked" type="button" class="link" :disabled="busy" @click="unlocking = only(s)">Unlock</button>
                <button v-else type="button" class="link" @click="edit(s)">{{ s.answered ? "Correct" : "Fill in" }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section v-if="h.warnings.length || h.roadWarnings.length" class="history-warnings" aria-labelledby="warnings-title">
        <h2 id="warnings-title">Worth checking</h2>
        <p class="hint">These don't stop anything: real history can predate the catalog's rules.</p>
        <ul>
          <li v-for="w in h.warnings" :key="`h-${w.year}-${w.term}-${w.subject}-${w.missing}`">
            ⚠ {{ w.subject }} in {{ label(w) }} needs {{ w.missing }} first, which isn't in your history.
          </li>
          <li v-for="w in h.roadWarnings" :key="`r-${w.road}-${w.subject}-${w.missing}`">
            ⚠ In <a :href="`#road=${w.road}`">{{ w.name }}</a>, {{ w.subject }} ({{ label(w) }}) needs {{ w.missing }}, which your history no longer has.
          </li>
        </ul>
      </section>
    </template>

    <Modal v-if="unlocking" :title="`Unlock ${label(unlocking)}?`" @close="unlocking = null">
      <p>
        You can then add or remove subjects to correct it. It stays locked in your roads, and each change reaches all of
        them right away. Lock it again when it's right.
      </p>
      <p class="actions inline">
        <button type="button" autofocus @click="confirmUnlock">Unlock</button>
        <button type="button" class="link" @click="unlocking = null">Cancel</button>
      </p>
    </Modal>
  </main>
</template>
