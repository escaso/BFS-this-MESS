<script setup lang="ts">
// The app shell: holds the current road and its data, and switches between
// the start, paths and constraints views. The road id lives in the URL
// (#road=...) so a road can be reopened or bookmarked.
import { onMounted, onUnmounted, ref } from "vue";
import { api, message, unwrap, type Constraints, type Plan } from "./api.ts";
import { MAX_PATHS } from "./util.ts";
import StartView from "./components/StartView.vue";
import PathsView from "./components/PathsView.vue";
import ConstraintsEditor from "./components/ConstraintsEditor.vue";

const road = ref("");
const view = ref<"start" | "paths" | "edit">("start");
const status = ref("");
const constraints = ref<Constraints | null>(null);
const plans = ref<Plan[]>([]);

async function load() {
  if (!road.value) return;
  try {
    const data = await unwrap(api.viewRoad({ road: road.value, limit: MAX_PATHS }));
    constraints.value = data.constraints.constraints[0] ?? null;
    plans.value = data.paths.catalogs.flatMap((c) => c.paths.paths.map((p) => p.plan));
  } catch (e) {
    status.value = `Could not load road: ${message(e)}`;
  }
}

// After an edit succeeds, show its message (if any) and reload so both views stay in sync.
async function onChanged(note = "") {
  status.value = note;
  await load();
}

function openRoad(id: string) {
  location.hash = `road=${id}`;
}

function route() {
  road.value = new URLSearchParams(location.hash.slice(1)).get("road") ?? "";
  constraints.value = null;
  plans.value = [];
  status.value = "";
  view.value = road.value ? "paths" : "start";
  load();
}

onMounted(() => {
  window.addEventListener("hashchange", route);
  route();
});
onUnmounted(() => window.removeEventListener("hashchange", route));
</script>

<template>
  <header>
    <a href="#" class="brand">BFS This Mess</a>
    <span id="roadId">{{ road ? `road ${road}` : "" }}</span>
  </header>
  <p id="status">{{ status }}</p>

  <StartView v-if="view === 'start'" @open="openRoad" @error="status = $event" />

  <PathsView
    v-else-if="view === 'paths'"
    :key="road"
    :plans="plans"
    :constraints="constraints"
    @edit="view = 'edit'"
  />

  <ConstraintsEditor
    v-else
    :key="road"
    :road="road"
    :constraints="constraints"
    @back="view = 'paths'"
    @changed="onChanged"
    @error="status = $event"
  />
</template>
