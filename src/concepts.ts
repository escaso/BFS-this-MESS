import { conceptSet, registerConcept } from "@mit-sdg/sync-engine/assembly";

import shareSpec from "@design/concepts/Share.md" with { type: "text" };
import constrainSpec from "@design/concepts/Constrain.md" with { type: "text" };
import courseOfferingSpec from "@design/concepts/CourseOffering.md" with { type: "text" };
import authenticationSpec from "@design/concepts/Authentication.md" with { type: "text" };
import requirementsSpec from "@design/concepts/Requirements.md" with { type: "text" };

import {
  RoadAlreadyOwned, NoSuchRoad as ShareNoSuchRoad, NotAnOwner, NotAnEditor, BadRole, EditorsAddViewers, ShareWithOwner,
  NotShared, InvalidLink, ShareConcept,
} from "./concepts/Share.ts";
import {
  NoSuchRoad as ConstrainNoSuchRoad, PinNotFound, EmptyName, BadStart, EndBeforeStart, EmptyMajor, NotPrior, BadCount,
  NoSuchBlock, NotAnOption, NoListing, NoSnapshot, AlreadyPrior, OutOfSpan, LockedSeason, BadCapType, NegativeLimit, NoSuchSemester,
  NotATerm, NoSuchDependency, NotCancelled, ConstrainConcept,
} from "./concepts/Constrain.ts";
import { LoadFailed, CourseOfferingConcept } from "./concepts/CourseOffering.ts";
import {
  LoadFailed as RequirementsLoadFailed, NoSuchChoice, NotAnAlternative, RequirementsConcept,
} from "./concepts/Requirements.ts";
import {
  EmptyCredentials, UsernameTaken, InvalidCredentials, NoSuchSession, AuthenticationConcept,
} from "./concepts/Authentication.ts";

const share = registerConcept({
  class: ShareConcept,
  spec: shareSpec,
  refusals: {
    ROAD_ALREADY_OWNED: RoadAlreadyOwned,
    NO_SUCH_ROAD: ShareNoSuchRoad,
    NOT_AN_OWNER: NotAnOwner,
    NOT_AN_EDITOR: NotAnEditor,
    BAD_ROLE: BadRole,
    EDITORS_ADD_VIEWERS: EditorsAddViewers,
    SHARE_WITH_OWNER: ShareWithOwner,
    NOT_SHARED: NotShared,
    INVALID_LINK: InvalidLink,
  },
});

const constrain = registerConcept({
  class: ConstrainConcept,
  spec: constrainSpec,
  refusals: {
    NO_SUCH_ROAD: ConstrainNoSuchRoad,
    NOT_PINNED: PinNotFound,
    EMPTY_NAME: EmptyName,
    BAD_START: BadStart,
    END_BEFORE_START: EndBeforeStart,
    EMPTY_MAJOR: EmptyMajor,
    NOT_PRIOR: NotPrior,
    BAD_COUNT: BadCount,
    NO_SUCH_BLOCK: NoSuchBlock,
    NOT_AN_OPTION: NotAnOption,
    NO_LISTING: NoListing,
    NO_SNAPSHOT: NoSnapshot,
    ALREADY_PRIOR: AlreadyPrior,
    OUT_OF_SPAN: OutOfSpan,
    LOCKED_SEASON: LockedSeason,
    BAD_CAP_TYPE: BadCapType,
    NEGATIVE_LIMIT: NegativeLimit,
    NO_SUCH_SEMESTER: NoSuchSemester,
    NOT_A_TERM: NotATerm,
    NO_SUCH_DEPENDENCY: NoSuchDependency,
    NOT_CANCELLED: NotCancelled,
  },
});

const courseOffering = registerConcept({
  class: CourseOfferingConcept,
  spec: courseOfferingSpec,
  refusals: { LOAD_FAILED: LoadFailed },
});

const requirements = registerConcept({
  class: RequirementsConcept,
  spec: requirementsSpec,
  refusals: {
    LOAD_FAILED: RequirementsLoadFailed,
    NO_SUCH_CHOICE: NoSuchChoice,
    NOT_AN_ALTERNATIVE: NotAnAlternative,
  },
});

const authentication = registerConcept({
  class: AuthenticationConcept,
  spec: authenticationSpec,
  refusals: {
    EMPTY_CREDENTIALS: EmptyCredentials,
    USERNAME_TAKEN: UsernameTaken,
    INVALID_CREDENTIALS: InvalidCredentials,
    NO_SUCH_SESSION: NoSuchSession,
  },
});

export const applicationConceptSet = conceptSet(
  {
    Share: share,
    Constrain: constrain,
    CourseOffering: courseOffering,
    Requirements: requirements,
    Authentication: authentication,
  },
  {},
);

export const { concepts, computations } = applicationConceptSet;
