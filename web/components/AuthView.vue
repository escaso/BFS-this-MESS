<script setup lang="ts">
// Log in, or register and then log in, in one form. On success the session is
// stored and App switches to the signed-in screens.
import { ref } from "vue";
import { call, message } from "../api.ts";
import { signIn } from "../session.ts";

defineProps<{ note?: string }>();

const mode = ref<"logIn" | "register">("logIn");
const form = ref({ username: "", password: "" });
const error = ref("");
const busy = ref(false);

async function submit() {
  const username = form.value.username.trim();
  const password = form.value.password;
  // Matches register's EMPTY_CREDENTIALS, checked here so the person gets the
  // answer without a round trip.
  if (!username || !password) {
    error.value = "A username and a password are needed.";
    return;
  }
  error.value = "";
  busy.value = true;
  try {
    if (mode.value === "register") await call("register", { username, password });
    const { session } = await call("logIn", { username, password });
    signIn(session, username);
  } catch (e) {
    error.value = message(e);
  } finally {
    busy.value = false;
  }
}

function switchMode() {
  mode.value = mode.value === "logIn" ? "register" : "logIn";
  error.value = "";
}
</script>

<template>
  <main class="narrow">
    <h1>{{ mode === "logIn" ? "Log in" : "Create an account" }}</h1>
    <p v-if="note" class="access-banner" role="note">{{ note }} You'll join it right after.</p>
    <form class="grid" @submit.prevent="submit">
      <label>Username <input v-model="form.username" autocomplete="username" required /></label>
      <label>
        Password
        <input
          v-model="form.password"
          type="password"
          :autocomplete="mode === 'logIn' ? 'current-password' : 'new-password'"
          required
        />
      </label>
      <button :disabled="busy">{{ busy ? "Please wait…" : mode === "logIn" ? "Log in" : "Register" }}</button>
    </form>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p class="hint">
      {{ mode === "logIn" ? "No account yet?" : "Already have an account?" }}
      <button type="button" class="link" @click="switchMode">
        {{ mode === "logIn" ? "Register" : "Log in" }}
      </button>
    </p>
  </main>
</template>
