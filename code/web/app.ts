type Pin = { subject: string; semester: number };
type Constraints = {
  required: string[];
  elective_blocks: string[][];
  pins: Pin[];
  maxPerSemester: number;
  maxTechnicalPerSemester: number;
  lockedThrough: number;
};

const SEMESTERS = 8;
const MAX_PATHS = 10;

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const esc = (s: unknown) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const field = (form: HTMLFormElement, name: string) =>
  (form.elements.namedItem(name) as HTMLInputElement);

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

let road = "";
let constraints: Constraints | null = null;
let plans: string[][][] = [];
let pathIndex = 0;
let selectedSem: number | null = null;
let detailsToken = 0;

const say = (msg: string) => ($("#status").textContent = msg);
function show(view: "start" | "paths" | "edit") {
  for (const v of ["start", "paths", "edit"]) $(`#${v}`).hidden = v !== view;
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

async function load() {
  try {
    const data = await call("viewRoad", { road, limit: MAX_PATHS });
    constraints = data.constraints?.constraints?.[0] ?? null;
    plans = findPlans(data.paths);
    if (pathIndex >= plans.length) pathIndex = 0;
  } catch (e) {
    say(`Could not load road: ${(e as Error).message}`);
  }
  renderPaths();
  renderEdit();
}

// ---------- Paths view ----------

function renderPaths() {
  $("#roadId").textContent = road ? `road ${road}` : "";
  $("#tabs").innerHTML =
    plans
      .map((_, i) => `<button class="tab${i === pathIndex ? " active" : ""}" data-i="${i}">Path ${i + 1}</button>`)
      .join("") || `<span class="hint">No paths found.</span>`;

  const plan = plans[pathIndex] ?? [];
  const locked = constraints?.lockedThrough ?? 0;
  const pinned = new Set((constraints?.pins ?? []).map((p) => `${p.semester}:${p.subject}`));

  let html = "";
  for (let s = 1; s <= SEMESTERS; s++) {
    const cls = `sem${s <= locked ? " locked" : ""}${s === selectedSem ? " selected" : ""}`;
    const courses = (plan[s] ?? [])
      .map((c) => `<div class="course" style="background:${color(c)}">${pinned.has(`${s}:${c}`) ? "📌 " : ""}${esc(c)}</div>`)
      .join("");
    html += `<div class="${cls}" data-s="${s}"><h3>Sem ${s} ${s <= locked ? "🔒" : ""}</h3>${courses}</div>`;
  }
  $("#road").innerHTML = html;
  renderDetails();
}

async function renderDetails() {
  const box = $("#details");
  const token = ++detailsToken;
  if (!selectedSem) {
    box.innerHTML = `<p class="hint">Click a semester to see its classes.</p>`;
    return;
  }
  const sem = selectedSem;
  const courses = plans[pathIndex]?.[sem] ?? [];
  box.innerHTML = `<p class="hint">Loading…</p>`;

  const rows = await Promise.all(
    courses.map(async (course) => {
      const [r, s] = await Promise.all([
        call("viewRatings", { course }).then((d) => d.ratings?.ratings?.[0]).catch(() => null),
        call("viewSchedule", { course }).then((d) => d.schedule?.schedule?.[0]).catch(() => null),
      ]);
      return { course, r, s };
    }),
  );
  if (token !== detailsToken) return; // user clicked something else meanwhile

  const dash = "—";
  const total = rows.reduce((n, { s }) => n + (unitSum(s?.units) ?? 0), 0);
  box.innerHTML = `
    <h2>Sem ${sem} · ${total} units</h2>
    <table>
      <tr><th>Class</th><th>Class rating</th><th>Professor rating</th><th>Units</th></tr>
      ${rows
        .map(
          ({ course, r, s }) => `<tr>
            <td>${esc(course)}</td>
            <td>${r?.found ? esc(r.classRating) : dash}</td>
            <td>${r?.found ? esc(r.professorRating) : dash}</td>
            <td>${s?.found ? esc(unitSum(s.units) ?? s.units) : dash}</td>
          </tr>`,
        )
        .join("") || `<tr><td colspan="4" class="hint">Nothing this semester.</td></tr>`}
    </table>`;
}

$("#tabs").addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>("[data-i]");
  if (!b) return;
  pathIndex = Number(b.dataset.i);
  renderPaths();
});

