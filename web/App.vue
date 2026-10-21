<script setup lang="ts">
// The app shell. Signed out, it shows the login screen. Signed in, it holds the
// current road and switches between the start, catalog, paths and constraints
// views. The road id lives in the URL (#road=...) so a road can be reopened or
// bookmarked; every edit reloads the road, so the views stay in sync without a
// page refresh.
import { onMounted, onUnmounted, ref, watch } from "vue";
import { ApiError, call, message, type Constraints, type PlanRow, type Requirements } from "./api.ts";
import { loadMajors, majorLabel } from "./majors.ts";
import { session, signOut, username } from "./session.ts";
import { MAX_PATHS } from "./util.ts";
import AuthView from "./components/AuthView.vue";
import StartView from "./components/StartView.vue";
import CatalogView from "./components/CatalogView.vue";
import PathsView from "./components/PathsView.vue";
import ConstraintsEditor from "./components/ConstraintsEditor.vue";

const road = ref("");
const view = ref<"start" | "catalog" | "paths" | "edit">("start");
const status = ref<{ text: string; kind: "ok" | "error" }>({ text: "", kind: "ok" });
const constraints = ref<Constraints | null>(null);
const requirements = ref<Requirements | null>(null);
const plans = ref<PlanRow[]>([]);
const includeIAPAndSummer = ref(false);
const loading = ref(false);

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
    constraints.value = data.constraints;
    requirements.value = data.requirements;
    plans.value = data.paths.plans;
  } catch (e) {
    say(message(e), "error");
    // A road that does not exist, or that this person may not view: go back to the start.
    if (e instanceof ApiError && e.category === "NOT_FOUND") location.hash = "";
  } finally {
    loading.value = false;
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

function route() {
  road.value = new URLSearchParams(location.hash.slice(1)).get("road") ?? "";
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
  } else if (!now && before && !status.value.text) {
    say("Your session has ended. Please log in again.", "error");
  }
});

onMounted(() => {
  // Majors are shown by name everywhere; a failure only leaves the ids showing.
  loadMajors().catch(() => {});
  window.addEventListener("hashchange", route);
  route();
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
      </nav>
      <span class="spacer" />
      <span>{{ username }}</span>
      <button @click="logOut">Log out</button>
    </template>
  </header>
  <p id="status" :class="status.kind" role="status">{{ status.text }}</p>

  <AuthView v-if="!session" />

  <template v-else>
    <CatalogView v-if="view === 'catalog'" />

    <StartView v-else-if="view === 'start'" @open="openRoad" />

    <p v-else-if="!constraints" class="hint padded">{{ loading ? "Loading road…" : "" }}</p>

    <template v-else>
      <p class="road-summary">
        <strong>{{ constraints.name }}</strong> · {{ majorLabel(constraints.major) }} ·
        {{ constraints.startTerm.toLowerCase() }} {{ constraints.startYear }} to
        {{ constraints.endTerm.toLowerCase() }} {{ constraints.endYear }}
        <span v-if="loading" class="hint">· updating…</span>
      </p>

      <PathsView
        v-if="view === 'paths'"
        v-model:include-i-a-p-and-summer="includeIAPAndSummer"
        :key="road"
        :constraints="constraints"
        :plans="plans"
        @edit="view = 'edit'"
      />

      <ConstraintsEditor
        v-else
        :key="road"
        :road="road"
        :constraints="constraints"
        :requirements="requirements"
        @back="view = 'paths'"
        @changed="onChanged"
        @error="say($event, 'error')"
      />
    </template>
  </template>
</template>
