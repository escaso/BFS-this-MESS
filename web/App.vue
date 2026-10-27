<script setup lang="ts">
// The app shell. Signed out, it shows the login screen. Signed in, it holds the
// current road and switches between the start, catalog, paths and constraints
// views. The road id lives in the URL (#road=...) so a road can be reopened or
// bookmarked; every edit reloads the road, so the views stay in sync without a
// page refresh. A share link (#join=<token>) adds the person to its road and opens it;
// opened while signed out, it waits until they sign in. A new account starts with the
// history setup (#history); one whose history is unfinished is nudged to finish it.
import { onMounted, onUnmounted, ref, watch } from "vue";
import { ApiError, call, message, type Constraints, type PlanRow, type Requirements } from "./api.ts";
import { canEdit, isOwner, role, setAccess, sharedBy } from "./access.ts";
import { loadMajors, majorLabel } from "./majors.ts";
import { hasPendingJoin, keepPendingJoin, session, signOut, takePendingJoin, username } from "./session.ts";
import { MAX_PATHS } from "./util.ts";
import AuthView from "./components/AuthView.vue";
import StartView from "./components/StartView.vue";
import CatalogView from "./components/CatalogView.vue";
import PathsView from "./components/PathsView.vue";
import ConstraintsEditor from "./components/ConstraintsEditor.vue";
import ShareDialog from "./components/ShareDialog.vue";
import CopyDialog from "./components/CopyDialog.vue";
import HistoryView from "./components/HistoryView.vue";
import WeekView from "./components/WeekView.vue";

const road = ref("");
const view = ref<"start" | "catalog" | "paths" | "edit" | "history" | "week">("start");
const status = ref<{ text: string; kind: "ok" | "error" }>({ text: "", kind: "ok" });
const constraints = ref<Constraints | null>(null);
const requirements = ref<Requirements | null>(null);
const plans = ref<PlanRow[]>([]);
const includeIAPAndSummer = ref(false);
const loading = ref(false);
const dialog = ref<"share" | "copy" | null>(null);
const joinPending = ref(hasPendingJoin());
// Whether the signed-in person's history is complete; null until known.
const historyComplete = ref<boolean | null>(null);

/** Reads how far the history is; a brand-new account is taken to the setup. */
async function checkHistory(openIfNew = false) {
  try {
    const h = (await call("viewHistory", {})).history;
    historyComplete.value = h.complete;
    const untouched = !h.started && !h.priorDone && !h.prior.length;
    if (openIfNew && untouched && !road.value) location.hash = "history";
  } catch {
    historyComplete.value = null; // the nudge just doesn't show
  }
}

const say = (text: string, kind: "ok" | "error" = "ok") => (status.value = { text, kind });

async function load() {
  if (!road.value || !session.value) return;
  loading.value = true;
  try {
    const data = await call("viewRoad", {
      road: road.value,
      includeIAPAndSummer: includeIAPAndSummer.value,
      limit: MAX_PATHS,
    });
    setAccess(data.access);
    constraints.value = data.constraints;
    requirements.value = data.requirements;
    plans.value = data.paths.plans;
    // Only the owner and editors may list a road's blocks again; viewers see it as it is.
    if (canEdit.value && stale(data.constraints, data.requirements) && refreshed !== road.value) {
      refreshed = road.value;
      await refresh();
    }
  } catch (e) {
    say(message(e), "error");
    // A road that does not exist, or that this person may not view: go back to the start.
    if (e instanceof ApiError && e.category === "NOT_FOUND") location.hash = "";
  } finally {
    loading.value = false;
  }
}

// A road keeps the blocks it was listed with; after the degree charts are loaded again
// (a new catalog), its listed blocks no longer match the active requirements.
let refreshed = "";
function stale(c: Constraints, r: Requirements) {
  const active = new Set([...r.items, ...r.girs].filter((i) => i.active && i.kind === "BLOCK").map((i) => i.item));
  const listed = new Set(c.blocks.map((b) => b.origin).filter(Boolean));
  return active.size !== listed.size || [...active].some((i) => !listed.has(i));
}

// Lists the road's blocks again, once per road (owner and editors only).
async function refresh() {
  try {
    await call("refreshRequirements", { road: road.value });
    say("Updated this road to the latest degree requirements.");
    await load();
  } catch {
    // The request failed: the road still shows as it is.
  }
}

// After an edit succeeds, show its note and reload so both views stay in sync.
async function onChanged(note = "") {
  say(note);
  await load();
}

function openRoad(id: string) {
  location.hash = `road=${id}`;
}

function goStart() {
  if (location.hash) location.hash = "";
  else route();
}

