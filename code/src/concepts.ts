import { conceptSet, registerConcept } from "@mit-sdg/sync-engine/assembly";

import shareSpec from "@design/concepts/Share.md" with { type: "text" };
import constrainSpec from "@design/concepts/Constrain.md" with { type: "text" };
import courseOfferingSpec from "@design/concepts/CourseOffering.md" with { type: "text" };
import authenticationSpec from "@design/concepts/Authentication.md" with { type: "text" };

import { RoadAlreadyOwned, NoSuchRoad as ShareNoSuchRoad, NotAnOwner, InvalidUser, ShareConcept } from "./concepts/Share.ts";
import { NoSuchRoad as ConstrainNoSuchRoad, RequirementNotMet, ElectiveBlockNotFound, PinNotFound, ConstrainConcept } from "./concepts/Constrain.ts";
import { CourseOfferingConcept } from "./concepts/CourseOffering.ts";
import { UsernameTaken, InvalidCredentials, NoSuchSession, AuthenticationConcept } from "./concepts/Authentication.ts";

const share = registerConcept({
  class: ShareConcept,
  spec: shareSpec,
  refusals: { ROAD_ALREADY_OWNED: RoadAlreadyOwned, NO_SUCH_ROAD: ShareNoSuchRoad, NOT_AN_OWNER: NotAnOwner, INVALID_USER: InvalidUser },
});

const constrain = registerConcept({
  class: ConstrainConcept,
  spec: constrainSpec,
  refusals: { NO_SUCH_ROAD: ConstrainNoSuchRoad, REQUIREMENT_NOT_MET: RequirementNotMet, ELECTIVE_BLOCK_NOT_FOUND: ElectiveBlockNotFound, PIN_NOT_FOUND: PinNotFound },
});

const courseOffering = registerConcept({
  class: CourseOfferingConcept,
  spec: courseOfferingSpec,
  refusals: {},
});

const authentication = registerConcept({
  class: AuthenticationConcept,
  spec: authenticationSpec,
  refusals: { USERNAME_TAKEN: UsernameTaken, INVALID_CREDENTIALS: InvalidCredentials, NO_SUCH_SESSION: NoSuchSession },
});

export const applicationConceptSet = conceptSet({
  Share: share,
  Constrain: constrain,
  CourseOffering: courseOffering,
  Authentication: authentication,
});

export const { concepts } = applicationConceptSet;