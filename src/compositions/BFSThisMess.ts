import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { compute, each, form, former, no, reaction, when, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

const { Authentication, Share, CourseOffering, Constrain } = concepts;

type Var = symbol;

// ---------- Access checks ----------
// Every request about a road runs these checks in order (see design/compositions/BFSThisMess.md).
// Each helper is one sibling branch; an endpoint lists the branches that apply to it.

// 1. No valid session.
const noSession = (session: Var) =>
  where(no(Authentication._authenticate({ session })))
    .then(respond({ error: "NO_SUCH_SESSION" }))
    .named("no-session");

// 2. The road does not exist, or the requester may not view it. The two look the same.
const hiddenRoad = (session: Var, user: Var, road: Var) =>
  where(
    Authentication._authenticate({ session }).is({ user }),
    Share._canView({ road, user }).is({ allowed: false }),
  )
    .then(respond({ error: "NO_SUCH_ROAD" }))
    .named("hidden-road");

// 3. Someone the road is shared with asks for something only the owner may do.
const viewerOnly = (session: Var, user: Var, road: Var) =>
  where(
    Authentication._authenticate({ session }).is({ user }),
    Share._canView({ road, user }).is({ allowed: true }),
    Share._isOwner({ road, user }).is({ owner: false }),
  )
    .then(respond({ error: "NOT_AN_OWNER" }))
    .named("not-owner");

const asOwner = (session: Var, user: Var, road: Var, ...more: Parameters<typeof where>) =>
  where(
    Authentication._authenticate({ session }).is({ user }),
    Share._isOwner({ road, user }).is({ owner: true }),
    ...more,
  );

const asViewer = (session: Var, user: Var, road: Var) =>
  where(Authentication._authenticate({ session }).is({ user }), Share._canView({ road, user }).is({ allowed: true }));

// The same checks for requests that name a block: its road is found first.
const missingBlock = (session: Var, block: Var) =>
  where(Authentication._authenticate({ session }), no(Constrain._roadOfBlock({ block })))
    .then(respond({ error: "NO_SUCH_BLOCK" }))
    .named("missing-block");

const hiddenBlock = (session: Var, user: Var, block: Var, road: Var) =>
  where(
    Authentication._authenticate({ session }).is({ user }),
    Constrain._roadOfBlock({ block }).is({ road }),
    Share._canView({ road, user }).is({ allowed: false }),
  )
    .then(respond({ error: "NO_SUCH_BLOCK" }))
    .named("hidden-block");

const blockViewerOnly = (session: Var, user: Var, block: Var, road: Var) =>
  where(
    Authentication._authenticate({ session }).is({ user }),
    Constrain._roadOfBlock({ block }).is({ road }),
    Share._canView({ road, user }).is({ allowed: true }),
    Share._isOwner({ road, user }).is({ owner: false }),
  )
    .then(respond({ error: "NOT_AN_OWNER" }))
    .named("not-owner");

const asBlockOwner = (session: Var, user: Var, block: Var, road: Var) =>
  where(
    Authentication._authenticate({ session }).is({ user }),
    Constrain._roadOfBlock({ block }).is({ road }),
    Share._isOwner({ road, user }).is({ owner: true }),
  );

// ---------- Formers (read side) ----------

const MatchingCourses = former(
  "the matching courses",
  ({ query, level, term }, { course, name, courseId, courseLevel, units, unitsKnown, terms }) =>
    form({
      courses: each(
        CourseOffering._search({ query, level, term }).is({
          course, name, courseId, level: courseLevel, units, unitsKnown, terms,
        }),
      ).form({ course, name, courseId, level: courseLevel, units, unitsKnown, terms }),
    }),
);

const CourseDetails = former(
  "the details of a course",
  (
    { course },
    {
      found, name, courseId, description, lecturer, level, units, offering, canBeRepeated,
      prerequisitesText, corequisitesText,
      term, prereqDependency, prereqCount, prerequisite, coreqDependency, coreqCount, corequisite,
      cancelledYear, cancelledTerm,
    },
  ) =>
    where(
      CourseOffering._course({ course }).is({
        found, name, courseId, description, lecturer, level, units, offering, canBeRepeated,
        prerequisitesText, corequisitesText,
      }),
    ).form({
      found, name, courseId, description, lecturer, level, units, offering, canBeRepeated,
      prerequisitesText, corequisitesText,
      terms: each(CourseOffering._terms({ course }).is({ term })).form({ term }),
      prerequisites: each(
        CourseOffering._prerequisites({ course }).is({
          dependency: prereqDependency, count: prereqCount, prerequisite,
        }),
      ).form({ dependency: prereqDependency, count: prereqCount, subject: prerequisite }),
      corequisites: each(
        CourseOffering._corequisites({ course }).is({
          dependency: coreqDependency, count: coreqCount, corequisite,
        }),
      ).form({ dependency: coreqDependency, count: coreqCount, subject: corequisite }),
      cancellations: each(
        CourseOffering._cancellations({ course }).is({ year: cancelledYear, term: cancelledTerm }),
      ).form({ year: cancelledYear, term: cancelledTerm }),
    }),
);

const CourseRatings = former(
  "the ratings of a course",
  ({ course }, { found, classRating, url }) =>
    form({
      ratings: each(CourseOffering._ratings({ course }).is({ found, classRating, url })).form({
        found,
        classRating,
        url,
      }),
    }),
);

const CourseSchedule = former(
  "the schedule of a course",
  ({ course }, { found, units, meetingTimes, location }) =>
    form({
      schedule: each(
        CourseOffering._schedule({ course }).is({ found, units, meetingTimes, location }),
      ).form({ found, units, meetingTimes, location }),
    }),
);

const RoadConstraints = former(
  "the constraints of a road",
  (
    { road },
    {
      name, major, startYear, startTerm, endYear, endTerm,
      priorSubject,
      block, count, option,
      pinSubject, pinYear, pinTerm,
      year, term, locked, maxUnits, maxTechnicalUnits,
    },
  ) =>
    where(Constrain._road({ road }).is({ name, major, startYear, startTerm, endYear, endTerm })).form({
      name,
      major,
      startYear,
      startTerm,
      endYear,
      endTerm,
      prior: each(Constrain._prior({ road }).is({ subject: priorSubject })).form({ subject: priorSubject }),
      blocks: each(Constrain._blocks({ road }).is({ block, count, subject: option })).form({
        block,
        count,
        subject: option,
      }),
      pins: each(Constrain._pins({ road }).is({ subject: pinSubject, year: pinYear, term: pinTerm })).form({
        subject: pinSubject,
        year: pinYear,
        term: pinTerm,
      }),
      semesters: each(
        Constrain._semesters({ road }).is({ year, term, locked, maxUnits, maxTechnicalUnits }),
      ).form({ year, term, locked, maxUnits, maxTechnicalUnits }),
    }),
);

const RoadPaths = former(
  "the paths of a road",
  ({ road, includeIAPAndSummer, limit }, { plan, year, term, subject }) =>
    form({
      plans: each(
        Constrain._findPath({ road, includeIAPAndSummer, limit }).is({ plan, year, term, subject }),
      ).form({ plan, year, term, subject }),
    }),
);

const RoadOptions = former(
  "the options of a road",
  ({ road, includeIAPAndSummer }, { year, term, subject, fitsByEnd }) =>
    form({
      options: each(
        Constrain._options({ road, includeIAPAndSummer }).is({ year, term, subject, fitsByEnd }),
      ).form({ year, term, subject, fitsByEnd }),
    }),
);

const PlanVerdict = former("the verdict on a plan", ({ road }, { satisfied }) =>
  where(Constrain._satisfies({ road }).is({ satisfied })).form({ satisfied }),
);

const PinsLostByStart = former(
  "the pins lost by moving the start",
  ({ road, year, term }, { subject, pinYear, pinTerm }) =>
    form({
      pins: each(
        Constrain._pinsLostBySetStart({ road, year, term }).is({ subject, year: pinYear, term: pinTerm }),
      ).form({ subject, year: pinYear, term: pinTerm }),
    }),
);

const PinsLostByEnd = former(
  "the pins lost by moving the end",
  ({ road, year, term }, { subject, pinYear, pinTerm }) =>
    form({
      pins: each(
        Constrain._pinsLostBySetEnd({ road, year, term }).is({ subject, year: pinYear, term: pinTerm }),
      ).form({ subject, year: pinYear, term: pinTerm }),
    }),
);

const RoadViewers = former("the people a road is shared with", ({ road }, { user, username }) =>
  form({
    viewers: each(Share._viewers({ road }).is({ user }))
      .where(Authentication._username({ user }).is({ username }))
      .form({ username }),
  }),
);

const UserRoads = former(
  "the roads of a user",
  ({ user }, { owned, ownedName, ownedMajor, shared, sharedName, sharedMajor }) =>
    form({
      owned: each(Share._roadsOwnedBy({ user }).is({ road: owned }))
        .where(Constrain._road({ road: owned }).is({ name: ownedName, major: ownedMajor }))
        .form({ road: owned, name: ownedName, major: ownedMajor }),
      shared: each(Share._roadsSharedWith({ user }).is({ road: shared }))
        .where(Constrain._road({ road: shared }).is({ name: sharedName, major: sharedMajor }))
        .form({ road: shared, name: sharedName, major: sharedMajor }),
    }),
);

// ---------- Accounts ----------

const Register = endpoint("/bfsthismess/register", ({ username, password, user }) =>
  receive({ username, password })
    .then(Authentication.register({ username, password }).responds({ user }))
    .then(respond({ user })),
);

const LogIn = endpoint("/bfsthismess/logIn", ({ username, password, session }) =>
  receive({ username, password })
    .then(Authentication.login({ username, password }).responds({ session }))
    .then(respond({ session })),
);

const LogOut = endpoint("/bfsthismess/logOut", ({ session }) =>
  receive({ session })
    .then(Authentication.logout({ session }).responds({}))
    .then(respond({})),
);

// ---------- Catalog ----------

// The catalog is loaded from catalog/snapshot.json when the server starts (src/catalog/import.ts),
// so loading has no endpoint. An empty level or term means any.
const SearchSubjects = endpoint("/bfsthismess/searchSubjects", ({ query, level, term }) =>
  receive({ query, level, term }).then(respond({ courses: MatchingCourses({ query, level, term }) })),
);

const ViewSubject = endpoint("/bfsthismess/viewSubject", ({ course }) =>
  receive({ course }).then(respond({ subject: CourseDetails({ course }) })),
);

const ViewRatings = endpoint("/bfsthismess/viewRatings", ({ course }) =>
  receive({ course }).then(respond({ ratings: CourseRatings({ course }) })),
);

const ViewSchedule = endpoint("/bfsthismess/viewSchedule", ({ course }) =>
  receive({ course }).then(respond({ schedule: CourseSchedule({ course }) })),
);

// ---------- Roads ----------

// The road is created and then claimed by the requester in the same request. The claim
// stage reads the session again because a binding from a read does not reach a later stage.
const NewRoad = endpoint(
  "/bfsthismess/newRoad",
  ({ session, user, name, major, startYear, startTerm, road }) =>
    receive({ session, name, major, startYear, startTerm })
      .where(Authentication._authenticate({ session }))
      .then(Constrain.newRoad({ name, major, startYear, startTerm }).responds({ road }))
      .then(
        where(Authentication._authenticate({ session }).is({ user }))
          .then(Share.claim({ road, user }).responds({}))
          .then(respond({ road })),
      ),
);

// Same path as NewRoad: without a valid session no road is created.
const NewRoadWithoutSession = endpoint(
  "/bfsthismess/newRoad",
  ({ session, name, major, startYear, startTerm }) =>
    receive({ session, name, major, startYear, startTerm })
      .where(no(Authentication._authenticate({ session })))
      .then(respond({ error: "NO_SUCH_SESSION" })),
);

// A road never exists without an owner: if the claim is refused, the new road is deleted.
const DeleteUnclaimedRoad = reaction(({ road }) =>
  when(Share.claim({ road }).refuses({})).then(Constrain.deleteRoad({ road })),
);

const DeleteRoad = endpoint("/bfsthismess/deleteRoad", ({ session, user, road }) =>
  receive({ session, road }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewerOnly(session, user, road),
    asOwner(session, user, road)
      .then(Constrain.deleteRoad({ road }).responds({}))
      .then(respond({}))
      .named("owner"),
  ),
);

// A deleted road keeps no owner and no viewers.
const ReleaseRoad = reaction(({ road }) =>
  when(Constrain.deleteRoad({ road }).responds({})).then(Share.release({ road })),
);

const RenameRoad = endpoint("/bfsthismess/renameRoad", ({ session, user, road, name }) =>
  receive({ session, road, name }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewerOnly(session, user, road),
    asOwner(session, user, road)
      .then(Constrain.renameRoad({ road, name }).responds({}))
      .then(respond({}))
      .named("owner"),
  ),
);

const SetStart = endpoint("/bfsthismess/setStart", ({ session, user, road, year, term }) =>
  receive({ session, road, year, term }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewerOnly(session, user, road),
    asOwner(session, user, road)
      .then(Constrain.setStart({ road, year, term }).responds({}))
      .then(respond({}))
      .named("owner"),
  ),
);

const SetEnd = endpoint("/bfsthismess/setEnd", ({ session, user, road, year, term }) =>
  receive({ session, road, year, term }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewerOnly(session, user, road),
    asOwner(session, user, road)
      .then(Constrain.setEnd({ road, year, term }).responds({}))
      .then(respond({}))
      .named("owner"),
  ),
);

const SetMajor = endpoint("/bfsthismess/setMajor", ({ session, user, road, major }) =>
  receive({ session, road, major }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewerOnly(session, user, road),
    asOwner(session, user, road)
      .then(Constrain.setMajor({ road, major }).responds({}))
      .then(respond({}))
      .named("owner"),
  ),
);

const AddPrior = endpoint("/bfsthismess/addPrior", ({ session, user, road, subject }) =>
  receive({ session, road, subject }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewerOnly(session, user, road),
    asOwner(session, user, road)
      .then(Constrain.addPrior({ road, subject }).responds({}))
      .then(respond({}))
      .named("owner"),
  ),
);

const RemovePrior = endpoint("/bfsthismess/removePrior", ({ session, user, road, subject }) =>
  receive({ session, road, subject }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewerOnly(session, user, road),
    asOwner(session, user, road)
      .then(Constrain.removePrior({ road, subject }).responds({}))
      .then(respond({}))
      .named("owner"),
  ),
);

const Pin = endpoint("/bfsthismess/pin", ({ session, user, road, subject, year, term }) =>
  receive({ session, road, subject, year, term }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewerOnly(session, user, road),
    asOwner(session, user, road)
      .then(Constrain.pin({ road, subject, year, term }).responds({}))
      .then(respond({}))
      .named("owner"),
  ),
);

const UnPin = endpoint("/bfsthismess/unPin", ({ session, user, road, subject }) =>
  receive({ session, road, subject }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewerOnly(session, user, road),
    asOwner(session, user, road)
      .then(Constrain.unPin({ road, subject }).responds({}))
      .then(respond({}))
      .named("owner"),
  ),
);

const SetLocked = endpoint("/bfsthismess/setLocked", ({ session, user, road, year, term, locked }) =>
  receive({ session, road, year, term, locked }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewerOnly(session, user, road),
    asOwner(session, user, road)
      .then(Constrain.setLocked({ road, year, term, locked }).responds({}))
      .then(respond({}))
      .named("owner"),
  ),
);

const SetCap = endpoint("/bfsthismess/setCap", ({ session, user, road, year, term, capType, limit }) =>
  receive({ session, road, year, term, capType, limit }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewerOnly(session, user, road),
    asOwner(session, user, road)
      .then(Constrain.setCap({ road, year, term, capType, limit }).responds({}))
      .then(respond({}))
      .named("owner"),
  ),
);

const ClearCap = endpoint("/bfsthismess/clearCap", ({ session, user, road, year, term, capType }) =>
  receive({ session, road, year, term, capType }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewerOnly(session, user, road),
    asOwner(session, user, road)
      .then(Constrain.clearCap({ road, year, term, capType }).responds({}))
      .then(respond({}))
      .named("owner"),
  ),
);

const ResetSemester = endpoint("/bfsthismess/resetSemester", ({ session, user, road, year, term }) =>
  receive({ session, road, year, term }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewerOnly(session, user, road),
    asOwner(session, user, road)
      .then(Constrain.resetSemester({ road, year, term }).responds({}))
      .then(respond({}))
      .named("owner"),
  ),
);

// ---------- Blocks ----------

const AddBlock = endpoint("/bfsthismess/addBlock", ({ session, user, road, count, block }) =>
  receive({ session, road, count }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewerOnly(session, user, road),
    asOwner(session, user, road)
      .then(Constrain.addBlock({ road, count }).responds({ block }))
      .then(respond({ block }))
      .named("owner"),
  ),
);

const SetCount = endpoint("/bfsthismess/setCount", ({ session, user, block, road, count }) =>
  receive({ session, block, count }).then(
    noSession(session),
    missingBlock(session, block),
    hiddenBlock(session, user, block, road),
    blockViewerOnly(session, user, block, road),
    asBlockOwner(session, user, block, road)
      .then(Constrain.setCount({ block, count }).responds({}))
      .then(respond({}))
      .named("owner"),
  ),
);

const AddOption = endpoint("/bfsthismess/addOption", ({ session, user, block, road, subject }) =>
  receive({ session, block, subject }).then(
    noSession(session),
    missingBlock(session, block),
    hiddenBlock(session, user, block, road),
    blockViewerOnly(session, user, block, road),
    asBlockOwner(session, user, block, road)
      .then(Constrain.addOption({ block, subject }).responds({}))
      .then(respond({}))
      .named("owner"),
  ),
);

const RemoveOption = endpoint("/bfsthismess/removeOption", ({ session, user, block, road, subject }) =>
  receive({ session, block, subject }).then(
    noSession(session),
    missingBlock(session, block),
    hiddenBlock(session, user, block, road),
    blockViewerOnly(session, user, block, road),
    asBlockOwner(session, user, block, road)
      .then(Constrain.removeOption({ block, subject }).responds({}))
      .then(respond({}))
      .named("owner"),
  ),
);

const RemoveBlock = endpoint("/bfsthismess/removeBlock", ({ session, user, block, road }) =>
  receive({ session, block }).then(
    noSession(session),
    missingBlock(session, block),
    hiddenBlock(session, user, block, road),
    blockViewerOnly(session, user, block, road),
    asBlockOwner(session, user, block, road)
      .then(Constrain.removeBlock({ block }).responds({}))
      .then(respond({}))
      .named("owner"),
  ),
);

// ---------- Sharing ----------

const ShareRoad = endpoint("/bfsthismess/shareRoad", ({ session, requester, road, username, user }) =>
  receive({ session, road, username }).then(
    noSession(session),
    hiddenRoad(session, requester, road),
    viewerOnly(session, requester, road),
    asOwner(session, requester, road, no(Authentication._lookup({ username })))
      .then(respond({ error: "NO_SUCH_USER" }))
      .named("no-such-user"),
    asOwner(session, requester, road, Authentication._lookup({ username }).is({ user }))
      .then(Share.share({ road, requester, user }).responds({}))
      .then(respond({}))
      .named("owner"),
  ),
);

const UnshareRoad = endpoint("/bfsthismess/unshareRoad", ({ session, requester, road, username, user }) =>
  receive({ session, road, username }).then(
    noSession(session),
    hiddenRoad(session, requester, road),
    viewerOnly(session, requester, road),
    asOwner(session, requester, road, no(Authentication._lookup({ username })))
      .then(respond({ error: "NO_SUCH_USER" }))
      .named("no-such-user"),
    asOwner(session, requester, road, Authentication._lookup({ username }).is({ user }))
      .then(Share.unshare({ road, requester, user }).responds({}))
      .then(respond({}))
      .named("owner"),
  ),
);

const ViewSharing = endpoint("/bfsthismess/viewSharing", ({ session, user, road }) =>
  receive({ session, road }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewerOnly(session, user, road),
    asOwner(session, user, road)
      .then(respond({ viewers: RoadViewers({ road }) }))
      .named("owner"),
  ),
);

// ---------- Paths and viewing ----------

const MyRoads = endpoint("/bfsthismess/myRoads", ({ session, user }) =>
  receive({ session }).then(
    noSession(session),
    where(Authentication._authenticate({ session }).is({ user }))
      .then(respond({ roads: UserRoads({ user }) }))
      .named("signed-in"),
  ),
);

const FindPaths = endpoint(
  "/bfsthismess/findPaths",
  ({ session, user, road, includeIAPAndSummer, limit }) =>
    receive({ session, road, includeIAPAndSummer, limit }).then(
      noSession(session),
      hiddenRoad(session, user, road),
      asViewer(session, user, road)
        .then(respond({ paths: RoadPaths({ road, includeIAPAndSummer, limit }) }))
        .named("viewer"),
    ),
);

const ViewRoad = endpoint(
  "/bfsthismess/viewRoad",
  ({ session, user, road, includeIAPAndSummer, limit }) =>
    receive({ session, road, includeIAPAndSummer, limit }).then(
      noSession(session),
      hiddenRoad(session, user, road),
      asViewer(session, user, road)
        .then(
          respond({
            constraints: RoadConstraints({ road }),
            paths: RoadPaths({ road, includeIAPAndSummer, limit }),
          }),
        )
        .named("viewer"),
    ),
);

const ViewOptions = endpoint(
  "/bfsthismess/viewOptions",
  ({ session, user, road, includeIAPAndSummer }) =>
    receive({ session, road, includeIAPAndSummer }).then(
      noSession(session),
      hiddenRoad(session, user, road),
      asViewer(session, user, road)
        .then(respond({ options: RoadOptions({ road, includeIAPAndSummer }) }))
        .named("viewer"),
    ),
);

const CheckPlan = endpoint("/bfsthismess/checkPlan", ({ session, user, road }) =>
  receive({ session, road }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    asViewer(session, user, road)
      .then(respond({ verdict: PlanVerdict({ road }) }))
      .named("viewer"),
  ),
);

const PreviewStartChange = endpoint(
  "/bfsthismess/previewStartChange",
  ({ session, user, road, year, term }) =>
    receive({ session, road, year, term }).then(
      noSession(session),
      hiddenRoad(session, user, road),
      asViewer(session, user, road)
        .then(respond({ lost: PinsLostByStart({ road, year, term }) }))
        .named("viewer"),
    ),
);

const PreviewEndChange = endpoint(
  "/bfsthismess/previewEndChange",
  ({ session, user, road, year, term }) =>
    receive({ session, road, year, term }).then(
      noSession(session),
      hiddenRoad(session, user, road),
      asViewer(session, user, road)
        .then(respond({ lost: PinsLostByEnd({ road, year, term }) }))
        .named("viewer"),
    ),
);

export const composition = {
  MatchingCourses,
  CourseDetails,
  CourseRatings,
  CourseSchedule,
  RoadConstraints,
  RoadPaths,
  RoadOptions,
  PlanVerdict,
  PinsLostByStart,
  PinsLostByEnd,
  RoadViewers,
  UserRoads,
  Register,
  LogIn,
  LogOut,
  SearchSubjects,
  ViewSubject,
  ViewRatings,
  ViewSchedule,
  NewRoad,
  NewRoadWithoutSession,
  DeleteUnclaimedRoad,
  DeleteRoad,
  ReleaseRoad,
  RenameRoad,
  SetStart,
  SetEnd,
  SetMajor,
  AddPrior,
  RemovePrior,
  Pin,
  UnPin,
  SetLocked,
  SetCap,
  ClearCap,
  ResetSemester,
  AddBlock,
  SetCount,
  AddOption,
  RemoveOption,
  RemoveBlock,
  ShareRoad,
  UnshareRoad,
  ViewSharing,
  MyRoads,
  FindPaths,
  ViewRoad,
  ViewOptions,
  CheckPlan,
  PreviewStartChange,
  PreviewEndChange,
};
