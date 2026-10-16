<!-- Generated from the BFSThisMess assembly. Do not edit. -->
<!-- Manifest producer: @mit-sdg/sync-engine@1.1.0; concept specification: sync-engine.concept-specification@1; renderer: @mit-sdg/sync-engine@1.1.0. -->

# BFSThisMess — assembled read-back

_Assembled by sync-engine from registered concepts and composition. Edit the concept_
_specifications and composition source, then regenerate this file._

## Concepts

### Constrain

Defined in [Constrain](../design/concepts/Constrain.md), line 1.

#### Actions

- `newRoad(name: String, major: String) : returns (road: Road)`
- `setMajor(road: Road, major: String) : returns ()`
- `addRequirement(road: Road, subject: Subject) : returns ()`
- `removeRequirement(road: Road, subject: Subject) : returns ()`
- `addElectiveBlock(road: Road, options: SubjectSet) : returns ()`
- `removeElectiveBlock(road: Road, options: SubjectSet) : returns ()`
- `pin(road: Road, subject: Subject, semester: Number) : returns ()`
- `unPin(road: Road, subject: Subject) : returns ()`
- `setCap(road: Road, capType: String, limit: Number) : returns ()`
- `lockThroughSemester(road: Road, semester: Number) : returns ()`

#### Queries

- `_constraints(road: Road) : one (required: SubjectSet, elective_blocks: SubjectSetSet, pins: PinSet, maxPerSemester: Number, maxTechnicalPerSemester: Number, lockedThrough: Number)`
- `_satisfies(road: Road, plan: Plan, technical: SubjectSet) : one (satisfied: Boolean)`
- `_findPath(road: Road, catalog: Catalog, limit: Number) : many (plan: Plan)`

#### Instances

- `Constrain` — instance of `Constrain` — [Application types](../design/types.md), line 14.
  - `Subject` is `CourseId` — [Application types](../design/types.md), line 15.

### CourseOffering

Defined in [CourseOffering](../design/concepts/CourseOffering.md), line 1.

#### Actions

- `load(subjectListingURL: String, ratingsURL: String) : returns (count: Number)`

#### Queries

- `_prerequisites(course: Subject) : many (prerequisite: Subject)`
- `_corequisites(course: Subject) : many (corequisite: Subject)`
- `_isOffered(course: Subject, semester: String) : one (offered: Boolean)`
- `_ratings(course: Subject) : one (found: Boolean, classRating: Number, professorRating: Number, url: String)`
- `_search(query: String) : many (course: Subject)`
- `_catalog() : one (catalog: Catalog)`
- `_schedule(course: Subject) : one (found: Boolean, units: String, meetingTimes: String, location: String)`

#### Instances

- `CourseOffering` — instance of `CourseOffering` — [Application types](../design/types.md), line 11.
  - `Subject` is `CourseId` — [Application types](../design/types.md), line 12.

## Application types

Concrete types:

- `CourseId` — [Application types](../design/types.md), line 6.

## Formers

_Formers name result shapes evaluated when asked. The source former owns_
_the authored explanation; this section records the generated shape._

### the constraints of a road

Authored path: `BFSThisMess.RoadConstraints`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 41.

```former
Former "the constraints of a road" — inputs (road); bindings (required, elective_blocks, pins, maxPerSemester, maxTechnicalPerSemester, lockedThrough); promises exactly one record — forms:
  a record of
    constraints: each Constrain._constraints (road) has (elective_blocks, lockedThrough, maxPerSemester, maxTechnicalPerSemester, pins, required)
      form a record of
        elective_blocks
        lockedThrough
        maxPerSemester
        maxTechnicalPerSemester
        pins
        required
```

### the matching courses

Authored path: `BFSThisMess.MatchingCourses`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 9.

```former
Former "the matching courses" — inputs (query); bindings (course); promises exactly one record — forms:
  a record of
    courses: each CourseOffering._search (query) has (course)
      form a record of
        course
```

