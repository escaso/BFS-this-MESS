import { assemble } from "@mit-sdg/sync-engine/assembly";
import { composition } from "./compositions/BFSThisMess.ts";
import { AuthenticationConcept } from "./concepts/Authentication.ts";
import { ConstrainConcept } from "./concepts/Constrain.ts";
import { CourseOfferingConcept } from "./concepts/CourseOffering.ts";
import { RequirementsConcept } from "./concepts/Requirements.ts";
import { ShareConcept } from "./concepts/Share.ts";
import { applicationConceptSet } from "./concepts.ts";
import type { Db } from "mongodb";
import { db } from "./db.ts";

// database is the app's own unless a test gives a fresh one.
export function assembleApplication(database: Db = db) {
  return assemble({
    conceptSet: applicationConceptSet,
    // Keys must match the names in conceptSet({...}) in concepts.ts.
    instances: {
      Share: new ShareConcept(database),
      Constrain: new ConstrainConcept(database),
      CourseOffering: new CourseOfferingConcept(database),
      Requirements: new RequirementsConcept(database),
      Authentication: new AuthenticationConcept(database),
    },
    composition: { BFSThisMess: composition },
    // Print what went wrong. Otherwise a failure only shows up as INTERNAL_ERROR.
    rawFaultReporter: ({ error }) => console.error(error),
  });
}