// Opens the road of a share link. The token leaves the address bar at once, so it is
// not kept in history or shared by accident; it only goes to the server in a request body.
async function join(token: string) {
  try {
    const { road: joined } = await call("joinLink", { token });
    say("You've joined this road through a shared link.");
    location.hash = `road=${joined}`;
  } catch (e) {
    say(message(e), "error");
    location.hash = "";
  }
}

function route() {
  const params = new URLSearchParams(location.hash.slice(1));
  const token = params.get("join");
  if (token) {
    history.replaceState(null, "", location.pathname + location.search);
    if (!session.value) {
      keepPendingJoin(token);
      joinPending.value = true;
      say("");
      return;
    }
    return void join(token);
  }
  if (session.value && hasPendingJoin()) {
    joinPending.value = false;
    return void join(takePendingJoin());
  }
  road.value = params.get("road") ?? "";
  for (const page of ["history", "week"] as const) {
    if (!params.has(page)) continue;
    road.value = "";
    setAccess(null);
    dialog.value = null;
    view.value = page;
    return;
  }
  setAccess(null);
  dialog.value = null;
  constraints.value = null;
  requirements.value = null;
  plans.value = [];
  view.value = road.value ? "paths" : "start";
  load();
}

async function logOut() {
  try {
    await call("logOut", {});
  } catch {
    // The session may already be gone; sign out locally either way.
  }
  signOut();
  say("Logged out.");
}

watch(includeIAPAndSummer, load);

// Signing in (or being signed out) changes everything that is shown.
watch(session, (now, before) => {
  if (now && !before) {
    say("");
    route();
    checkHistory(true);
  } else if (!now && before && !status.value.text) {
    say("Your session has ended. Please log in again.", "error");
  }
});

onMounted(() => {
  // Majors are shown by name everywhere; a failure only leaves the ids showing.
  loadMajors().catch(() => {});
  window.addEventListener("hashchange", route);
  route();
  if (session.value) checkHistory(true);
});
onUnmounted(() => window.removeEventListener("hashchange", route));
</script>

<template>
  <header>
    <a href="#" class="brand" @click.prevent="goStart">BFS This Mess</a>
    <template v-if="session">
      <nav class="inline">
        <button class="link light" @click="goStart">Roads</button>
        <button class="link light" @click="view = 'catalog'">Catalog</button>
        <a class="link light" href="#history">History</a>
        <a class="link light" href="#week">Week</a>
      </nav>
      <span class="spacer" />
      <span>{{ username }}</span>
      <button @click="logOut">Log out</button>
    </template>
  </header>
  <p id="status" :class="status.kind" role="status">{{ status.text }}</p>

  <AuthView v-if="!session" :note="joinPending ? 'Log in to open the shared road.' : ''" />

  <template v-else>
    <CatalogView v-if="view === 'catalog'" />

    <HistoryView v-else-if="view === 'history'" @changed="checkHistory()" />

    <WeekView v-else-if="view === 'week'" />

    <StartView v-else-if="view === 'start'" :history-incomplete="historyComplete === false" @open="openRoad" />

    <p v-else-if="!constraints" class="hint padded">{{ loading ? "Loading road…" : "" }}</p>

    <template v-else>
      <p class="road-summary">
        <strong>{{ constraints.name }}</strong> · {{ majorLabel(constraints.major) }} ·
        {{ constraints.startTerm.toLowerCase() }} {{ constraints.startYear }} to
        {{ constraints.endTerm.toLowerCase() }} {{ constraints.endYear }}
        <span v-if="loading" class="hint">· updating…</span>
      </p>
      <p v-if="role && !isOwner" class="access-banner" :class="{ editing: canEdit }" role="note">
        <strong>{{ canEdit ? "You can edit this road" : "View only" }}</strong>
        <template v-if="sharedBy"> · Shared by {{ sharedBy }}</template>
      </p>

      <PathsView
        v-if="view === 'paths'"
        v-model:include-i-a-p-and-summer="includeIAPAndSummer"
        :key="road"
        :road="road"
        :constraints="constraints"
        :plans="plans"
        @edit="view = 'edit'"
        @share="dialog = 'share'"
        @copy="dialog = 'copy'"
        @changed="onChanged"
        @error="say($event, 'error')"
      />

      <ConstraintsEditor
        v-else-if="canEdit"
        :key="road"
        :road="road"
        :constraints="constraints"
        :requirements="requirements"
        @back="view = 'paths'"
        @changed="onChanged"
        @error="say($event, 'error')"
      />

      <ShareDialog v-if="dialog === 'share' && canEdit" :road="road" :is-owner="isOwner" @close="dialog = null" @changed="load" />
      <CopyDialog
        v-if="dialog === 'copy'"
        :road="road"
        :name="constraints.name"
        @close="dialog = null"
        @copied="(copy, name) => { dialog = null; say(`Copied to your roads as ${name}.`); openRoad(copy); }"
      />
    </template>
  </template>
</template>
