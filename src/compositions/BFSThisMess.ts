import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { compute, each, form, former, no, reaction, when, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

const { Authentication, Share, CourseOffering, Constrain, Requirements } = concepts;

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

// 3a. A viewer asks to change the road: only the owner and editors may.
const viewOnly = (session: Var, user: Var, road: Var) =>
  where(
    Authentication._authenticate({ session }).is({ user }),
    Share._canView({ road, user }).is({ allowed: true }),
    Share._canEdit({ road, user }).is({ allowed: false }),
  )
    .then(respond({ error: "NOT_AN_EDITOR" }))
    .named("view-only");

// 3b. An editor or a viewer asks for something only the owner may do.
const notOwner = (session: Var, user: Var, road: Var) =>
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

// The owner or an editor.
const asEditor = (session: Var, user: Var, road: Var, ...more: Parameters<typeof where>) =>
  where(
    Authentication._authenticate({ session }).is({ user }),
    Share._canEdit({ road, user }).is({ allowed: true }),
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

const blockViewOnly = (session: Var, user: Var, block: Var, road: Var) =>
  where(
    Authentication._authenticate({ session }).is({ user }),
    Constrain._roadOfBlock({ block }).is({ road }),
    Share._canView({ road, user }).is({ allowed: true }),
    Share._canEdit({ road, user }).is({ allowed: false }),
  )
    .then(respond({ error: "NOT_AN_EDITOR" }))
    .named("view-only");

const asBlockEditor = (session: Var, user: Var, block: Var, road: Var) =>
  where(
    Authentication._authenticate({ session }).is({ user }),
    Constrain._roadOfBlock({ block }).is({ road }),
    Share._canEdit({ road, user }).is({ allowed: true }),
  );

// A road's major must be one of the majors of Requirements.
const isMajor = (major: Var) => Requirements._list({ list: major }).is({ found: true, kind: "MAJOR" });
const notAMajor = (major: Var) => no(isMajor(major));

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

const MajorList = former("the majors", (_, { list, title, shortTitle, mediumTitle }) =>
  form({
    majors: each(Requirements._lists({}).is({ list, title, shortTitle, mediumTitle, kind: "MAJOR" })).form({
      list,
      title,
      shortTitle,
      mediumTitle,
    }),
  }),
);

const RoadRequirements = former(
  "the requirements of a road",
  (
    { road },
    {
      major, found, title, shortTitle,
      item, parent, depth, kind, itemTitle, count, approximate, active, chosen,
      girItem, girParent, girDepth, girKind, girTitle, girCount, girApproximate, girActive, girChosen,
    },
  ) =>
    where(Constrain._road({ road }).is({ major }), Requirements._list({ list: major }).is({ found, title, shortTitle })).form({
      major,
      found,
      title,
      shortTitle,
      items: each(
        Requirements._outline({ list: major, road }).is({ item, parent, depth, kind, title: itemTitle, count, approximate, active, chosen }),
      ).form({ item, parent, depth, kind, title: itemTitle, count, approximate, active, chosen }),
      girs: each(
        Requirements._outline({ list: "girs", road }).is({
          item: girItem, parent: girParent, depth: girDepth, kind: girKind, title: girTitle, count: girCount,
          approximate: girApproximate, active: girActive, chosen: girChosen,
        }),
      ).form({
        item: girItem, parent: girParent, depth: girDepth, kind: girKind, title: girTitle, count: girCount,
        approximate: girApproximate, active: girActive, chosen: girChosen,
      }),
    }),
);

const RoadConstraints = former(
  "the constraints of a road",
  (
    { road },
    {
      name, major, startYear, startTerm, endYear, endTerm,
      priorSubject,
      block, count, option, blockTitle, blockTechnical, blockOrigin,
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
      blocks: each(
        Constrain._blocks({ road }).is({ block, count, subject: option, title: blockTitle, technical: blockTechnical, origin: blockOrigin }),
      ).form({ block, count, subject: option, title: blockTitle, technical: blockTechnical, origin: blockOrigin }),
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
  ({ road, includeIAPAndSummer, limit }, { plan, year, term, subject, slot, title, units, counts }) =>
    form({
      plans: each(
        Constrain._findPath({ road, includeIAPAndSummer, limit }).is({ plan, year, term, subject, slot, title, units, counts }),
      ).form({ plan, year, term, subject, slot, title, units, counts }),
    }),
);

// A slot's subjects whose name or description has the topic in it.
const SlotSubjects = former(
  "the subjects for a slot",
  ({ road, blocks, year, term, topic }, { subject, name, units }) =>
    form({
      subjects: each(Constrain._slotOptions({ road, blocks, year, term }).is({ subject }))
        .where(
          CourseOffering._matches({ course: subject, query: topic }).is({ matches: true }),
          CourseOffering._course({ course: subject }).is({ name, units }),
        )
        .form({ subject, name, units }),
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

// The people requester may see on a road: everyone for the owner, their own invitees for an editor.
const RoadPeople = former(
  "the people a road is shared with",
  ({ road, requester }, { user, role, addedBy, username, addedByName }) =>
    form({
      people: each(Share._grantsVisibleTo({ road, requester }).is({ user, role, addedBy }))
        .where(
          Authentication._username({ user }).is({ username }),
          Authentication._username({ user: addedBy }).is({ username: addedByName }),
        )
        .form({ username, role, addedBy: addedByName }),
    }),
);

// Usernames starting with prefix that requester does not already know to have access.
const MatchingPeople = former("the people who match", ({ road, requester, prefix }, { user, username }) =>
  form({
    people: each(Authentication._matching({ prefix }).is({ user, username }))
      .where(Share._known({ road, requester, user }).is({ known: false }))
      .form({ username }),
  }),
);

const RoadLinks = former("the links of a road", ({ road, requester }, { role, token, enabled }) =>
  form({
    links: each(Share._links({ road, requester }).is({ role, token, enabled })).form({ role, token, enabled }),
  }),
);

// A person's role on a road, and the owner's username only where Share._ownerVisibleTo allows.
const RoadAccess = former("their access to a road", ({ road, user }, { role, owner, username }) =>
  where(Share._role({ road, user }).is({ role })).form({
    role,
    sharedBy: each(Share._ownerVisibleTo({ road, user }).is({ owner }))
      .where(Authentication._username({ user: owner }).is({ username }))
      .form({ username }),
  }),
);

const UserRoads = former(
  "the roads of a user",
  ({ user }, { owned, ownedName, ownedMajor, shared, sharedName, sharedMajor, sharedRole, shown, owner, ownerName }) =>
    form({
      owned: each(Share._roadsOwnedBy({ user }).is({ road: owned }))
        .where(Constrain._road({ road: owned }).is({ name: ownedName, major: ownedMajor }))
        .form({ road: owned, name: ownedName, major: ownedMajor }),
      shared: each(Share._roadsSharedWith({ user }).is({ road: shared, role: sharedRole }))
        .where(Constrain._road({ road: shared }).is({ name: sharedName, major: sharedMajor }))
        .form({ road: shared, name: sharedName, major: sharedMajor, role: sharedRole }),
      // The owners shown with shared roads, only where Share._ownerVisibleTo allows.
      sharedBy: each(Share._roadsSharedWith({ user }).is({ road: shown }))
        .where(
          Share._ownerVisibleTo({ road: shown, user }).is({ owner }),
          Authentication._username({ user: owner }).is({ username: ownerName }),
        )
        .form({ road: shown, username: ownerName }),
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
// The major is checked before the road is created. Once claimed, the road's listed blocks
// are put in place (see the Degree requirements reactions) before the request answers. The
// claim stage reads the session again because a binding from a read does not reach a later stage.
const NewRoad = endpoint(
  "/bfsthismess/newRoad",
  ({ session, user, name, major, startYear, startTerm, road }) =>
    receive({ session, name, major, startYear, startTerm })
      .where(Authentication._authenticate({ session }), isMajor(major))
      .then(Constrain.newRoad({ name, major, startYear, startTerm }).responds({ road }))
      .afterFlowSettles()
      .where(Authentication._authenticate({ session }).is({ user }))
      .then(Share.claim({ road, user }).responds({}))
      .then(Constrain.removeListedBlocks({ road }).responds({}))
      .afterFlowSettles()
      .then(respond({ road })),
);

// Same path as NewRoad: a major that is not one of the majors creates no road.
const NewRoadUnknownMajor = endpoint(
  "/bfsthismess/newRoad",
  ({ session, name, major, startYear, startTerm }) =>
    receive({ session, name, major, startYear, startTerm })
      .where(Authentication._authenticate({ session }), notAMajor(major))
      .then(respond({ error: "NO_SUCH_MAJOR" })),
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
    notOwner(session, user, road),
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

const ForgetChoices = reaction(({ road }) =>
  when(Constrain.deleteRoad({ road }).responds({})).then(Requirements.forget({ road })),
);

// ---------- Degree requirements ----------
// Removing a road's listed blocks (in NewRoad, SetMajor and ChooseAlternative) lists them
// again from the road's major and the GIRs, as its choices now stand. Requirements gives
// each its group: a major's blocks ask for distinct subjects, except CI-M and the like, and
// a subject may meet a GIR and the major at once.

const ListMajorBlocks = reaction(({ road, major, item, title, count, technical, group }) =>
  when(Constrain.removeListedBlocks({ road }).responds({}))
    .where(
      Constrain._road({ road }).is({ major }),
      Requirements._activeBlocks({ list: major, road }).is({ item, title, count, technical, group }),
    )
    .then(Constrain.addListedBlock({ road, count, title, technical, group, origin: item, early: false })),
);

const ListGirBlocks = reaction(({ road, item, title, count, technical, group }) =>
  when(Constrain.removeListedBlocks({ road }).responds({}))
    .where(Requirements._activeBlocks({ list: "girs", road }).is({ item, title, count, technical, group }))
    // The GIRs are early: plans take them first when they can.
    .then(Constrain.addListedBlock({ road, count, title, technical, group, origin: item, early: true })),
);

const ListBlockOptions = reaction(({ block, origin, subject }) =>
  when(Constrain.addListedBlock({ origin }).responds({ block }))
    .where(Requirements._options({ item: origin }).is({ subject }))
    .then(Constrain.addOption({ block, subject })),
);

const ListMajors = endpoint("/bfsthismess/listMajors", () => receive({}).then(respond({ majors: MajorList({}) })));

// Answers once the road's listed blocks follow the new choice.
const ChooseAlternative = endpoint(
  "/bfsthismess/chooseAlternative",
  ({ session, user, road, choice, alternative }) =>
    receive({ session, road, choice, alternative })
      .where(Authentication._authenticate({ session }).is({ user }), Share._canEdit({ road, user }).is({ allowed: true }))
      .then(Requirements.choose({ road, choice, alternative }).responds({}))
      .then(Constrain.removeListedBlocks({ road }).responds({}))
      .afterFlowSettles()
      .then(respond({})),
);

// Same path as ChooseAlternative: the requests it refuses.
const ChooseAlternativeRefused = endpoint(
  "/bfsthismess/chooseAlternative",
  ({ session, user, road, choice, alternative }) =>
    receive({ session, road, choice, alternative }).then(
      noSession(session),
      hiddenRoad(session, user, road),
      viewOnly(session, user, road),
    ),
);

// Lists the road's blocks again from the requirements as they are now (after a catalog refresh).
const RefreshRequirements = endpoint("/bfsthismess/refreshRequirements", ({ session, user, road }) =>
  receive({ session, road })
    .where(Authentication._authenticate({ session }).is({ user }), Share._canEdit({ road, user }).is({ allowed: true }))
    .then(Constrain.removeListedBlocks({ road }).responds({}))
    .afterFlowSettles()
    .then(respond({})),
);

const RefreshRequirementsRefused = endpoint("/bfsthismess/refreshRequirements", ({ session, user, road }) =>
  receive({ session, road }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewOnly(session, user, road),
  ),
);

const RenameRoad = endpoint("/bfsthismess/renameRoad", ({ session, user, road, name }) =>
  receive({ session, road, name }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewOnly(session, user, road),
    asEditor(session, user, road)
      .then(Constrain.renameRoad({ road, name }).responds({}))
      .then(respond({}))
      .named("editor"),
  ),
);

const SetStart = endpoint("/bfsthismess/setStart", ({ session, user, road, year, term }) =>
  receive({ session, road, year, term }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewOnly(session, user, road),
    asEditor(session, user, road)
      .then(Constrain.setStart({ road, year, term }).responds({}))
      .then(respond({}))
      .named("editor"),
  ),
);

const SetEnd = endpoint("/bfsthismess/setEnd", ({ session, user, road, year, term }) =>
  receive({ session, road, year, term }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewOnly(session, user, road),
    asEditor(session, user, road)
      .then(Constrain.setEnd({ road, year, term }).responds({}))
      .then(respond({}))
      .named("editor"),
  ),
);

// Answers once the road's listed blocks are those of the new major.
const SetMajor = endpoint("/bfsthismess/setMajor", ({ session, user, road, major }) =>
  receive({ session, road, major })
    .where(
      Authentication._authenticate({ session }).is({ user }),
      Share._canEdit({ road, user }).is({ allowed: true }),
      isMajor(major),
    )
    .then(Constrain.setMajor({ road, major }).responds({}))
    .then(Constrain.removeListedBlocks({ road }).responds({}))
    .afterFlowSettles()
    .then(respond({})),
);

// Same path as SetMajor: the requests it refuses.
const SetMajorRefused = endpoint("/bfsthismess/setMajor", ({ session, user, road, major }) =>
  receive({ session, road, major }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewOnly(session, user, road),
    asEditor(session, user, road, notAMajor(major))
      .then(respond({ error: "NO_SUCH_MAJOR" }))
      .named("not-a-major"),
  ),
);

const AddPrior = endpoint("/bfsthismess/addPrior", ({ session, user, road, subject }) =>
  receive({ session, road, subject }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewOnly(session, user, road),
    asEditor(session, user, road)
      .then(Constrain.addPrior({ road, subject }).responds({}))
      .then(respond({}))
      .named("editor"),
  ),
);

const RemovePrior = endpoint("/bfsthismess/removePrior", ({ session, user, road, subject }) =>
  receive({ session, road, subject }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewOnly(session, user, road),
    asEditor(session, user, road)
      .then(Constrain.removePrior({ road, subject }).responds({}))
      .then(respond({}))
      .named("editor"),
  ),
);

const Pin = endpoint("/bfsthismess/pin", ({ session, user, road, subject, year, term }) =>
  receive({ session, road, subject, year, term }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewOnly(session, user, road),
    asEditor(session, user, road)
      .then(Constrain.pin({ road, subject, year, term }).responds({}))
      .then(respond({}))
      .named("editor"),
  ),
);

const UnPin = endpoint("/bfsthismess/unPin", ({ session, user, road, subject }) =>
  receive({ session, road, subject }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewOnly(session, user, road),
    asEditor(session, user, road)
      .then(Constrain.unPin({ road, subject }).responds({}))
      .then(respond({}))
      .named("editor"),
  ),
);

const SetLocked = endpoint("/bfsthismess/setLocked", ({ session, user, road, year, term, locked }) =>
  receive({ session, road, year, term, locked }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewOnly(session, user, road),
    asEditor(session, user, road)
      .then(Constrain.setLocked({ road, year, term, locked }).responds({}))
      .then(respond({}))
      .named("editor"),
  ),
);

const SetCap = endpoint("/bfsthismess/setCap", ({ session, user, road, year, term, capType, limit }) =>
  receive({ session, road, year, term, capType, limit }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewOnly(session, user, road),
    asEditor(session, user, road)
      .then(Constrain.setCap({ road, year, term, capType, limit }).responds({}))
      .then(respond({}))
      .named("editor"),
  ),
);

const ClearCap = endpoint("/bfsthismess/clearCap", ({ session, user, road, year, term, capType }) =>
  receive({ session, road, year, term, capType }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewOnly(session, user, road),
    asEditor(session, user, road)
      .then(Constrain.clearCap({ road, year, term, capType }).responds({}))
      .then(respond({}))
      .named("editor"),
  ),
);

const ResetSemester = endpoint("/bfsthismess/resetSemester", ({ session, user, road, year, term }) =>
  receive({ session, road, year, term }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewOnly(session, user, road),
    asEditor(session, user, road)
      .then(Constrain.resetSemester({ road, year, term }).responds({}))
      .then(respond({}))
      .named("editor"),
  ),
);

// ---------- Blocks ----------

const AddBlock = endpoint("/bfsthismess/addBlock", ({ session, user, road, count, technical, block }) =>
  receive({ session, road, count, technical }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    viewOnly(session, user, road),
    asEditor(session, user, road)
      .then(Constrain.addBlock({ road, count, technical }).responds({ block }))
      .then(respond({ block }))
      .named("editor"),
  ),
);

const SetCount = endpoint("/bfsthismess/setCount", ({ session, user, block, road, count }) =>
  receive({ session, block, count }).then(
    noSession(session),
    missingBlock(session, block),
    hiddenBlock(session, user, block, road),
    blockViewOnly(session, user, block, road),
    asBlockEditor(session, user, block, road)
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
    blockViewOnly(session, user, block, road),
    asBlockEditor(session, user, block, road)
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
    blockViewOnly(session, user, block, road),
    asBlockEditor(session, user, block, road)
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
    blockViewOnly(session, user, block, road),
    asBlockEditor(session, user, block, road)
      .then(Constrain.removeBlock({ block }).responds({}))
      .then(respond({}))
      .named("owner"),
  ),
);

// ---------- Sharing ----------

// Share.share decides what the requester may add (an editor: viewers only, and no leak).
const ShareRoad = endpoint("/bfsthismess/shareRoad", ({ session, requester, road, username, role, user }) =>
  receive({ session, road, username, role }).then(
    noSession(session),
    hiddenRoad(session, requester, road),
    viewOnly(session, requester, road),
    asEditor(session, requester, road, no(Authentication._lookup({ username })))
      .then(respond({ error: "NO_SUCH_USER" }))
      .named("no-such-user"),
    asEditor(session, requester, road, Authentication._lookup({ username }).is({ user }))
      .then(Share.share({ road, requester, user, role }).responds({}))
      .then(respond({}))
      .named("editor"),
  ),
);

const FindUsers = endpoint("/bfsthismess/findUsers", ({ session, requester, road, prefix }) =>
  receive({ session, road, prefix }).then(
    noSession(session),
    hiddenRoad(session, requester, road),
    viewOnly(session, requester, road),
    asEditor(session, requester, road)
      .then(respond({ people: MatchingPeople({ road, requester, prefix }) }))
      .named("editor"),
  ),
);

const SetRole = endpoint("/bfsthismess/setRole", ({ session, requester, road, username, role, user }) =>
  receive({ session, road, username, role }).then(
    noSession(session),
    hiddenRoad(session, requester, road),
    notOwner(session, requester, road),
    asOwner(session, requester, road, no(Authentication._lookup({ username })))
      .then(respond({ error: "NO_SUCH_USER" }))
      .named("no-such-user"),
    asOwner(session, requester, road, Authentication._lookup({ username }).is({ user }))
      .then(Share.setRole({ road, requester, user, role }).responds({}))
      .then(respond({}))
      .named("owner"),
  ),
);

const UnshareRoad = endpoint("/bfsthismess/unshareRoad", ({ session, requester, road, username, user }) =>
  receive({ session, road, username }).then(
    noSession(session),
    hiddenRoad(session, requester, road),
    notOwner(session, requester, road),
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
    viewOnly(session, user, road),
    asEditor(session, user, road)
      .then(respond({ people: RoadPeople({ road, requester: user }) }))
      .named("editor"),
  ),
);

const ViewLinks = endpoint("/bfsthismess/viewLinks", ({ session, user, road }) =>
  receive({ session, road }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    notOwner(session, user, road),
    asOwner(session, user, road)
      .then(respond({ links: RoadLinks({ road, requester: user }) }))
      .named("owner"),
  ),
);

const EnableLink = endpoint("/bfsthismess/enableLink", ({ session, user, road, role }) =>
  receive({ session, road, role }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    notOwner(session, user, road),
    asOwner(session, user, road)
      .then(Share.enableLink({ road, requester: user, role }).responds({}))
      .then(respond({}))
      .named("owner"),
  ),
);

const DisableLink = endpoint("/bfsthismess/disableLink", ({ session, user, road, role }) =>
  receive({ session, road, role }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    notOwner(session, user, road),
    asOwner(session, user, road)
      .then(Share.disableLink({ road, requester: user, role }).responds({}))
      .then(respond({}))
      .named("owner"),
  ),
);

const RegenerateLink = endpoint("/bfsthismess/regenerateLink", ({ session, user, road, role }) =>
  receive({ session, road, role }).then(
    noSession(session),
    hiddenRoad(session, user, road),
    notOwner(session, user, road),
    asOwner(session, user, road)
      .then(Share.regenerateLink({ road, requester: user, role }).responds({}))
      .then(respond({}))
      .named("owner"),
  ),
);

// The token arrives in the request body only (the client keeps it in the URL hash).
const JoinLink = endpoint("/bfsthismess/joinLink", ({ session, user, token, road }) =>
  receive({ session, token }).then(
    noSession(session),
    where(Authentication._authenticate({ session }).is({ user }))
      .then(Share.join({ token, user }).responds({ road }))
      .then(respond({ road }))
      .named("signed-in"),
  ),
);

// A copy is made like a new road: created, then claimed by the requester in a later stage
// (which reads the session again), with its choices copied. If the claim is refused, the
// copy is deleted (DeleteUnclaimedRoad). The copy keeps nothing of the original's owner.
const CopyRoad = endpoint("/bfsthismess/copyRoad", ({ session, user, road, name, copy }) =>
  receive({ session, road, name })
    .where(Authentication._authenticate({ session }).is({ user }), Share._canView({ road, user }).is({ allowed: true }))
    .then(Constrain.copyRoad({ road, name }).responds({ copy }))
    .afterFlowSettles()
    .where(Authentication._authenticate({ session }).is({ user }))
    .then(Share.claim({ road: copy, user }).responds({}))
    .then(Requirements.copyChoices({ from: road, to: copy }).responds({}))
    .then(respond({ road: copy })),
);

// Same path as CopyRoad: the requests it refuses.
const CopyRoadRefused = endpoint("/bfsthismess/copyRoad", ({ session, user, road, name }) =>
  receive({ session, road, name }).then(noSession(session), hiddenRoad(session, user, road)),
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
            access: RoadAccess({ road, user }),
            constraints: RoadConstraints({ road }),
            requirements: RoadRequirements({ road }),
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

const ViewSlotOptions = endpoint(
  "/bfsthismess/viewSlotOptions",
  ({ session, user, road, blocks, year, term, topic }) =>
    receive({ session, road, blocks, year, term, topic }).then(
      noSession(session),
      hiddenRoad(session, user, road),
      asViewer(session, user, road)
        .then(respond({ subjects: SlotSubjects({ road, blocks, year, term, topic }) }))
        .named("viewer"),
    ),
);

export const composition = {
  MajorList,
  RoadRequirements,
  ForgetChoices,
  ListMajorBlocks,
  ListGirBlocks,
  ListBlockOptions,
  ListMajors,
  ChooseAlternative,
  ChooseAlternativeRefused,
  RefreshRequirements,
  RefreshRequirementsRefused,
  MatchingCourses,
  CourseDetails,
  CourseRatings,
  CourseSchedule,
  RoadConstraints,
  RoadPaths,
  RoadOptions,
  SlotSubjects,
  PlanVerdict,
  PinsLostByStart,
  PinsLostByEnd,
  RoadPeople,
  MatchingPeople,
  RoadLinks,
  RoadAccess,
  UserRoads,
  Register,
  LogIn,
  LogOut,
  SearchSubjects,
  ViewSubject,
  ViewRatings,
  ViewSchedule,
  NewRoad,
  NewRoadUnknownMajor,
  NewRoadWithoutSession,
  DeleteUnclaimedRoad,
  DeleteRoad,
  ReleaseRoad,
  RenameRoad,
  SetStart,
  SetEnd,
  SetMajor,
  SetMajorRefused,
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
  FindUsers,
  SetRole,
  ViewLinks,
  EnableLink,
  DisableLink,
  RegenerateLink,
  JoinLink,
  CopyRoad,
  CopyRoadRefused,
  MyRoads,
  FindPaths,
  ViewRoad,
  ViewOptions,
  CheckPlan,
  PreviewStartChange,
  PreviewEndChange,
  ViewSlotOptions,
};
