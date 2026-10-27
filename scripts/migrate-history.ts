// Migrates the database at MONGODB_URI to or from account history and time budgets.
//
//   bun scripts/migrate-history.ts up
//   bun scripts/migrate-history.ts down [--drop]
//
// up writes the defaults that the code already assumes when a field is absent: an empty
// history on each road, and fromHistory false on each semester. Old data works without
// it; it only makes the documents uniform.
//
// down returns roads to the shape they had before history: it removes their history
// and fromHistory fields. Semesters placed from a history stay locked with their pins,
// as ordinary locks, so no road loses what it shows. With --drop it also deletes the
// History and TimeBudget collections, which loses every account history and week.

import { parseArgs } from "node:util";
import { client, db } from "../src/db.ts";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { drop: { type: "boolean", default: false } },
});
const direction = positionals[0];
if (direction !== "up" && direction !== "down") {
  console.error("Usage: bun scripts/migrate-history.ts up | down [--drop]");
  process.exit(1);
}

const roads = db.collection("constrain.roads");
const NEW_COLLECTIONS = [
  "history.profiles", "history.records",
  "timebudget.categories", "timebudget.templates", "timebudget.blocks",
  "timebudget.settings", "timebudget.subjectFactors", "timebudget.roadSettings",
];

try {
  if (direction === "up") {
    const withHistory = await roads.updateMany({ history: { $exists: false } }, { $set: { history: "" } });
    const withFlag = await roads.updateMany(
      { semesters: { $elemMatch: { fromHistory: { $exists: false } } } },
      { $set: { "semesters.$[s].fromHistory": false } },
      { arrayFilters: [{ "s.fromHistory": { $exists: false } }] },
    );
    console.log(`up: ${withHistory.modifiedCount} roads given an empty history, ${withFlag.modifiedCount} roads' semesters marked.`);
  } else {
    const result = await roads.updateMany({}, { $unset: { history: "", "semesters.$[].fromHistory": "" } });
    console.log(`down: ${result.modifiedCount} roads returned to their earlier shape.`);
    if (values.drop) {
      const existing = new Set((await db.listCollections().toArray()).map((c) => c.name));
      for (const name of NEW_COLLECTIONS.filter((n) => existing.has(n))) await db.dropCollection(name);
      console.log("down: History and TimeBudget collections deleted.");
    }
  }
} finally {
  await client.close();
}