### the paths of a road for a catalog

Authored path: `BFSThisMess.PathsForCatalog`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 39.

```former
Former "the paths of a road for a catalog" — inputs (road, catalog, limit); bindings (plan); promises exactly one record — forms:
  a record of
    paths: each Constrain._findPath (catalog, limit, road) has (plan)
      form a record of
        plan
```

### the paths of a road

Authored path: `BFSThisMess.RoadPaths`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 39.

```former
Former "the paths of a road" — inputs (road, limit); bindings (catalog); promises exactly one record — forms:
  a record of
    catalogs: each CourseOffering._catalog () has (catalog)
      form a record of
        paths: former "the paths of a road for a catalog" with (catalog, limit, road)
```

### the ratings of a course

Authored path: `BFSThisMess.CourseRatings`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 9.

```former
Former "the ratings of a course" — inputs (course); bindings (found, classRating, professorRating, url); promises exactly one record — forms:
  a record of
    ratings: each CourseOffering._ratings (course) has (classRating, found, professorRating, url)
      form a record of
        classRating
        found
        professorRating
        url
```

### the schedule of a course

Authored path: `BFSThisMess.CourseSchedule`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 9.

```former
Former "the schedule of a course" — inputs (course); bindings (found, units, meetingTimes, location); promises exactly one record — forms:
  a record of
    schedule: each CourseOffering._schedule (course) has (found, location, meetingTimes, units)
      form a record of
        found
        location
        meetingTimes
        units
```

## Reactions

### BFSThisMess.AddElectiveBlock

Authored path: `BFSThisMess.AddElectiveBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 22.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 29.

```reaction
when RequestBoundary.request (options, path: "/bfsthismess/addElectiveBlock", requestId, road)
then
  Constrain.addElectiveBlock (options, road)
```

### BFSThisMess.AddElectiveBlock#2

Authored path: `BFSThisMess.AddElectiveBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 22.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 29.

```reaction
when Constrain.addElectiveBlock (options, road), asked by BFSThisMess.AddElectiveBlock
where
  earlier, RequestBoundary.request (options, path: "/bfsthismess/addElectiveBlock", requestId, road)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.AddRequirement

Authored path: `BFSThisMess.AddRequirement`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 22.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 27.

```reaction
when RequestBoundary.request (path: "/bfsthismess/addRequirement", requestId, road, subject)
then
  Constrain.addRequirement (road, subject)
```

### BFSThisMess.AddRequirement#2

Authored path: `BFSThisMess.AddRequirement`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 22.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 27.

```reaction
when Constrain.addRequirement (road, subject), asked by BFSThisMess.AddRequirement
where
  earlier, RequestBoundary.request (path: "/bfsthismess/addRequirement", requestId, road, subject)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.FindPaths

Authored path: `BFSThisMess.FindPaths`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 39.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 44.

```reaction
when RequestBoundary.request (limit, path: "/bfsthismess/findPaths", requestId, road)
then
  RequestBoundary.respond (paths: former "the paths of a road" with (limit, road), requestId)
```

### BFSThisMess.LoadCatalog

Authored path: `BFSThisMess.LoadCatalog`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 7.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 12.

```reaction
when RequestBoundary.request (path: "/bfsthismess/loadCatalog", ratingsURL, requestId, subjectListingURL)
then
  CourseOffering.load (ratingsURL, subjectListingURL)
```

### BFSThisMess.LoadCatalog#2

Authored path: `BFSThisMess.LoadCatalog`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 7.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 12.

```reaction
when CourseOffering.load (ratingsURL, subjectListingURL, count), asked by BFSThisMess.LoadCatalog
where
  earlier, RequestBoundary.request (path: "/bfsthismess/loadCatalog", ratingsURL, requestId, subjectListingURL)
then
  RequestBoundary.respond (count, requestId)
```

### BFSThisMess.LockThroughSemester

