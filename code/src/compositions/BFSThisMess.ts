import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

// MVP: no authentication and no sharing. Anyone with a road id can read or edit it.
const { CourseOffering, Constrain } = concepts;

// ---------- Formers (read side) ----------

const MatchingCourses = former("the matching courses", ({ query }, { course }) =>
  form({
    courses: each(CourseOffering._search({ query }).is({ course })).form({ course }),
  }),
);

const CourseRatings = former(
  "the ratings of a course",
  ({ course }, { found, classRating, professorRating, url }) =>
    form({
      ratings: each(
        CourseOffering._ratings({ course }).is({ found, classRating, professorRating, url }),
      ).form({ found, classRating, professorRating, url }),
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
    { required, elective_blocks, pins, maxPerSemester, maxTechnicalPerSemester, lockedThrough },
  ) =>
    form({
      constraints: each(
        Constrain._constraints({ road }).is({
          required,
          elective_blocks,
          pins,
          maxPerSemester,
          maxTechnicalPerSemester,
          lockedThrough,
        }),
      ).form({
        required,
        elective_blocks,
        pins,
        maxPerSemester,
        maxTechnicalPerSemester,
        lockedThrough,
      }),
    }),
);

// Paths for a road, given a catalog that has already been fetched.
const PathsForCatalog = former(
  "the paths of a road for a catalog",
  ({ road, catalog, limit }, { plan }) =>
    form({
      paths: each(Constrain._findPath({ road, catalog, limit }).is({ plan })).form({ plan }),
    }),
);

// UNVERIFIED: fetches the catalog (one query), then hands it to PathsForCatalog.
// This assumes a value inside form({...}) can be another former call.
const RoadPaths = former("the paths of a road", ({ road, limit }, { catalog }) =>
  form({
    catalogs: each(CourseOffering._catalog({}).is({ catalog })).form({
      paths: PathsForCatalog({ road, catalog, limit }),
    }),
  }),
);

// ---------- Catalog ----------

const LoadCatalog = endpoint(
  "/bfsthismess/loadCatalog",
  ({ subjectListingURL, ratingsURL, count }) =>
    receive({ subjectListingURL, ratingsURL })
      .then(CourseOffering.load({ subjectListingURL, ratingsURL }).responds({ count }))
      .then(respond({ count })),
  { input: { required: ["subjectListingURL", "ratingsURL"] } },
);

const SearchSubjects = endpoint(
  "/bfsthismess/searchSubjects",
  ({ query }) => receive({ query }).then(respond({ courses: MatchingCourses({ query }) })),
  { input: { required: ["query"] } },
);

const ViewRatings = endpoint(
  "/bfsthismess/viewRatings",
  ({ course }) => receive({ course }).then(respond({ ratings: CourseRatings({ course }) })),
  { input: { required: ["course"] } },
);

const ViewSchedule = endpoint(
  "/bfsthismess/viewSchedule",
  ({ course }) => receive({ course }).then(respond({ schedule: CourseSchedule({ course }) })),
  { input: { required: ["course"] } },
);

// ---------- Roads (actions) ----------

const NewRoad = endpoint(
  "/bfsthismess/newRoad",
  ({ name, major, road }) =>
    receive({ name, major })
      .then(Constrain.newRoad({ name, major }).responds({ road }))
      .then(respond({ road })),
  { input: { required: ["name", "major"] } },
);

const SetMajor = endpoint(
  "/bfsthismess/setMajor",
  ({ road, major }) =>
    receive({ road, major })
      .then(Constrain.setMajor({ road, major }).responds({}))
      .then(respond({})),
  { input: { required: ["road", "major"] } },
);

const AddRequirement = endpoint(
  "/bfsthismess/addRequirement",
  ({ road, subject }) =>
    receive({ road, subject })
      .then(Constrain.addRequirement({ road, subject }).responds({}))
      .then(respond({})),
  { input: { required: ["road", "subject"] } },
);

const RemoveRequirement = endpoint(
  "/bfsthismess/removeRequirement",
  ({ road, subject }) =>
    receive({ road, subject })
      .then(Constrain.removeRequirement({ road, subject }).responds({}))
      .then(respond({})),
  { input: { required: ["road", "subject"] } },
);

const AddElectiveBlock = endpoint(
  "/bfsthismess/addElectiveBlock",
  ({ road, options }) =>
    receive({ road, options })
      .then(Constrain.addElectiveBlock({ road, options }).responds({}))
      .then(respond({})),
  { input: { required: ["road", "options"] } },
);

const RemoveElectiveBlock = endpoint(
  "/bfsthismess/removeElectiveBlock",
  ({ road, options }) =>
    receive({ road, options })
      .then(Constrain.removeElectiveBlock({ road, options }).responds({}))
      .then(respond({})),
  { input: { required: ["road", "options"] } },
);

const Pin = endpoint(
  "/bfsthismess/pin",
  ({ road, subject, semester }) =>
    receive({ road, subject, semester })
      .then(Constrain.pin({ road, subject, semester }).responds({}))
      .then(respond({})),
  { input: { required: ["road", "subject", "semester"] } },
);

const UnPin = endpoint(
  "/bfsthismess/unPin",
  ({ road, subject }) =>
    receive({ road, subject })
      .then(Constrain.unPin({ road, subject }).responds({}))
      .then(respond({})),
  { input: { required: ["road", "subject"] } },
);

const SetCap = endpoint(
  "/bfsthismess/setCap",
  ({ road, capType, limit }) =>
    receive({ road, capType, limit })
      .then(Constrain.setCap({ road, capType, limit }).responds({}))
      .then(respond({})),
  { input: { required: ["road", "capType", "limit"] } },
);

const LockThroughSemester = endpoint(
  "/bfsthismess/lockThroughSemester",
  ({ road, semester }) =>
    receive({ road, semester })
      .then(Constrain.lockThroughSemester({ road, semester }).responds({}))
      .then(respond({})),
  { input: { required: ["road", "semester"] } },
);

// ---------- Paths and viewing ----------

const FindPaths = endpoint(
  "/bfsthismess/findPaths",
  ({ road, limit }) => receive({ road, limit }).then(respond({ paths: RoadPaths({ road, limit }) })),
  { input: { required: ["road", "limit"] } },
);

const ViewRoad = endpoint(
  "/bfsthismess/viewRoad",
  ({ road, limit }) =>
    receive({ road, limit }).then(
      respond({ constraints: RoadConstraints({ road }), paths: RoadPaths({ road, limit }) }),
    ),
  { input: { required: ["road", "limit"] } },
);

export const composition = {
  MatchingCourses,
  CourseRatings,
  CourseSchedule,
  RoadConstraints,
  PathsForCatalog,
  RoadPaths,
  LoadCatalog,
  SearchSubjects,
  ViewRatings,
  ViewSchedule,
  NewRoad,
  SetMajor,
  AddRequirement,
  RemoveRequirement,
  AddElectiveBlock,
  RemoveElectiveBlock,
  Pin,
  UnPin,
  SetCap,
  LockThroughSemester,
  FindPaths,
  ViewRoad,
};