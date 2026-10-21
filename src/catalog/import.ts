// Loads catalog/snapshot.json into CourseOffering and copies each subject's facts into
// Constrain, and loads catalog/requirements.json into Requirements (see the Catalog section
// of design/compositions/BFSThisMess.md). The server runs it on start, and it does nothing
// for a snapshot that is already loaded.

import { join } from "node:path";
import type { Db } from "mongodb";
import { ConstrainConcept, NoListing, type Term } from "../concepts/Constrain.ts";
import { CourseOfferingConcept, type Snapshot, type SnapshotCourse } from "../concepts/CourseOffering.ts";
import { RequirementsConcept } from "../concepts/Requirements.ts";

export const SNAPSHOT_PATH = join(import.meta.dir, "..", "..", "catalog", "snapshot.json");
export const REQUIREMENTS_PATH = join(import.meta.dir, "..", "..", "catalog", "requirements.json");

// Subjects copied into Constrain at once. Each one is a handful of small writes.
const CONCURRENCY = 32;

type Loaded = { loaded: boolean; id: string; count: number };

/**
 * Loads the subject snapshot (into CourseOffering, copied into Constrain) and the
 * requirements snapshot (into Requirements), each unless it is already loaded.
 */
export async function importCatalog(
  db: Db,
  {
    path = SNAPSHOT_PATH,
    requirementsPath = REQUIREMENTS_PATH,
    force = false,
    log = console.log,
  }: { path?: string; requirementsPath?: string; force?: boolean; log?: (line: string) => void } = {},
): Promise<Loaded & { requirements: Loaded }> {
  const subjects = await importSubjects(db, path, force, log);
  // Requirements name subjects, so they load after them.
  const requirements = await importRequirements(db, requirementsPath, force, log);
  return { ...subjects, requirements };
}

async function importSubjects(db: Db, path: string, force: boolean, log: (line: string) => void): Promise<Loaded> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    log(`Catalog: no snapshot at ${path}; run bun run catalog:build.`);
    return { loaded: false, id: "", count: 0 };
  }
  const text = await file.text();
  const snapshot: Snapshot = JSON.parse(text);

  const courseOffering = new CourseOfferingConcept(db);
  const constrain = new ConstrainConcept(db);

  const loaded = await courseOffering._loadedSnapshot({});
  if (!force && loaded.found && loaded.id === snapshot.id) {
    log(`Catalog: snapshot ${snapshot.id} is already loaded.`);
    return { loaded: false, id: snapshot.id, count: 0 };
  }

  const started = performance.now();
  log(`Catalog: loading snapshot ${snapshot.id} (${snapshot.courses.length} subjects)...`);
  const { count } = await courseOffering.load({ snapshot: text });

  const queue = [...snapshot.courses];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let course = queue.shift(); course; course = queue.shift()) {
        await copyToConstrain(constrain, courseOffering, course);
      }
    }),
  );

  log(`Catalog: loaded ${count} subjects in ${((performance.now() - started) / 1000).toFixed(1)}s.`);
  return { loaded: true, id: snapshot.id, count };
}

async function importRequirements(db: Db, path: string, force: boolean, log: (line: string) => void): Promise<Loaded> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    log(`Catalog: no requirements at ${path}; run bun run catalog:build.`);
    return { loaded: false, id: "", count: 0 };
  }
  const text = await file.text();
  const { id } = JSON.parse(text) as { id: string };
  const requirements = new RequirementsConcept(db);
  const loaded = await requirements._loadedSnapshot({});
  if (!force && loaded.found && loaded.id === id) {
    log(`Catalog: requirements ${id} are already loaded.`);
    return { loaded: false, id, count: 0 };
  }
  const { count } = await requirements.load({ snapshot: text });
  log(`Catalog: loaded ${count} requirement lists (${id}).`);
  return { loaded: true, id, count };
}

// Replaces Constrain's listing of one subject with the snapshot's.
async function copyToConstrain(constrain: ConstrainConcept, courseOffering: CourseOfferingConcept, course: SnapshotCourse) {
  const subject = course.subject;
  try {
    await constrain.removeListing({ subject });
  } catch (e) {
    if (!(e instanceof NoListing)) throw e;
  }
  await constrain.setListing({ subject, units: course.totalUnits });
  for (const term of course.terms) await constrain.addListingTerm({ subject, term: term as Term });
  for (const [kind, dependencies] of [
    ["PREREQUISITE", course.prerequisites],
    ["COREQUISITE", course.corequisites],
  ] as const) {
    for (const { count, options } of dependencies) {
      const { dependency } = await constrain.addDependency({ course: subject, kind, count });
      for (const option of options) await constrain.addDependencyOption({ dependency, subject: option });
    }
  }
  for (const { year, term } of await courseOffering._cancellations({ course: subject })) {
    await constrain.markCancelled({ subject, year, term: term as Term });
  }
}
