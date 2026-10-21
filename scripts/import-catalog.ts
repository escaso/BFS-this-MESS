// Loads catalog/snapshot.json into the database at MONGODB_URI now, instead of waiting
// for the server to start. --force reloads it even if that snapshot is already loaded.
//
//   bun run catalog:import [--force]

import { parseArgs } from "node:util";
import { client, db } from "../src/db.ts";
import { importCatalog } from "../src/catalog/import.ts";

const { values } = parseArgs({ options: { force: { type: "boolean", default: false } } });

try {
  await importCatalog(db, { force: values.force });
} finally {
  await client.close();
}