$("#road").addEventListener("click", (e) => {
  const d = (e.target as HTMLElement).closest<HTMLElement>("[data-s]");
  if (!d) return;
  const s = Number(d.dataset.s);
  selectedSem = s === selectedSem ? null : s;
  renderPaths();
});

$("#toEdit").addEventListener("click", () => show("edit"));
$("#toPaths").addEventListener("click", () => show("paths"));

// ---------- Constraints view ----------

function renderEdit() {
  const c = constraints;
  if (!c) return;
  const caps = $<HTMLFormElement>("#caps");
  field(caps, "total").value = String(c.maxPerSemester);
  field(caps, "technical").value = String(c.maxTechnicalPerSemester);
  field(caps, "locked").value = String(c.lockedThrough);

  const none = `<li class="hint">None</li>`;
  $("#pins").innerHTML =
    c.pins
      .map((p) => `<li>${esc(p.subject)} on semester ${p.semester} <button data-unpin="${esc(p.subject)}">remove</button></li>`)
      .join("") || none;
  $("#required").innerHTML =
    c.required.map((s) => `<li>${esc(s)} <button data-unreq="${esc(s)}">remove</button></li>`).join("") || none;
  $("#electives").innerHTML =
    c.elective_blocks
      .map((b, i) => `<li>${b.map(esc).join(" / ")} <button data-unblock="${i}">remove</button></li>`)
      .join("") || none;
}

// Run an action, then reload the road so both views stay in sync.
async function act(name: string, body: object) {
  try {
    await call(name, body);
    say("");
    await load();
  } catch (e) {
    say(`Could not ${name}: ${(e as Error).message}`);
  }
}

$("#edit").addEventListener("click", (e) => {
  const t = e.target as HTMLElement;
  if (t.dataset.unpin) act("unPin", { road, subject: t.dataset.unpin });
  if (t.dataset.unreq) act("removeRequirement", { road, subject: t.dataset.unreq });
  if (t.dataset.unblock) act("removeElectiveBlock", { road, options: constraints!.elective_blocks[Number(t.dataset.unblock)] });
});

function onSubmit(id: string, handler: (form: HTMLFormElement) => Promise<void>) {
  const form = $<HTMLFormElement>(id);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await handler(form);
  });
}

onSubmit("#caps", async (f) => {
  try {
    await call("setCap", { road, capType: "total", limit: Number(field(f, "total").value) });
    await call("setCap", { road, capType: "technical", limit: Number(field(f, "technical").value) });
    await call("lockThroughSemester", { road, semester: Number(field(f, "locked").value) });
    const major = field(f, "major").value.trim();
    if (major) await call("setMajor", { road, major });
    say("Saved.");
    await load();
  } catch (e) {
    say(`Could not save: ${(e as Error).message}`);
  }
});

onSubmit("#addPin", async (f) => {
  await act("pin", { road, subject: field(f, "subject").value.trim(), semester: Number(field(f, "semester").value) });
  f.reset();
});

onSubmit("#addReq", async (f) => {
  await act("addRequirement", { road, subject: field(f, "subject").value.trim() });
  f.reset();
});

onSubmit("#addBlock", async (f) => {
  const options = field(f, "options").value.split(",").map((s) => s.trim()).filter(Boolean);
  await act("addElectiveBlock", { road, options });
  f.reset();
});

// ---------- Start view ----------

onSubmit("#newRoad", async (f) => {
  try {
    const data = await call("newRoad", { name: field(f, "name").value, major: field(f, "major").value });
    location.hash = `road=${data.road}`;
  } catch (e) {
    say(`Could not create road: ${(e as Error).message}`);
  }
});

onSubmit("#openRoad", async (f) => {
  location.hash = `road=${field(f, "road").value.trim()}`;
});

// ---------- Routing: the road id lives in the URL (#road=...) ----------

function route() {
  road = new URLSearchParams(location.hash.slice(1)).get("road") ?? "";
  constraints = null;
  plans = [];
  pathIndex = 0;
  selectedSem = null;
  say("");
  if (!road) {
    $("#roadId").textContent = "";
    show("start");
    return;
  }
  show("paths");
  load();
}

window.addEventListener("hashchange", route);
route();