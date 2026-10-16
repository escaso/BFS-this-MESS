import { assemble } from "@mit-sdg/sync-engine/assembly";
import { composition } from "./compositions/BFSThisMess.ts";
import { AuthenticationConcept } from "./concepts/Authentication.ts";
import { ConstrainConcept } from "./concepts/Constrain.ts";
import { CourseOfferingConcept } from "./concepts/CourseOffering.ts";
import { ShareConcept } from "./concepts/Share.ts";
import { applicationConceptSet } from "./concepts.ts";
import { db } from "./db.ts";

export function assembleApplication() {
  return assemble({
    conceptSet: applicationConceptSet,
    // Keys must match the names in conceptSet({...}) in concepts.ts.
    instances: {
      // Share: new ShareConcept(db),
      Constrain: new ConstrainConcept(db),
      CourseOffering: new CourseOfferingConcept(db),
      // Authentication: new AuthenticationConcept(db),
    },
    composition: { BFSThisMess: composition },
    // Print what went wrong. Otherwise a failure only shows up as INTERNAL_ERROR.
    rawFaultReporter: ({ error }) => console.error(error),
  });
}