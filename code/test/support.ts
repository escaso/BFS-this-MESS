// Shared helpers for the concept tests.
//
// Tests are written against the design (design/concepts/*.md), not the
// implementation. In particular, refusals are checked by the code and
// sentence the spec declares for them, read from the spec itself, so a test
// fails if the implementation and the design disagree on either.

import { readFileSync } from "node:fs";
import { afterAll, afterEach, beforeAll, expect } from "bun:test";
import { MongoClient, type Db } from "mongodb";

/**
 * Gives every test a fresh, empty database on MONGODB_URI (Bun loads it from
 * .env), and drops it afterwards. Call once at the top level of a test file;
 * read the current database with the returned function.
 */
export function useFreshDb(prefix: string): () => Db {
  const url = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017";
  let client: MongoClient;
  let db: Db | undefined;

  beforeAll(async () => {
    client = new MongoClient(url);
    await client.connect();
  });
  afterEach(async () => {
    await db?.dropDatabase();
    db = undefined;
  });
  afterAll(async () => {
    await client.close();
  });

  return () => (db ??= client.db(`${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`));
}

/** action -> refusal code -> sentence, as declared in the actions of a concept spec. */
function readRefusals(concept: string): Map<string, Map<string, string>> {
  const spec = readFileSync(new URL(`../design/concepts/${concept}.md`, import.meta.url), "utf8");
  const fence = spec.match(/```actions\n([\s\S]*?)```/);
  if (!fence) throw new Error(`${concept}.md has no actions fence`);

  const byAction = new Map<string, Map<string, string>>();
  let action = "";
  for (const line of fence[1].split("\n")) {
    const header = line.match(/^(\w+)\(/);
    if (header) {
      action = header[1];
      byAction.set(action, new Map());
      continue;
    }
    const refusal = line.match(/refuses (\w+) "(.*)"/);
    if (refusal) byAction.get(action)!.set(refusal[1], JSON.parse(`"${refusal[2]}"`));
  }
  return byAction;
}

/**
 * Returns an assertion that a promise is refused by `action` with refusal
 * `code`: it must reject with exactly the sentence the spec gives that code.
 */
export function refusalsOf(concept: string) {
  const byAction = readRefusals(concept);
  return async function expectRefusal(action: string, code: string, promise: Promise<unknown>) {
    const message = byAction.get(action)?.get(code);
    if (message === undefined) throw new Error(`${concept}.${action} declares no refusal ${code}`);
    await expect(promise).rejects.toHaveProperty("message", message);
  };
}
