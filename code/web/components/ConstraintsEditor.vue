<script setup lang="ts">
// Edit a road's caps, pins, required subjects and elective blocks. Each edit
// calls the backend, then tells the parent to reload the road.
import { ref, watch } from "vue";
import { api, message, unwrap, type Constraints } from "../api.ts";

const props = defineProps<{ road: string; constraints: Constraints | null }>();
const emit = defineEmits<{ back: []; changed: [note?: string]; error: [message: string] }>();

const caps = ref({ total: 0, technical: 0, locked: 0, major: "" });
const pinForm = ref({ subject: "", semester: "" });
const reqSubject = ref("");
const blockOptions = ref("");

// Keep the caps form filled in with the road's current values.
watch(
  () => props.constraints,
  (c) => {
    if (!c) return;
    caps.value = {
      total: c.maxPerSemester,
      technical: c.maxTechnicalPerSemester,
      locked: c.lockedThrough,
      major: "",
    };
  },
  { immediate: true },
);

// Run some calls; on success ask the parent to reload, on failure report why.
async function attempt(what: string, run: () => Promise<unknown>, note?: string) {
  try {
    await run();
    emit("changed", note);
    return true;
  } catch (e) {
    emit("error", `Could not ${what}: ${message(e)}`);
    return false;
  }
}

const road = () => props.road;

function saveCaps() {
  const c = caps.value;
  return attempt(
    "save",
    async () => {
      await unwrap(api.setCap({ road: road(), capType: "total", limit: Number(c.total) }));
      await unwrap(api.setCap({ road: road(), capType: "technical", limit: Number(c.technical) }));
      await unwrap(api.lockThroughSemester({ road: road(), semester: Number(c.locked) }));
      const major = c.major.trim();
      if (major) await unwrap(api.setMajor({ road: road(), major }));
    },
    "Saved.",
  );
}

async function addPin() {
  const subject = pinForm.value.subject.trim();
  const semester = Number(pinForm.value.semester);
  if (await attempt("pin", () => unwrap(api.pin({ road: road(), subject, semester })))) {
    pinForm.value = { subject: "", semester: "" };
  }
}

function unPin(subject: string) {
  return attempt("unpin", () => unwrap(api.unPin({ road: road(), subject })));
}

async function addReq() {
  const subject = reqSubject.value.trim();
  if (await attempt("add requirement", () => unwrap(api.addRequirement({ road: road(), subject })))) {
    reqSubject.value = "";
  }
}

function removeReq(subject: string) {
  return attempt("remove requirement", () => unwrap(api.removeRequirement({ road: road(), subject })));
}

async function addBlock() {
  const options = blockOptions.value.split(",").map((s) => s.trim()).filter(Boolean);
  if (await attempt("add elective block", () => unwrap(api.addElectiveBlock({ road: road(), options })))) {
    blockOptions.value = "";
  }
}

function removeBlock(options: string[]) {
  return attempt("remove elective block", () =>
    unwrap(api.removeElectiveBlock({ road: road(), options })),
  );
}
</script>

<template>
  <main>
    <div class="titlebar">
      <h1>Constraints</h1>
      <button @click="emit('back')">Back to paths</button>
    </div>

    <form class="grid" @submit.prevent="saveCaps">
      <label>Max subjects per semester <input v-model.number="caps.total" type="number" min="0" /></label>
      <label>Max technicals per semester <input v-model.number="caps.technical" type="number" min="0" /></label>
      <label>Locked through semester <input v-model.number="caps.locked" type="number" min="0" max="8" /></label>
      <label>Major <input v-model="caps.major" placeholder="unchanged" /></label>
      <button>Save</button>
    </form>

    <h2>Pinned subjects</h2>
    <ul>
      <li v-for="p in constraints?.pins ?? []" :key="p.semester + ':' + p.subject">
        {{ p.subject }} on semester {{ p.semester }}
        <button @click="unPin(p.subject)">remove</button>
      </li>
      <li v-if="!constraints?.pins.length" class="hint">None</li>
    </ul>
    <form @submit.prevent="addPin">
      <input v-model="pinForm.subject" placeholder="6.1220" required />
      <input v-model="pinForm.semester" type="number" min="1" max="8" placeholder="Semester" required />
      <button>Pin</button>
    </form>

    <h2>Required subjects</h2>
    <ul>
      <li v-for="s in constraints?.required ?? []" :key="s">
        {{ s }} <button @click="removeReq(s)">remove</button>
      </li>
      <li v-if="!constraints?.required.length" class="hint">None</li>
    </ul>
    <form @submit.prevent="addReq">
      <input v-model="reqSubject" placeholder="6.1010" required />
      <button>Add</button>
    </form>

    <h2>Elective blocks (take one of)</h2>
    <ul>
      <li v-for="(b, i) in constraints?.elective_blocks ?? []" :key="i">
        {{ b.join(" / ") }} <button @click="removeBlock(b)">remove</button>
      </li>
      <li v-if="!constraints?.elective_blocks.length" class="hint">None</li>
    </ul>
    <form @submit.prevent="addBlock">
      <input v-model="blockOptions" placeholder="6.1800, 6.1850, 6.1810" required />
      <button>Add</button>
    </form>
  </main>
</template>
