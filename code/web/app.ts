// The browser build of Vue includes the template compiler, so the template can
// live right in index.html and Bun's bundler needs no extra plugin.
import { createApp, ref, computed, watch } from "vue/dist/vue.esm-browser.js";

type Pin = { subject: string; semester: number };
type Constraints = {
  required: string[];
  elective_blocks: string[][];
  pins: Pin[];
  maxPerSemester: number;
  maxTechnicalPerSemester: number;
  lockedThrough: number;
};
type DetailRow = { course: string; r: any; s: any };

const SEMESTERS = 8;
const MAX_PATHS = 10;

// Every endpoint is a JSON POST under /api/bfsthismess/. Errors come back as { error }.
async function call(name: string, body: object = {}): Promise<any> {
  const res = await fetch(`/api/bfsthismess/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok || "error" in data) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

// The paths response is nested formers; just collect every { plan } we find.
function findPlans(x: any): string[][][] {
  if (!x || typeof x !== "object") return [];
  if (Array.isArray(x.plan)) return [x.plan];
  return Object.values(x).flatMap(findPlans);
}

// One pastel color per department, like CourseRoad.
function color(course: string) {
  let h = 0;
  for (const ch of course.split(".")[0]) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 60% 85%)`;
}

// MIT units look like "3-0-9" (= 12).
function unitSum(u: unknown): number | null {
  if (!u) return null;
  const parts = String(u).split("-").map(Number);
  return parts.every((n) => !isNaN(n)) ? parts.reduce((a, b) => a + b, 0) : null;
}

createApp({
  setup() {
    const road = ref("");
    const view = ref<"start" | "paths" | "edit">("start");
    const status = ref("");
    const constraints = ref<Constraints | null>(null);
    const plans = ref<string[][][]>([]);
    const pathIndex = ref(0);
    const selectedSem = ref<number | null>(null);

    // Form inputs
    const newRoad = ref({ name: "", major: "" });
    const openId = ref("");
    const caps = ref({ total: 0, technical: 0, locked: 0, major: "" });
    const pinForm = ref({ subject: "", semester: "" });
    const reqSubject = ref("");
    const blockOptions = ref("");

    const plan = computed(() => plans.value[pathIndex.value] ?? []);
    const locked = computed(() => constraints.value?.lockedThrough ?? 0);
    const pinned = computed(
      () => new Set((constraints.value?.pins ?? []).map((p) => `${p.semester}:${p.subject}`)),
    );

    async function load() {
      try {
        const data = await call("viewRoad", { road: road.value, limit: MAX_PATHS });
        constraints.value = data.constraints?.constraints?.[0] ?? null;
        plans.value = findPlans(data.paths);
        if (pathIndex.value >= plans.value.length) pathIndex.value = 0;
      } catch (e) {
        status.value = `Could not load road: ${(e as Error).message}`;
      }
    }

    // Keep the caps form filled in with the road's current values.
    watch(constraints, (c) => {
      if (!c) return;
      caps.value = {
        total: c.maxPerSemester,
        technical: c.maxTechnicalPerSemester,
        locked: c.lockedThrough,
        major: "",
      };
    });

    // ---------- Semester details ----------

    const details = ref<DetailRow[]>([]);
    const detailsLoading = ref(false);
    let detailsToken = 0;

    watch([selectedSem, plan], async ([sem, p]) => {
      const token = ++detailsToken;
      details.value = [];
      detailsLoading.value = false;
      if (!sem) return;
      detailsLoading.value = true;
      const rows = await Promise.all(
        (p[sem] ?? []).map(async (course) => {
          const [r, s] = await Promise.all([
            call("viewRatings", { course }).then((d) => d.ratings?.ratings?.[0]).catch(() => null),
            call("viewSchedule", { course }).then((d) => d.schedule?.schedule?.[0]).catch(() => null),
          ]);
          return { course, r, s };
        }),
      );
      if (token !== detailsToken) return; // user clicked something else meanwhile
      details.value = rows;
      detailsLoading.value = false;
    });

    const totalUnits = computed(() => details.value.reduce((n, { s }) => n + (unitSum(s?.units) ?? 0), 0));

    function toggleSem(s: number) {
      selectedSem.value = s === selectedSem.value ? null : s;
    }

    // ---------- Constraints ----------

    // Run an action, then reload the road so both views stay in sync.
    async function act(name: string, body: object) {
      try {
        await call(name, { road: road.value, ...body });
        status.value = "";
        await load();
      } catch (e) {
        status.value = `Could not ${name}: ${(e as Error).message}`;
      }
    }

    async function saveCaps() {
      const c = caps.value;
      try {
        await call("setCap", { road: road.value, capType: "total", limit: Number(c.total) });
        await call("setCap", { road: road.value, capType: "technical", limit: Number(c.technical) });
        await call("lockThroughSemester", { road: road.value, semester: Number(c.locked) });
        const major = c.major.trim();
        if (major) await call("setMajor", { road: road.value, major });
        status.value = "Saved.";
        await load();
      } catch (e) {
        status.value = `Could not save: ${(e as Error).message}`;
      }
    }

    async function addPin() {
      await act("pin", { subject: pinForm.value.subject.trim(), semester: Number(pinForm.value.semester) });
      pinForm.value = { subject: "", semester: "" };
    }

    async function addReq() {
      await act("addRequirement", { subject: reqSubject.value.trim() });
      reqSubject.value = "";
    }

    async function addBlock() {
      const options = blockOptions.value.split(",").map((s) => s.trim()).filter(Boolean);
      await act("addElectiveBlock", { options });
      blockOptions.value = "";
    }

    // ---------- Start ----------

    async function createRoad() {
      try {
        const data = await call("newRoad", newRoad.value);
        location.hash = `road=${data.road}`;
      } catch (e) {
        status.value = `Could not create road: ${(e as Error).message}`;
      }
    }

    function openRoad() {
      location.hash = `road=${openId.value.trim()}`;
    }

    // ---------- Routing: the road id lives in the URL (#road=...) ----------

    function route() {
      road.value = new URLSearchParams(location.hash.slice(1)).get("road") ?? "";
      constraints.value = null;
      plans.value = [];
      pathIndex.value = 0;
      selectedSem.value = null;
      status.value = "";
      view.value = road.value ? "paths" : "start";
      if (road.value) load();
    }

    window.addEventListener("hashchange", route);
    route();

    return {
      SEMESTERS, color, unitSum,
      road, view, status, constraints, plans, pathIndex, selectedSem,
      newRoad, openId, caps, pinForm, reqSubject, blockOptions,
      plan, locked, pinned, details, detailsLoading, totalUnits,
      toggleSem, act, saveCaps, addPin, addReq, addBlock, createRoad, openRoad,
    };
  },
}).mount("#app");
