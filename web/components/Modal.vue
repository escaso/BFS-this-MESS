<script setup lang="ts">
// A modal dialog: labelled by its title, focus moved into it on opening, kept inside it
// (Tab and Shift+Tab wrap), Esc or the backdrop closes it, and focus goes back to what
// had it before. The content comes in the default slot.
import { nextTick, onMounted, onUnmounted, ref } from "vue";

defineProps<{ title: string }>();
const emit = defineEmits<{ close: [] }>();

const box = ref<HTMLElement | null>(null);
const titleId = `modal-${Math.random().toString(36).slice(2)}`;
let before: Element | null = null;

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const focusables = () => [...(box.value?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter((e) => e.offsetParent !== null);

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") {
    e.preventDefault();
    emit("close");
  } else if (e.key === "Tab") {
    const all = focusables();
    if (!all.length) return;
    const [first, last] = [all[0], all[all.length - 1]];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

onMounted(async () => {
  before = document.activeElement;
  await nextTick();
  (box.value?.querySelector<HTMLElement>("[autofocus]") ?? focusables()[0] ?? box.value)?.focus();
});
onUnmounted(() => {
  if (before instanceof HTMLElement) before.focus();
});
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div ref="box" class="modal" role="dialog" aria-modal="true" :aria-labelledby="titleId" tabindex="-1" @keydown="onKey">
      <div class="titlebar">
        <h2 :id="titleId">{{ title }}</h2>
        <button type="button" class="link" aria-label="Close" @click="emit('close')">Close</button>
      </div>
      <slot />
    </div>
  </div>
</template>