Authored path: `BFSThisMess.LockThroughSemester`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 22.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 34.

```reaction
when RequestBoundary.request (path: "/bfsthismess/lockThroughSemester", requestId, road, semester)
then
  Constrain.lockThroughSemester (road, semester)
```

### BFSThisMess.LockThroughSemester#2

Authored path: `BFSThisMess.LockThroughSemester`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 22.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 34.

```reaction
when Constrain.lockThroughSemester (road, semester), asked by BFSThisMess.LockThroughSemester
where
  earlier, RequestBoundary.request (path: "/bfsthismess/lockThroughSemester", requestId, road, semester)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.NewRoad

Authored path: `BFSThisMess.NewRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 20.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 25.

```reaction
when RequestBoundary.request (major, name, path: "/bfsthismess/newRoad", requestId)
then
  Constrain.newRoad (major, name)
```

### BFSThisMess.NewRoad#2

Authored path: `BFSThisMess.NewRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 20.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 25.

```reaction
when Constrain.newRoad (major, name, road), asked by BFSThisMess.NewRoad
where
  earlier, RequestBoundary.request (major, name, path: "/bfsthismess/newRoad", requestId)
then
  RequestBoundary.respond (requestId, road)
```

### BFSThisMess.Pin

Authored path: `BFSThisMess.Pin`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 22.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 31.

```reaction
when RequestBoundary.request (path: "/bfsthismess/pin", requestId, road, semester, subject)
then
  Constrain.pin (road, semester, subject)
```

### BFSThisMess.Pin#2

Authored path: `BFSThisMess.Pin`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 22.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 31.

```reaction
when Constrain.pin (road, semester, subject), asked by BFSThisMess.Pin
where
  earlier, RequestBoundary.request (path: "/bfsthismess/pin", requestId, road, semester, subject)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.RemoveElectiveBlock

Authored path: `BFSThisMess.RemoveElectiveBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 22.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 30.

```reaction
when RequestBoundary.request (options, path: "/bfsthismess/removeElectiveBlock", requestId, road)
then
  Constrain.removeElectiveBlock (options, road)
```

### BFSThisMess.RemoveElectiveBlock#2

Authored path: `BFSThisMess.RemoveElectiveBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 22.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 30.

```reaction
when Constrain.removeElectiveBlock (options, road), asked by BFSThisMess.RemoveElectiveBlock
where
  earlier, RequestBoundary.request (options, path: "/bfsthismess/removeElectiveBlock", requestId, road)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.RemoveRequirement

Authored path: `BFSThisMess.RemoveRequirement`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 22.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 28.

```reaction
when RequestBoundary.request (path: "/bfsthismess/removeRequirement", requestId, road, subject)
then
  Constrain.removeRequirement (road, subject)
```

### BFSThisMess.RemoveRequirement#2

Authored path: `BFSThisMess.RemoveRequirement`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 22.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 28.

```reaction
when Constrain.removeRequirement (road, subject), asked by BFSThisMess.RemoveRequirement
where
  earlier, RequestBoundary.request (path: "/bfsthismess/removeRequirement", requestId, road, subject)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.SearchSubjects

Authored path: `BFSThisMess.SearchSubjects`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 9.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 13.

```reaction
when RequestBoundary.request (path: "/bfsthismess/searchSubjects", query, requestId)
then
  RequestBoundary.respond (courses: former "the matching courses" with (query), requestId)
```

### BFSThisMess.SetCap

Authored path: `BFSThisMess.SetCap`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 22.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 33.

```reaction
when RequestBoundary.request (capType, limit, path: "/bfsthismess/setCap", requestId, road)
then
  Constrain.setCap (capType, limit, road)
```

### BFSThisMess.SetCap#2

Authored path: `BFSThisMess.SetCap`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 22.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 33.

