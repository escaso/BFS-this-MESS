<script setup lang="ts">
// Sharing a road. The owner adds viewers or editors, changes roles, removes people and
// manages the two links; an editor adds viewers and sees only the people they added.
// What each may do is the server's decision; this only offers what will work.
import { onMounted, ref, watch } from "vue";
import { call, message, type Output } from "../api.ts";
import Modal from "./Modal.vue";

const props = defineProps<{ road: string; isOwner: boolean }>();
const emit = defineEmits<{ close: []; changed: [] }>();

type Person = Output<"viewSharing">["people"]["people"][number];
type Link = Output<"viewLinks">["links"]["links"][number];
type Role = "VIEW" | "EDIT";
const ROLE_NAME: Record<Role, string> = { VIEW: "Viewer", EDIT: "Editor" };

const people = ref<Person[] | null>(null);
const links = ref<Link[]>([]);
const error = ref("");
const note = ref("");
const busy = ref(false);

async function loadPeople() {
  try {
    people.value = (await call("viewSharing", { road: props.road })).people.people;
    if (props.isOwner) links.value = (await call("viewLinks", { road: props.road })).links.links;
  } catch (e) {
    error.value = message(e);
  }
}
onMounted(loadPeople);

/** Runs a change, then shows its note and reloads the lists. */
async function attempt(run: () => Promise<unknown>, done: string) {
  busy.value = true;
  error.value = "";
  note.value = "";
  try {
    await run();
    note.value = done;
    await loadPeople();
    emit("changed");
    return true;
  } catch (e) {
    error.value = message(e);
    return false;
  } finally {
    busy.value = false;
  }
}

// ---------- Add people: a combobox of matching usernames ----------

const username = ref("");
const role = ref<Role>("VIEW");
const suggestions = ref<string[]>([]);
const open = ref(false);
const active = ref(-1);
const listId = `share-users-${Math.random().toString(36).slice(2)}`;
let timer: ReturnType<typeof setTimeout> | undefined;
let token = 0;

watch(username, (text) => {
  clearTimeout(timer);
  active.value = -1;
  if (text.trim().length < 2) {
    suggestions.value = [];
    open.value = false;
    return;
  }
  timer = setTimeout(async () => {
    const mine = ++token;
    try {
      const found = (await call("findUsers", { road: props.road, prefix: text.trim() })).people.people.map((p) => p.username);
      if (mine !== token) return;
      suggestions.value = found;
      open.value = found.length > 0;
    } catch {
      suggestions.value = [];
      open.value = false;
    }
  }, 250);
});

function pick(name: string) {
  username.value = name;
  open.value = false;
  suggestions.value = [];
  clearTimeout(timer);
  token++;
}

function onComboKey(e: KeyboardEvent) {
  if (e.key === "ArrowDown" && suggestions.value.length) {
    e.preventDefault();
    open.value = true;
    active.value = (active.value + 1) % suggestions.value.length;
  } else if (e.key === "ArrowUp" && suggestions.value.length) {
    e.preventDefault();
    open.value = true;
    active.value = (active.value - 1 + suggestions.value.length) % suggestions.value.length;
  } else if (e.key === "Enter" && open.value && active.value >= 0) {
    e.preventDefault();
    pick(suggestions.value[active.value]);
  } else if (e.key === "Escape" && open.value) {
    e.preventDefault();
    e.stopPropagation(); // close the list, not the dialog
    open.value = false;
  }
}

async function add() {
  const name = username.value.trim();
  if (!name) return (error.value = "Type the username of the person to add.");
  const as = props.isOwner ? role.value : "VIEW";
  if (await attempt(() => call("shareRoad", { road: props.road, username: name, role: as }), `${name} can now ${as === "EDIT" ? "edit" : "view"} this road.`)) {
    username.value = "";
  }
}

// ---------- People with access (owner) ----------

function setRole(p: Person, next: Role) {
  return attempt(() => call("setRole", { road: props.road, username: p.username, role: next }), `${p.username} is now ${ROLE_NAME[next].toLowerCase()}.`);
}

function remove(p: Person) {
  if (!confirm(`Remove ${p.username}? They will no longer see this road.`)) return;
  return attempt(() => call("unshareRoad", { road: props.road, username: p.username }), `${p.username} was removed.`);
}

// ---------- Links (owner) ----------

const linkOf = (r: Role) => links.value.find((l) => l.role === r);
const urlOf = (l: Link) => `${location.origin}${location.pathname}#join=${l.token}`;
const copied = ref<Role | null>(null);

function toggleLink(r: Role, on: boolean) {
  return attempt(
    () => call(on ? "enableLink" : "disableLink", { road: props.road, role: r }),
    `The ${ROLE_NAME[r].toLowerCase()} link is ${on ? "on" : "off"}.`,
  );
}

