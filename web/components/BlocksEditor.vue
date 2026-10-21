<script setup lang="ts">
// The student's own requirements of a road: blocks, each asking for some number of
// subjects from a list of options. A required subject is a block with one option and
// a count of 1. Blocks listed from the major and the GIRs are shown in RequirementsView
// and are not edited here.
import { computed, ref } from "vue";
import { call, message, type Constraints } from "../api.ts";

const props = defineProps<{ road: string; blocks: Constraints["blocks"] }>();
const emit = defineEmits<{ changed: [note?: string]; error: [message: string] }>();

const busy = ref(false);

async function attempt(run: () => Promise<unknown>, note?: string): Promise<boolean> {
  busy.value = true;
  try {
    await run();
    emit("changed", note);
    return true;
  } catch (e) {
    emit("error", message(e));
    return false;
  } finally {
    busy.value = false;
  }
}

// viewRoad answers one row per option; put each of the student's blocks back together.
const grouped = computed(() => {
  const byBlock = new Map<string, { block: string; count: number; technical: boolean; options: string[] }>();
  for (const row of props.blocks) {
    if (row.origin) continue; // listed from the major or the GIRs
    const entry = byBlock.get(row.block) ?? { block: row.block, count: row.count, technical: row.technical, options: [] };
    entry.options.push(row.subject);
    byBlock.set(row.block, entry);
  }
  return [...byBlock.values()];
});

const parseOptions = (text: string) => [...new Set(text.split(",").map((s) => s.trim()).filter(Boolean))];
const validCount = (n: number) => Number.isInteger(n) && n >= 1;

// ---------- New block ----------

const newBlock = ref({ count: 1, options: "", technical: true });

async function addBlock() {
  const count = Number(newBlock.value.count);
  const options = parseOptions(newBlock.value.options);
  if (!validCount(count)) return emit("error", "A block must require at least one subject.");
  if (!options.length) return emit("error", "Give at least one subject the block can be met with.");
  if (count > options.length) return emit("error", `A block needing ${count} subjects needs at least ${count} options.`);
  // A block with no options is not shown by the road, so the block and its
  // options are added together.
  const ok = await attempt(async () => {
    const { block } = await call("addBlock", { road: props.road, count, technical: newBlock.value.technical });
    for (const subject of options) await call("addOption", { block, subject });
  }, "Requirement added.");
  if (ok) newBlock.value = { count: 1, options: "", technical: true };
}

// ---------- Existing blocks ----------

const adding = ref<Record<string, string>>({});

function setCount(block: string, value: string) {
  const count = Number(value);
  if (!validCount(count)) return emit("error", "A block must require at least one subject.");
  return attempt(() => call("setCount", { block, count }), "Requirement updated.");
}

async function addOption(block: string) {
  const options = parseOptions(adding.value[block] ?? "");
  if (!options.length) return emit("error", "Give a subject to add.");
  const ok = await attempt(async () => {
    for (const subject of options) await call("addOption", { block, subject });
  }, "Option added.");
  if (ok) adding.value[block] = "";
}

function removeOption(block: string, subject: string, last: boolean) {
  // Removing the last option leaves a block that is ignored and not shown, so
  // remove the whole block instead.
  if (last) return attempt(() => call("removeBlock", { block }), "Requirement removed.");
  return attempt(() => call("removeOption", { block, subject }), `${subject} removed.`);
}

function removeBlock(block: string) {
  return attempt(() => call("removeBlock", { block }), "Requirement removed.");
}
</script>

<template>
  <section>
    <h2>Your own requirements</h2>
    <p class="hint">Anything else you want every plan to include, beyond the degree requirements above.</p>
    <ul>
      <li v-for="b in grouped" :key="b.block" class="block">
        Take
        <input
          class="count"
          type="number"
          min="1"
          :max="b.options.length"
          :value="b.count"
          :disabled="busy"
          aria-label="How many subjects are needed"
          @change="setCount(b.block, ($event.target as HTMLInputElement).value)"
        />
        of:
        <span v-for="s in b.options" :key="s" class="chip">
          {{ s }}
          <button
            class="link"
            :disabled="busy"
            :aria-label="`Remove ${s}`"
            @click="removeOption(b.block, s, b.options.length === 1)"
          >
            ×
          </button>
        </span>
        <form class="inline" @submit.prevent="addOption(b.block)">
          <input v-model="adding[b.block]" placeholder="add option" />
          <button :disabled="busy">Add</button>
        </form>
        <span v-if="b.technical" class="badge">technical</span>
        <button :disabled="busy" @click="removeBlock(b.block)">Remove requirement</button>
      </li>
      <li v-if="!grouped.length" class="hint">None.</li>
    </ul>

    <h3>Add a requirement</h3>
    <form @submit.prevent="addBlock">
      <label class="inline">
        Take <input v-model.number="newBlock.count" class="count" type="number" min="1" required /> of
      </label>
      <input v-model="newBlock.options" placeholder="6.1800, 6.1810 (one subject = required)" required />
      <label class="inline" title="Technical subjects count toward a semester's cap on technical units">
        <input v-model="newBlock.technical" type="checkbox" /> technical
      </label>
      <button :disabled="busy">Add requirement</button>
    </form>
  </section>
</template>
