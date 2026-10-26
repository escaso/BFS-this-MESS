<script setup lang="ts">
// Copying a road to one's own roads: asks for a name first. The copy keeps the
// constraints (major, span, requirements and choices, pins, locks, caps) but not the
// prior credit, and is the copier's own road from then on.
import { ref } from "vue";
import { call, message } from "../api.ts";
import Modal from "./Modal.vue";

const props = defineProps<{ road: string; name: string }>();
const emit = defineEmits<{ close: []; copied: [road: string, name: string] }>();

const name = ref(`${props.name} (copy)`);
const error = ref("");
const busy = ref(false);

async function copy() {
  const n = name.value.trim();
  if (!n) return (error.value = "A copy needs a name.");
  busy.value = true;
  error.value = "";
  try {
    const { road } = await call("copyRoad", { road: props.road, name: n });
    emit("copied", road, n);
  } catch (e) {
    error.value = message(e);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <Modal title="Copy to my roads" @close="emit('close')">
    <form class="grid" @submit.prevent="copy">
      <label>Name of the copy <input v-model="name" autofocus required /></label>
      <p class="hint">
        The copy keeps this road's major, semesters, requirements and choices, pins, locks and caps, and is yours
        to change. Prior credit isn't copied; add your own.
      </p>
      <button :disabled="busy">{{ busy ? "Copying…" : "Copy" }}</button>
    </form>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </Modal>
</template>