function regenerate(r: Role) {
  if (!confirm(`Make a new ${ROLE_NAME[r].toLowerCase()} link? The current one will stop working. People who already joined keep their access.`)) return;
  return attempt(() => call("regenerateLink", { road: props.road, role: r }), `New ${ROLE_NAME[r].toLowerCase()} link made; the old one no longer works.`);
}

async function copy(l: Link) {
  try {
    await navigator.clipboard.writeText(urlOf(l));
    copied.value = l.role as Role;
    setTimeout(() => (copied.value = null), 2000);
  } catch {
    error.value = "Couldn't copy; select the link and copy it yourself.";
  }
}
</script>

<template>
  <Modal title="Share this road" @close="emit('close')">
    <section class="share-add" aria-labelledby="share-add-title">
      <h3 id="share-add-title">Add people</h3>
      <form class="share-form" @submit.prevent="add">
        <div class="combobox">
          <label for="share-username">Username</label>
          <input
            id="share-username"
            v-model="username"
            autofocus
            autocomplete="off"
            role="combobox"
            aria-autocomplete="list"
            :aria-expanded="open"
            :aria-controls="listId"
            :aria-activedescendant="active >= 0 ? `${listId}-${active}` : undefined"
            placeholder="Start typing a username"
            @keydown="onComboKey"
            @blur="open = false"
          />
          <ul v-show="open" :id="listId" role="listbox" class="combo-list">
            <li
              v-for="(name, i) in suggestions"
              :id="`${listId}-${i}`"
              :key="name"
              role="option"
              :aria-selected="i === active"
              :class="{ active: i === active }"
              @mousedown.prevent="pick(name)"
            >{{ name }}</li>
          </ul>
        </div>
        <label>
          Role
          <select v-if="isOwner" v-model="role">
            <option value="VIEW">Viewer</option>
            <option value="EDIT">Editor</option>
          </select>
          <select v-else disabled aria-describedby="editor-adds-viewers"><option>Viewer</option></select>
        </label>
        <button :disabled="busy">Add</button>
      </form>
      <p v-if="!isOwner" id="editor-adds-viewers" class="hint">As an editor you can add viewers.</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-else-if="note" class="ok" role="status">{{ note }}</p>
    </section>

    <section aria-labelledby="share-people-title">
      <h3 id="share-people-title">{{ isOwner ? "People with access" : "People you added" }}</h3>
      <p v-if="!people" class="hint">Loading…</p>
      <p v-else-if="!people.length" class="hint">
        {{ isOwner ? "Nobody else has access yet." : "You haven't added anyone yet." }}
      </p>
      <ul v-else class="people">
        <li v-for="p in people" :key="p.username">
          <span class="who">
            <strong>{{ p.username }}</strong>
            <span class="hint">added by {{ p.addedBy }}</span>
          </span>
          <template v-if="isOwner">
            <select
              :value="p.role"
              :aria-label="`Role of ${p.username}`"
              :disabled="busy"
              @change="setRole(p, ($event.target as HTMLSelectElement).value as Role)"
            >
              <option value="VIEW">Viewer</option>
              <option value="EDIT">Editor</option>
            </select>
            <button type="button" :disabled="busy" @click="remove(p)">Remove</button>
          </template>
          <span v-else class="badge muted">{{ ROLE_NAME[p.role as Role] }}</span>
        </li>
      </ul>
    </section>

    <section v-if="isOwner" aria-labelledby="share-links-title">
      <h3 id="share-links-title">Links</h3>
      <p class="hint">Anyone who is signed in and opens a link gets that access. Turning a link off or making a new one doesn't remove people who already joined.</p>
      <div v-for="r in (['VIEW', 'EDIT'] as const)" :key="r" class="link-row" :class="{ warn: r === 'EDIT' }">
        <label class="switch">
          <input
            type="checkbox"
            role="switch"
            :checked="!!linkOf(r)?.enabled"
            :disabled="busy"
            @change="toggleLink(r, ($event.target as HTMLInputElement).checked)"
          />
          {{ ROLE_NAME[r] }} link
        </label>
        <p v-if="r === 'EDIT'" class="hint">Anyone with this link can <strong>change</strong> your road and share it with others.</p>
        <template v-if="linkOf(r)?.enabled">
          <input class="link-url" readonly :value="urlOf(linkOf(r)!)" :aria-label="`${ROLE_NAME[r]} link`" @focus="($event.target as HTMLInputElement).select()" />
          <span class="inline">
            <button type="button" @click="copy(linkOf(r)!)">{{ copied === r ? "Copied" : "Copy" }}</button>
            <button type="button" :disabled="busy" @click="regenerate(r)">Regenerate</button>
          </span>
        </template>
      </div>
    </section>
  </Modal>
</template>
