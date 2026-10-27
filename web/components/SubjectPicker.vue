<script setup lang="ts">
// A field for one subject of the catalog: type a number or part of a name, pick from up
// to 8 matches with the mouse or the arrow keys, and Enter adds it. Typing an exact
// subject number and pressing Enter adds it without picking.
import { ref, watch } from "vue";
import { call, type CourseRow } from "../api.ts";

const props = defineProps<{ label: string; busy?: boolean }>();
const emit = defineEmits<{ pick: [subject: string] }>();

const text = ref("");
const matches = ref<CourseRow[]>([]);
const open = ref(false);
const active = ref(-1);
const id = `subject-${Math.random().toString(36).slice(2)}`;
let timer: ReturnType<typeof setTimeout> | undefined;
let token = 0;

watch(text, (t) => {
  clearTimeout(timer);
  active.value = -1;
  const query = t.trim();
  if (query.length < 2) {
    matches.value = [];
    open.value = false;
    return;
  }
  timer = setTimeout(async () => {
    const mine = ++token;
    try {
      const found = (await call("searchSubjects", { query, level: "", term: "" })).courses.courses;
      if (mine !== token) return;
      // Exact and starting matches of the number first, then the rest in catalog order.
      const q = query.toLowerCase();
      const rank = (c: CourseRow) => (c.courseId.toLowerCase() === q ? 0 : c.courseId.toLowerCase().startsWith(q) ? 1 : 2);
      matches.value = [...found].sort((a, b) => rank(a) - rank(b)).slice(0, 8);
      open.value = matches.value.length > 0;
    } catch {
      matches.value = [];
      open.value = false;
    }
  }, 200);
});

function pick(subject: string) {
  emit("pick", subject);
  text.value = "";
  matches.value = [];
  open.value = false;
  clearTimeout(timer);
  token++;
}

function onKey(e: KeyboardEvent) {
  const n = matches.value.length;
  if (e.key === "ArrowDown" && n) {
    e.preventDefault();
    open.value = true;
    active.value = (active.value + 1) % n;
  } else if (e.key === "ArrowUp" && n) {
    e.preventDefault();
    open.value = true;
    active.value = (active.value - 1 + n) % n;
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (open.value && active.value >= 0) pick(matches.value[active.value].course);
    else if (text.value.trim()) pick(text.value.trim());
  } else if (e.key === "Escape" && open.value) {
    e.preventDefault();
    e.stopPropagation();
    open.value = false;
  }
}
</script>

<template>
  <div class="combobox subject-picker">
    <label :for="id">{{ props.label }}</label>
    <input
      :id="id"
      v-model="text"
      autocomplete="off"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="open"
      :aria-controls="`${id}-list`"
      :aria-activedescendant="active >= 0 ? `${id}-${active}` : undefined"
      :disabled="busy"
      placeholder="e.g. 18.01 or Calculus"
      @keydown="onKey"
      @blur="open = false"
    />
    <ul v-show="open" :id="`${id}-list`" role="listbox" class="combo-list">
      <li
        v-for="(c, i) in matches"
        :id="`${id}-${i}`"
        :key="c.course"
        role="option"
        :aria-selected="i === active"
        :class="{ active: i === active }"
        @mousedown.prevent="pick(c.course)"
      >
        <strong>{{ c.courseId }}</strong> {{ c.name }}
      </li>
    </ul>
  </div>
</template>
