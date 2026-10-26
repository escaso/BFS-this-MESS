<script setup lang="ts">
// The subjects that could fill an open slot of a path (such as a HASS subject) in its
// semester, narrowed by a topic the student types. Picking one pins it there.
import { onMounted, ref, watch } from "vue";
import { call, message, type Output } from "../api.ts";
import { label, type Season } from "../util.ts";

const props = defineProps<{ road: string; slot: Season & { slot: string; title: string } }>();
const emit = defineEmits<{ close: []; picked: [subject: string]; error: [message: string] }>();

type Row = Output<"viewSlotOptions">["subjects"]["subjects"][number];

const topic = ref("");
const rows = ref<Row[]>([]);
const loading = ref(false);
const pinning = ref("");
let token = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

async function search() {
  const mine = ++token;
  loading.value = true;
  try {
    const { subjects } = await call("viewSlotOptions", {
      road: props.road,
      blocks: props.slot.slot,
      year: props.slot.year,
      term: props.slot.term,
      topic: topic.value.trim(),
    });
    if (mine === token) rows.value = subjects.subjects;
  } catch (e) {
    emit("error", message(e));
  } finally {
    if (mine === token) loading.value = false;
  }
}

// Wait for a pause in typing before asking again.
watch(topic, () => {
  clearTimeout(timer);
  timer = setTimeout(search, 300);
});
watch(() => props.slot, search);
onMounted(search);

async function pick(subject: string) {
  pinning.value = subject;
  try {
    await call("pin", { road: props.road, subject, year: props.slot.year, term: props.slot.term });
    emit("picked", subject);
  } catch (e) {
    emit("error", message(e));
  } finally {
    pinning.value = "";
  }
}
</script>

<template>
  <section class="slot-picker">
    <div class="titlebar">
      <h2>{{ slot.title }} · {{ label(slot) }}</h2>
      <button @click="emit('close')">Close</button>
    </div>
    <p class="hint">
      Subjects that meet this requirement and can be taken this semester: they run then, their
      prerequisites are already pinned or prior credit, and they fit your caps. Pick one to pin it.
    </p>
    <label>
      Topics you are interested in
      <input v-model="topic" type="search" placeholder="e.g. music, economics, film" />
    </label>
    <p v-if="loading" class="hint">Searching…</p>
    <p v-else-if="!rows.length" class="hint">
      No subject fits{{ topic.trim() ? ` with “${topic.trim()}” in its title or description` : "" }}.
    </p>
    <table v-else>
      <thead>
        <tr><th>Class</th><th>Name</th><th>Units</th><th></th></tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.subject">
          <td>{{ row.subject }}</td>
          <td>{{ row.name }}</td>
          <td>{{ row.units || "—" }}</td>
          <td>
            <button :disabled="!!pinning" @click="pick(row.subject)">
              {{ pinning === row.subject ? "Pinning…" : "Pin" }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
