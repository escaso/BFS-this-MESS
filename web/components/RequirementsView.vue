<script setup lang="ts">
// The requirements of a road's major and of the GIRs, as the degree chart lists them.
// Blocks show whether the subjects taken so far (prior credit and pins) meet them.
// Choices (such as tracks) can be changed by the owner; the road's blocks then follow.
// Notes are requirements the planner cannot check, so they are shown but not planned.
import { computed, ref } from "vue";
import { call, message, type Constraints, type RequirementItem, type Requirements } from "../api.ts";

const props = defineProps<{ road: string; requirements: Requirements; constraints: Constraints; readOnly?: boolean }>();
const emit = defineEmits<{ changed: [note?: string]; error: [message: string] }>();

const busy = ref(false);

const taken = computed(() => new Set([...props.constraints.prior.map((p) => p.subject), ...props.constraints.pins.map((p) => p.subject)]));

// The options of each listed block of the road, by the requirement it came from.
const optionsOf = computed(() => {
  const byOrigin = new Map<string, string[]>();
  for (const row of props.constraints.blocks) {
    if (row.origin) byOrigin.set(row.origin, [...(byOrigin.get(row.origin) ?? []), row.subject]);
  }
  return byOrigin;
});

function status(item: RequirementItem) {
  const options = optionsOf.value.get(item.item) ?? [];
  const met = options.filter((o) => taken.value.has(o));
  return { options, met, done: met.length >= item.count };
}

const kindOf = (items: RequirementItem[], key: string) => items.find((i) => i.item === key)?.kind;

/** The items to draw: everything active, plus every alternative of a choice so another can be picked. */
function visible(items: RequirementItem[]) {
  return items.filter((i) => i.active || kindOf(items, i.parent) === "CHOICE");
}

async function choose(items: RequirementItem[], alternative: RequirementItem) {
  if (alternative.chosen || props.readOnly) return;
  busy.value = true;
  try {
    await call("chooseAlternative", { road: props.road, choice: alternative.parent, alternative: alternative.item });
    emit("changed", `Chose ${alternative.title || "that option"}.`);
  } catch (e) {
    emit("error", message(e));
  } finally {
    busy.value = false;
  }
}

// Matches Constrain: a block with more options than this gets open slots in paths.
const OPEN = 100;

async function refresh() {
  busy.value = true;
  try {
    await call("refreshRequirements", { road: props.road });
    emit("changed", "Requirements refreshed from the degree charts.");
  } catch (e) {
    emit("error", message(e));
  } finally {
    busy.value = false;
  }
}

const countOf = (items: RequirementItem[], key: string) => items.find((i) => i.item === key)?.count ?? 1;
const preview = (options: string[]) => (options.length > 8 ? `${options.slice(0, 8).join(", ")}, … (${options.length})` : options.join(", "));

const sections = computed(() => [
  { title: props.requirements.found ? props.requirements.title : "", items: props.requirements.items },
  { title: "General Institute Requirements", items: props.requirements.girs },
]);
</script>

<template>
  <section class="requirements">
    <div class="titlebar">
      <h2>Degree requirements</h2>
      <button v-if="!readOnly" :disabled="busy" @click="refresh">Refresh from degree charts</button>
    </div>
    <p v-if="!requirements.found" class="error">
      This road's major ({{ requirements.major }}) is not one of the listed majors. Pick your major above to get its
      requirements.
    </p>
    <p class="hint">
      Added from the degree charts. <span class="badge">approximate</span> means the chart says more than the planner
      can check (e.g. units read as 12-unit subjects); <span class="badge muted">you choose</span> requirements get
      open slots in paths for you to fill; <span class="badge muted">not planned</span> requirements are for you to
      track.
    </p>

    <template v-for="section in sections" :key="section.title">
      <h3 v-if="section.title">{{ section.title }}</h3>
      <ul class="outline">
        <li
          v-for="i in visible(section.items)"
          :key="i.item"
          :style="{ paddingLeft: `${i.depth * 1.25}rem` }"
          :class="{ inactive: !i.active }"
        >
          <!-- An alternative of a choice -->
          <label v-if="kindOf(section.items, i.parent) === 'CHOICE'" class="inline">
            <input
              :type="countOf(section.items, i.parent) > 1 ? 'checkbox' : 'radio'"
              :name="i.parent"
              :checked="i.chosen"
              :disabled="busy || readOnly || i.chosen"
              @change="choose(section.items, i)"
            />
            {{ i.title || "Option" }}
          </label>

          <template v-else-if="i.kind === 'GROUP'">
            <strong v-if="i.title">{{ i.title }}</strong>
          </template>

          <template v-else-if="i.kind === 'CHOICE'">
            <strong>{{ i.title || "Choose" }}</strong>
            <span class="hint"> · choose {{ i.count }}</span>
          </template>

          <template v-else-if="i.kind === 'BLOCK'">
            <span :class="status(i).done ? 'ok' : 'hint'" :aria-label="status(i).done ? 'met' : 'not met yet'">
              {{ status(i).done ? "✓" : "○" }}
            </span>
            {{ i.title }}
            <span class="hint">
              · {{ i.count }} of {{ status(i).options.length > 1 ? preview(status(i).options) : status(i).options[0] ?? "" }}
              <template v-if="status(i).met.length && !status(i).done"> · {{ status(i).met.length }} done</template>
            </span>
            <span v-if="i.approximate" class="badge">approximate</span>
            <span v-if="status(i).options.length > OPEN" class="badge muted">you choose</span>
          </template>

          <template v-else>
            <span class="hint">○</span>
            {{ i.title }}
            <span class="badge muted">not planned</span>
          </template>
        </li>
      </ul>
    </template>
  </section>
</template>
