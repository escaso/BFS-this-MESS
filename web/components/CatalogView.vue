<script setup lang="ts">
// Load the catalog from the MIT Subject Listing and the Subject Evaluation
// Reports. The server only fetches those two sites (catalogSources in the
// composition); the same check runs here first so a typo is caught at once.
import { ref } from "vue";
import { call, message } from "../api.ts";

const BAD_SOURCE = "Catalog sources must be the MIT Subject Listing and Subject Evaluation Reports sites.";

const form = ref({ subjectListingURL: "", ratingsURL: "" });
const busy = ref(false);
const error = ref("");
const result = ref("");

function onHttpsHost(url: string, host: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === host;
  } catch {
    return false;
  }
}

async function load() {
  const subjectListingURL = form.value.subjectListingURL.trim();
  const ratingsURL = form.value.ratingsURL.trim();
  result.value = "";
  if (!onHttpsHost(subjectListingURL, "student.mit.edu") || !onHttpsHost(ratingsURL, "eduapps.mit.edu")) {
    error.value = BAD_SOURCE;
    return;
  }
  error.value = "";
  busy.value = true;
  try {
    const { count } = await call("loadCatalog", { subjectListingURL, ratingsURL });
    result.value = `Loaded ${count} subject${count === 1 ? "" : "s"}.`;
  } catch (e) {
    error.value = message(e);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <main>
    <h1>Load the catalog</h1>
    <p class="hint">
      Give the address of a page of the MIT Subject Listing and of the Subject Evaluation Reports.
      Loading fetches both pages, so it can take a while.
    </p>
    <form class="grid" @submit.prevent="load">
      <label>
        Subject Listing URL
        <input
          v-model="form.subjectListingURL"
          type="url"
          placeholder="https://student.mit.edu/catalog/m6a.html"
          required
        />
      </label>
      <label>
        Subject Evaluation Reports URL
        <input v-model="form.ratingsURL" type="url" placeholder="https://eduapps.mit.edu/ose-rpt/…" required />
      </label>
      <button :disabled="busy">{{ busy ? "Loading…" : "Load catalog" }}</button>
    </form>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="result" class="ok" role="status">{{ result }}</p>
    <p class="hint">
      Note: the backend does not parse the listing yet, so a load currently adds 0 subjects. The
      development seed (<code>bun scripts/seed-catalog.ts</code>) provides subjects for planning.
    </p>
  </main>
</template>