```reaction
when Constrain.setCap (capType, limit, road), asked by BFSThisMess.SetCap
where
  earlier, RequestBoundary.request (capType, limit, path: "/bfsthismess/setCap", requestId, road)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.SetMajor

Authored path: `BFSThisMess.SetMajor`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 22.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 26.

```reaction
when RequestBoundary.request (major, path: "/bfsthismess/setMajor", requestId, road)
then
  Constrain.setMajor (major, road)
```

### BFSThisMess.SetMajor#2

Authored path: `BFSThisMess.SetMajor`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 22.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 26.

```reaction
when Constrain.setMajor (major, road), asked by BFSThisMess.SetMajor
where
  earlier, RequestBoundary.request (major, path: "/bfsthismess/setMajor", requestId, road)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.UnPin

Authored path: `BFSThisMess.UnPin`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 22.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 32.

```reaction
when RequestBoundary.request (path: "/bfsthismess/unPin", requestId, road, subject)
then
  Constrain.unPin (road, subject)
```

### BFSThisMess.UnPin#2

Authored path: `BFSThisMess.UnPin`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 22.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 32.

```reaction
when Constrain.unPin (road, subject), asked by BFSThisMess.UnPin
where
  earlier, RequestBoundary.request (path: "/bfsthismess/unPin", requestId, road, subject)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.ViewRatings

Authored path: `BFSThisMess.ViewRatings`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 9.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 14.

```reaction
when RequestBoundary.request (course, path: "/bfsthismess/viewRatings", requestId)
then
  RequestBoundary.respond (ratings: former "the ratings of a course" with (course), requestId)
```

### BFSThisMess.ViewRoad

Authored path: `BFSThisMess.ViewRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 41.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 45.

```reaction
when RequestBoundary.request (limit, path: "/bfsthismess/viewRoad", requestId, road)
then
  RequestBoundary.respond (constraints: former "the constraints of a road" with (road), paths: former "the paths of a road" with (limit, road), requestId)
```

### BFSThisMess.ViewSchedule

Authored path: `BFSThisMess.ViewSchedule`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 9.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 15.

```reaction
when RequestBoundary.request (course, path: "/bfsthismess/viewSchedule", requestId)
then
  RequestBoundary.respond (requestId, schedule: former "the schedule of a course" with (course))
```

### DeliverFaultToAsker

```reaction
when any action is faulted, not asked by DeliverFaultToAsker
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respondFramework (error: "INTERNAL_ERROR", requestId)
```

### DeliverRefusalToAsker

```reaction
when any action is refused (message), except RequestBoundary
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respond (error: message, requestId)
```

## Endpoint input contracts

Before recording an action ask, the boundary rejects a body that is not an
object or lacks a required key. The response uses `INVALID_INPUT` and names
the path or missing key. A declared default fills an absent key. Endpoints
not listed here have no explicit input contract.

- `/bfsthismess/addElectiveBlock` — requires `road`, `options`
- `/bfsthismess/addRequirement` — requires `road`, `subject`
- `/bfsthismess/findPaths` — requires `road`, `limit`
- `/bfsthismess/loadCatalog` — requires `subjectListingURL`, `ratingsURL`
- `/bfsthismess/lockThroughSemester` — requires `road`, `semester`
- `/bfsthismess/newRoad` — requires `name`, `major`
- `/bfsthismess/pin` — requires `road`, `subject`, `semester`
- `/bfsthismess/removeElectiveBlock` — requires `road`, `options`
- `/bfsthismess/removeRequirement` — requires `road`, `subject`
- `/bfsthismess/searchSubjects` — requires `query`
- `/bfsthismess/setCap` — requires `road`, `capType`, `limit`
- `/bfsthismess/setMajor` — requires `road`, `major`
- `/bfsthismess/unPin` — requires `road`, `subject`
- `/bfsthismess/viewRatings` — requires `course`
- `/bfsthismess/viewRoad` — requires `road`, `limit`
- `/bfsthismess/viewSchedule` — requires `course`
