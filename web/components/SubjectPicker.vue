<script setup lang="ts">
// A field for one subject of the catalog: type a number or part of a name, pick from up
// to 8 matches with the mouse or the arrow keys, and Enter adds it. Typing an exact
// subject number and pressing Enter adds it without picking. With keep, a picked subject
// stays in the field (bound with v-model) for a form to submit, as when pinning: Enter
// then submits the form unless an option is highlighted.
import { ref, watch } from "vue";
import { call, type CourseRow } from "../api.ts";

const props = defineProps<{ label: string; busy?: boolean; keep?: boolean; modelValue?: string; required?: boolean }>();
const emit = defineEmits<{ pick: [subject: string]; "update:modelValue": [text: string] }>();

const text = ref(props.modelValue ?? "");
// Set when the field is filled in by a pick, so that it does not search again.
let filled = false;
watch(() => props.modelValue, (v) => {
  if (v !== undefined && v !== text.value) {
    filled = true;
    text.value = v;
  }
});
const matches = ref<CourseRow[]>([]);
const open = ref(false);
const active = ref(-1);
const id = `subject-${Math.random().toString(36).slice(2)}`;
let timer: ReturnType<typeof setTimeout> | undefined;
let token = 0;

watch(text, (t) => {
  emit("update:modelValue", t);
  clearTimeout(timer);
  active.value = -1;
  if (filled) {
    filled = false;
    matches.value = [];
    open.value = false;
    return;
  }
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
  const next = props.keep ? subject : "";
  filled = next !== text.value; // an unchanged field fires no watch to clear it
  text.value = next;
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
    if (open.value && active.value >= 0) {
      e.preventDefault();
      pick(matches.value[active.value].course);
    } else if (props.keep) {
      open.value = false; // the form is submitted with what is typed
    } else {
      e.preventDefault();
      if (text.value.trim()) pick(text.value.trim());
    }
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
      :required="required"
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
