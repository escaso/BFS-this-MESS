<script setup lang="ts">
// Make a new road, or open an existing one by id.
import { ref } from "vue";
import { api, message, unwrap } from "../api.ts";

const emit = defineEmits<{ open: [road: string]; error: [message: string] }>();

const newRoad = ref({ name: "", major: "" });
const openId = ref("");

async function createRoad() {
  try {
    const { road } = await unwrap(api.newRoad(newRoad.value));
    emit("open", road);
  } catch (e) {
    emit("error", `Could not create road: ${message(e)}`);
  }
}

function openExisting() {
  const id = openId.value.trim();
  if (id) emit("open", id);
}
</script>

<template>
  <main>
    <h1>Your road</h1>
    <form @submit.prevent="createRoad">
      <input v-model="newRoad.name" placeholder="Road name" required />
      <input v-model="newRoad.major" placeholder="Major, e.g. 6-3" required />
      <button>New road</button>
    </form>
    <form @submit.prevent="openExisting">
      <input v-model="openId" placeholder="Existing road id" required />
      <button>Open</button>
    </form>
  </main>
</template>
