<script setup lang="ts">
// Your roads (owned, and shared with you) to reopen by name, and a form to
// make a new road. Until the history is complete, a nudge leads to it.
import { onMounted, ref } from "vue";
import { call, message, type Output, type Term } from "../api.ts";
import { loadMajors, majorLabel, majors } from "../majors.ts";

defineProps<{ historyIncomplete?: boolean }>();
const emit = defineEmits<{ open: [road: string] }>();

type Roads = Output<"myRoads">["roads"];
const roads = ref<Roads | null>(null);
// The owner's username only comes for roads the person may know it of.
const sharedBy = (road: string) => roads.value?.sharedBy.find((s) => s.road === road)?.username ?? "";
const listError = ref("");

onMounted(async () => {
  loadMajors().catch((e) => (error.value = message(e)));
  try {
    roads.value = (await call("myRoads", {})).roads;
  } catch (e) {
    listError.value = message(e);
  }
});

const form = ref({ name: "", major: "", startYear: new Date().getFullYear(), startTerm: "FALL" as Term });
const error = ref("");
const busy = ref(false);

async function createRoad() {
  const name = form.value.name.trim();
  const major = form.value.major;
  const startYear = Number(form.value.startYear);
  if (!name || !major) {
    error.value = "A road needs a name and a major from the list.";
    return;
  }
  if (!Number.isInteger(startYear) || startYear < 1900 || startYear > 2200) {
    error.value = "The start year must be a year, such as 2026.";
    return;
  }
  error.value = "";
  busy.value = true;
  try {
    const { road } = await call("newRoad", { name, major, startYear, startTerm: form.value.startTerm });
    emit("open", road);
  } catch (e) {
    error.value = message(e);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <main>
    <h1>Your roads</h1>
    <p v-if="historyIncomplete" class="history-nudge" role="note">
      <strong>Finish your history.</strong> Add your credit from before MIT and what you took each past semester, so
      every road starts from it, locked. <a href="#history">Continue setting it up</a>
    </p>
    <p v-if="listError" class="error" role="alert">{{ listError }}</p>
    <p v-else-if="!roads" class="hint">Loading…</p>
    <template v-else>
      <ul>
        <li v-for="r in roads.owned" :key="r.road">
          <a :href="`#road=${r.road}`" @click.prevent="emit('open', r.road)">{{ r.name }}</a>
          <span class="hint"> · {{ majorLabel(r.major) }}</span>
        </li>
        <li v-if="!roads.owned.length" class="hint">You have no roads yet. Create one below.</li>
      </ul>
      <template v-if="roads.shared.length">
        <h2>Shared with you</h2>
        <ul>
          <li v-for="r in roads.shared" :key="r.road">
            <a :href="`#road=${r.road}`" @click.prevent="emit('open', r.road)">{{ r.name }}</a>
            <span class="hint">
              · {{ majorLabel(r.major) }} · {{ r.role === "EDIT" ? "can edit" : "view only" }}
              <template v-if="sharedBy(r.road)"> · Shared by {{ sharedBy(r.road) }}</template>
            </span>
          </li>
        </ul>
      </template>
    </template>

    <h2>New road</h2>
    <form class="grid" @submit.prevent="createRoad">
      <label>Name <input v-model="form.name" placeholder="My 6-3 road" required /></label>
      <label>
        Major
        <select v-model="form.major" required>
          <option value="" disabled>{{ majors.length ? "Pick your major" : "Loading majors…" }}</option>
          <option v-for="m in majors" :key="m.list" :value="m.list">{{ majorLabel(m.list, true) }}</option>
        </select>
      </label>
      <label>
        First semester
        <span class="inline">
          <select v-model="form.startTerm">
            <option value="FALL">Fall</option>
            <option value="SPRING">Spring</option>
          </select>
          <input v-model.number="form.startYear" type="number" min="1900" max="2200" required />
        </span>
      </label>
      <button :disabled="busy">{{ busy ? "Creating…" : "Create road" }}</button>
    </form>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p class="hint">
      The major's requirements and the General Institute Requirements are added for you; you can pick a track
      and add requirements of your own afterwards.
    </p>
  </main>
</template>
