<!-- Generated from the BFSThisMess assembly. Do not edit. -->
<!-- Manifest producer: @mit-sdg/sync-engine@1.1.0; concept specification: sync-engine.concept-specification@1; renderer: @mit-sdg/sync-engine@1.1.0. -->

# BFSThisMess — assembled read-back

_Assembled by sync-engine from registered concepts and composition. Edit the concept_
_specifications and composition source, then regenerate this file._

## Concepts

### Authentication

Defined in [Authentication](../design/concepts/Authentication.md), line 1.

#### Actions

- `register(username: String, password: String) : returns (user: User)`
  - Refuses `EMPTY_CREDENTIALS`: A username and a password are needed.
  - Refuses `USERNAME_TAKEN`: Username is already taken.
- `login(username: String, password: String) : returns (session: String)`
  - Refuses `INVALID_CREDENTIALS`: Invalid username or password.
- `logout(session: String) : returns ()`
  - Refuses `NO_SUCH_SESSION`: Session does not exist.

#### Queries

- `_authenticate(session: String) : optional (user: User)`
- `_lookup(username: String) : optional (user: User)`
- `_username(user: User) : one (username: String)`

#### Instances

- `Authentication` — instance of `Authentication` — [Application types](../design/types.md), line 17.

### Constrain

Defined in [Constrain](../design/concepts/Constrain.md), line 1.

#### Actions

- `newRoad(name: String, major: String, startYear: Number, startTerm: Term) : returns (road: Road)`
  - Refuses `EMPTY_NAME`: A road needs a name.
  - Refuses `BAD_START`: A road must start in a Fall or Spring semester.
- `renameRoad(road: Road, name: String) : returns ()`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
  - Refuses `EMPTY_NAME`: A road needs a name.
- `deleteRoad(road: Road) : returns ()`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
- `setStart(road: Road, year: Number, term: Term) : returns ()`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
  - Refuses `BAD_START`: A road must start in a Fall or Spring semester.
- `setEnd(road: Road, year: Number, term: Term) : returns ()`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
  - Refuses `END_BEFORE_START`: The end must come after the start.
- `setMajor(road: Road, major: String) : returns ()`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
  - Refuses `EMPTY_MAJOR`: A major cannot be empty.
- `addPrior(road: Road, subject: Subject) : returns ()`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
  - Refuses `NO_LISTING`: That subject is not known.
- `removePrior(road: Road, subject: Subject) : returns ()`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
  - Refuses `NOT_PRIOR`: That subject is not prior credit for this road.
- `addBlock(road: Road, count: Number, technical: Flag) : returns (block: Block)`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
  - Refuses `BAD_COUNT`: A block must require at least one subject.
- `addListedBlock(road: Road, count: Number, title: String, technical: Flag, group: String, origin: String) : returns (block: Block)`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
  - Refuses `BAD_COUNT`: A block must require at least one subject.
- `removeListedBlocks(road: Road) : returns ()`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
- `setCount(block: Block, count: Number) : returns ()`
  - Refuses `NO_SUCH_BLOCK`: There is no such block.
  - Refuses `BAD_COUNT`: A block must require at least one subject.
- `addOption(block: Block, subject: Subject) : returns ()`
  - Refuses `NO_SUCH_BLOCK`: There is no such block.
  - Refuses `NO_LISTING`: That subject is not known.
- `removeOption(block: Block, subject: Subject) : returns ()`
  - Refuses `NO_SUCH_BLOCK`: There is no such block.
  - Refuses `NOT_AN_OPTION`: That subject is not an option of this block.
- `removeBlock(block: Block) : returns ()`
  - Refuses `NO_SUCH_BLOCK`: There is no such block.
- `pin(road: Road, subject: Subject, year: Number, term: Term) : returns ()`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
  - Refuses `NO_LISTING`: That subject is not known.
  - Refuses `ALREADY_PRIOR`: That subject is already prior credit.
  - Refuses `OUT_OF_SPAN`: That semester is outside the road.
  - Refuses `LOCKED_SEASON`: That semester is locked.
- `unPin(road: Road, subject: Subject) : returns ()`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
  - Refuses `NOT_PINNED`: That subject is not pinned in this road.
  - Refuses `LOCKED_SEASON`: That semester is locked.
- `setLocked(road: Road, year: Number, term: Term, locked: Flag) : returns ()`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
- `setCap(road: Road, year: Number, term: Term, capType: String, limit: Number) : returns ()`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
  - Refuses `BAD_CAP_TYPE`: The cap type must be total or technical.
  - Refuses `NEGATIVE_LIMIT`: A cap cannot be negative.
- `clearCap(road: Road, year: Number, term: Term, capType: String) : returns ()`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
  - Refuses `BAD_CAP_TYPE`: The cap type must be total or technical.
- `resetSemester(road: Road, year: Number, term: Term) : returns ()`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
  - Refuses `NO_SUCH_SEMESTER`: That semester has no settings.
- `setListing(subject: Subject, units: Number) : returns ()`
- `addListingTerm(subject: Subject, term: Term) : returns ()`
  - Refuses `NO_LISTING`: That subject is not known.
- `removeListingTerm(subject: Subject, term: Term) : returns ()`
  - Refuses `NO_LISTING`: That subject is not known.
  - Refuses `NOT_A_TERM`: That subject does not run in that term.
- `removeListing(subject: Subject) : returns ()`
  - Refuses `NO_LISTING`: That subject is not known.
- `addDependency(course: Subject, kind: DependencyKind, count: Number) : returns (dependency: Dependency)`
  - Refuses `NO_LISTING`: That subject is not known.
  - Refuses `BAD_COUNT`: A dependency must require at least one subject.
- `addDependencyOption(dependency: Dependency, subject: Subject) : returns ()`
  - Refuses `NO_SUCH_DEPENDENCY`: There is no such dependency.
- `removeDependency(dependency: Dependency) : returns ()`
  - Refuses `NO_SUCH_DEPENDENCY`: There is no such dependency.
- `markCancelled(subject: Subject, year: Number, term: Term) : returns ()`
  - Refuses `NO_LISTING`: That subject is not known.
- `unmarkCancelled(subject: Subject, year: Number, term: Term) : returns ()`
  - Refuses `NOT_CANCELLED`: That subject is not marked as cancelled in that semester.

#### Queries

- `_road(road: Road) : one (name: String, major: String, startYear: Number, startTerm: Term, endYear: Number, endTerm: Term)`
- `_prior(road: Road) : many (subject: Subject)`
- `_blocks(road: Road) : many (block: Block, count: Number, subject: Subject, title: String, technical: Flag, group: String, origin: String)`
- `_pins(road: Road) : many (subject: Subject, year: Number, term: Term)`
- `_semesters(road: Road) : many (year: Number, term: Term, locked: Flag, maxUnits: Number, maxTechnicalUnits: Number)`
- `_pinsLostBySetStart(road: Road, year: Number, term: Term) : many (subject: Subject, year: Number, term: Term)`
- `_pinsLostBySetEnd(road: Road, year: Number, term: Term) : many (subject: Subject, year: Number, term: Term)`
- `_satisfies(road: Road) : one (satisfied: Flag)`
- `_options(road: Road, includeIAPAndSummer: Flag) : many (year: Number, term: Term, subject: Subject, fitsByEnd: Flag)`
- `_findPath(road: Road, includeIAPAndSummer: Flag, limit: Number) : many (plan: Number, year: Number, term: Term, subject: Subject)`
- `_roadOfBlock(block: Block) : optional (road: Road)`

#### Instances

- `Constrain` — instance of `Constrain` — [Application types](../design/types.md), line 14.
  - `Subject` is `CourseId` — [Application types](../design/types.md), line 15.

### CourseOffering

Defined in [CourseOffering](../design/concepts/CourseOffering.md), line 1.

#### Actions

- `load(snapshot: String) : returns (count: Number)`
  - Refuses `LOAD_FAILED`: The catalog snapshot could not be parsed.

#### Queries

- `_loadedSnapshot() : one (found: Flag, id: String)`
- `_course(course: Subject) : one (found: Flag, name: String, courseId: String, description: String, lecturer: String, level: String, units: String, offering: String, canBeRepeated: Flag, prerequisitesText: String, corequisitesText: String)`
- `_prerequisites(course: Subject) : many (dependency: Dependency, count: Number, prerequisite: Subject)`
- `_corequisites(course: Subject) : many (dependency: Dependency, count: Number, corequisite: Subject)`
- `_isOffered(course: Subject, year: Number, term: Term) : one (offered: Flag)`
- `_cancellations(course: Subject) : many (year: Number, term: Term)`
- `_ratings(course: Subject) : one (found: Flag, classRating: Number, url: String)`
- `_search(query?: String, level?: String, term?: Term) : many (course: Subject, name: String, courseId: String, level: String, units: String, unitsKnown: Flag, terms: String)`
- `_terms(course: Subject) : many (term: Term)`
- `_schedule(course: Subject) : one (found: Flag, units: String, meetingTimes: String, location: String)`

#### Instances

- `CourseOffering` — instance of `CourseOffering` — [Application types](../design/types.md), line 11.
  - `Subject` is `CourseId` — [Application types](../design/types.md), line 12.

### Requirements

Defined in [Requirements](../design/concepts/Requirements.md), line 1.

#### Actions

- `load(snapshot: String) : returns (count: Number)`
  - Refuses `LOAD_FAILED`: The requirements snapshot could not be parsed.
- `choose(road: Road, choice: Item, alternative: Item) : returns ()`
  - Refuses `NO_SUCH_CHOICE`: There is no such choice.
  - Refuses `NOT_AN_ALTERNATIVE`: That is not one of the alternatives of this choice.
- `forget(road: Road) : returns ()`

#### Queries

- `_loadedSnapshot() : one (found: Flag, id: String)`
- `_lists() : many (list: String, title: String, shortTitle: String, mediumTitle: String, kind: ListKind)`
- `_list(list: String) : one (found: Flag, title: String, shortTitle: String, mediumTitle: String, kind: ListKind)`
- `_activeBlocks(list: String, road: Road) : many (item: Item, title: String, count: Number, technical: Flag)`
- `_options(item: Item) : many (subject: Subject)`
- `_outline(list: String, road: Road) : many (item: Item, parent: String, depth: Number, kind: ItemKind, title: String, count: Number, approximate: Flag, active: Flag, chosen: Flag)`

#### Instances

- `Requirements` — instance of `Requirements` — [Application types](../design/types.md), line 19.
  - `Road` is `Constrain.Road` — [Application types](../design/types.md), line 21.
  - `Subject` is `CourseId` — [Application types](../design/types.md), line 20.

### Share

Defined in [Share](../design/concepts/Share.md), line 1.

#### Actions

- `claim(road: Road, user: User) : returns ()`
  - Refuses `ROAD_ALREADY_OWNED`: This road already has an owner.
- `release(road: Road) : returns ()`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
- `share(road: Road, requester: User, user: User) : returns ()`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
  - Refuses `NOT_AN_OWNER`: Only the owner can share this road.
  - Refuses `SHARE_WITH_OWNER`: The owner already has access to this road.
- `unshare(road: Road, requester: User, user: User) : returns ()`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
  - Refuses `NOT_AN_OWNER`: Only the owner can change who a road is shared with.
  - Refuses `NOT_SHARED`: That road is not shared with that user.

#### Queries

- `_canView(road: Road, user: User) : one (allowed: Flag)`
- `_isOwner(road: Road, user: User) : one (owner: Flag)`
- `_roadsOwnedBy(user: User) : many (road: Road)`
- `_roadsSharedWith(user: User) : many (road: Road)`
- `_viewers(road: Road) : many (user: User)`

#### Instances

- `Share` — instance of `Share` — [Application types](../design/types.md), line 23.
  - `Road` is `Constrain.Road` — [Application types](../design/types.md), line 24.
  - `User` is `Authentication.User` — [Application types](../design/types.md), line 25.

## Application types

Concrete types:

- `CourseId` — [Application types](../design/types.md), line 6.

## Formers

_Formers name result shapes evaluated when asked. The source former owns_
_the authored explanation; this section records the generated shape._

### the constraints of a road

Authored path: `BFSThisMess.RoadConstraints`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 111.

```former
Former "the constraints of a road" — inputs (road); bindings (name, major, startYear, startTerm, endYear, endTerm, priorSubject, block, count, option, blockTitle, blockTechnical, blockOrigin, pinSubject, pinYear, pinTerm, year, term, locked, maxUnits, maxTechnicalUnits); promises exactly one record — forms:
  a record of
    where Constrain._road (road) has (endTerm, endYear, major, name, startTerm, startYear)
    blocks: each Constrain._blocks (road) has (block, count, origin: blockOrigin, subject: option, technical: blockTechnical, title: blockTitle)
      form a record of
        block
        count
        origin: blockOrigin
        subject: option
        technical: blockTechnical
        title: blockTitle
    endTerm
    endYear
    major
    name
    pins: each Constrain._pins (road) has (subject: pinSubject, term: pinTerm, year: pinYear)
      form a record of
        subject: pinSubject
        term: pinTerm
        year: pinYear
    prior: each Constrain._prior (road) has (subject: priorSubject)
      form a record of
        subject: priorSubject
    semesters: each Constrain._semesters (road) has (locked, maxTechnicalUnits, maxUnits, term, year)
      form a record of
        locked
        maxTechnicalUnits
        maxUnits
        term
        year
    startTerm
    startYear
```

### the details of a course

Authored path: `BFSThisMess.CourseDetails`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 35.

```former
Former "the details of a course" — inputs (course); bindings (found, name, courseId, description, lecturer, level, units, offering, canBeRepeated, prerequisitesText, corequisitesText, term, prereqDependency, prereqCount, prerequisite, coreqDependency, coreqCount, corequisite, cancelledYear, cancelledTerm); promises exactly one record — forms:
  a record of
    where CourseOffering._course (course) has (canBeRepeated, corequisitesText, courseId, description, found, lecturer, level, name, offering, prerequisitesText, units)
    canBeRepeated
    cancellations: each CourseOffering._cancellations (course) has (term: cancelledTerm, year: cancelledYear)
      form a record of
        term: cancelledTerm
        year: cancelledYear
    corequisites: each CourseOffering._corequisites (course) has (corequisite, count: coreqCount, dependency: coreqDependency)
      form a record of
        count: coreqCount
        dependency: coreqDependency
        subject: corequisite
    corequisitesText
    courseId
    description
    found
    lecturer
    level
    name
    offering
    prerequisites: each CourseOffering._prerequisites (course) has (count: prereqCount, dependency: prereqDependency, prerequisite)
      form a record of
        count: prereqCount
        dependency: prereqDependency
        subject: prerequisite
    prerequisitesText
    terms: each CourseOffering._terms (course) has (term)
      form a record of
        term
    units
```

### the majors

Authored path: `BFSThisMess.MajorList`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 46.

```former
Former "the majors" — inputs (); bindings (list, title, shortTitle, mediumTitle); promises exactly one record — forms:
  a record of
    majors: each Requirements._lists () has (kind: "MAJOR", list, mediumTitle, shortTitle, title)
      form a record of
        list
        mediumTitle
        shortTitle
        title
```

### the matching courses

Authored path: `BFSThisMess.MatchingCourses`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 35.

```former
Former "the matching courses" — inputs (query, level, term); bindings (course, name, courseId, courseLevel, units, unitsKnown, terms); promises exactly one record — forms:
  a record of
    courses: each CourseOffering._search (level, query, term) has (course, courseId, level: courseLevel, name, terms, units, unitsKnown)
      form a record of
        course
        courseId
        level: courseLevel
        name
        terms
        units
        unitsKnown
```

### the options of a road

Authored path: `BFSThisMess.RoadOptions`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 113.

```former
Former "the options of a road" — inputs (road, includeIAPAndSummer); bindings (year, term, subject, fitsByEnd); promises exactly one record — forms:
  a record of
    options: each Constrain._options (includeIAPAndSummer, road) has (fitsByEnd, subject, term, year)
      form a record of
        fitsByEnd
        subject
        term
        year
```

### the paths of a road

Authored path: `BFSThisMess.RoadPaths`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 109.

```former
Former "the paths of a road" — inputs (road, includeIAPAndSummer, limit); bindings (plan, year, term, subject); promises exactly one record — forms:
  a record of
    plans: each Constrain._findPath (includeIAPAndSummer, limit, road) has (plan, subject, term, year)
      form a record of
        plan
        subject
        term
        year
```

### the people a road is shared with

Authored path: `BFSThisMess.RoadViewers`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 97.

```former
Former "the people a road is shared with" — inputs (road); bindings (user, username); promises exactly one record — forms:
  a record of
    viewers: each Share._viewers (road) has (user)
      where Authentication._username (user) has (username)
      form a record of
        username
```

### the pins lost by moving the end

Authored path: `BFSThisMess.PinsLostByEnd`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 113.

```former
Former "the pins lost by moving the end" — inputs (road, year, term); bindings (subject, pinYear, pinTerm); promises exactly one record — forms:
  a record of
    pins: each Constrain._pinsLostBySetEnd (road, term, year) has (subject, term: pinTerm, year: pinYear)
      form a record of
        subject
        term: pinTerm
        year: pinYear
```

### the pins lost by moving the start

Authored path: `BFSThisMess.PinsLostByStart`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 113.

```former
Former "the pins lost by moving the start" — inputs (road, year, term); bindings (subject, pinYear, pinTerm); promises exactly one record — forms:
  a record of
    pins: each Constrain._pinsLostBySetStart (road, term, year) has (subject, term: pinTerm, year: pinYear)
      form a record of
        subject
        term: pinTerm
        year: pinYear
```

### the ratings of a course

Authored path: `BFSThisMess.CourseRatings`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 35.

```former
Former "the ratings of a course" — inputs (course); bindings (found, classRating, url); promises exactly one record — forms:
  a record of
    ratings: each CourseOffering._ratings (course) has (classRating, found, url)
      form a record of
        classRating
        found
        url
```

### the requirements of a road

Authored path: `BFSThisMess.RoadRequirements`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 85.

```former
Former "the requirements of a road" — inputs (road); bindings (major, found, title, shortTitle, item, parent, depth, kind, itemTitle, count, approximate, active, chosen, girItem, girParent, girDepth, girKind, girTitle, girCount, girApproximate, girActive, girChosen); promises exactly one record — forms:
  a record of
    where Constrain._road (road) has (major)
    where Requirements._list (list: major) has (found, shortTitle, title)
    found
    girs: each Requirements._outline (list: "girs", road) has (active: girActive, approximate: girApproximate, chosen: girChosen, count: girCount, depth: girDepth, item: girItem, kind: girKind, parent: girParent, title: girTitle)
      form a record of
        active: girActive
        approximate: girApproximate
        chosen: girChosen
        count: girCount
        depth: girDepth
        item: girItem
        kind: girKind
        parent: girParent
        title: girTitle
    items: each Requirements._outline (list: major, road) has (active, approximate, chosen, count, depth, item, kind, parent, title: itemTitle)
      form a record of
        active
        approximate
        chosen
        count
        depth
        item
        kind
        parent
        title: itemTitle
    major
    shortTitle
    title
```

### the roads of a user

Authored path: `BFSThisMess.UserRoads`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 107.

```former
Former "the roads of a user" — inputs (user); bindings (owned, ownedName, ownedMajor, shared, sharedName, sharedMajor); promises exactly one record — forms:
  a record of
    owned: each Share._roadsOwnedBy (user) has (road: owned)
      where Constrain._road (road: owned) has (major: ownedMajor, name: ownedName)
      form a record of
        major: ownedMajor
        name: ownedName
        road: owned
    shared: each Share._roadsSharedWith (user) has (road: shared)
      where Constrain._road (road: shared) has (major: sharedMajor, name: sharedName)
      form a record of
        major: sharedMajor
        name: sharedName
        road: shared
```

### the schedule of a course

Authored path: `BFSThisMess.CourseSchedule`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 35.

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

### the verdict on a plan

Authored path: `BFSThisMess.PlanVerdict`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 113.

```former
Former "the verdict on a plan" — inputs (road); bindings (satisfied); promises exactly one record — forms:
  a record of
    where Constrain._satisfies (road) has (satisfied)
    satisfied
```

## Reactions

### BFSThisMess.AddBlock:hidden-road

Authored path: `BFSThisMess.AddBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 68.

```reaction
when RequestBoundary.request (count, path: "/bfsthismess/addBlock", requestId, road, session, technical)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.AddBlock:no-session

Authored path: `BFSThisMess.AddBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 68.

```reaction
when RequestBoundary.request (count, path: "/bfsthismess/addBlock", requestId, road, session, technical)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.AddBlock:not-owner

Authored path: `BFSThisMess.AddBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 68.

```reaction
when RequestBoundary.request (count, path: "/bfsthismess/addBlock", requestId, road, session, technical)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._isOwner (road, user) has (owner: false)
then
  RequestBoundary.respond (error: "NOT_AN_OWNER", requestId)
```

### BFSThisMess.AddBlock:owner

Authored path: `BFSThisMess.AddBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 68.

```reaction
when RequestBoundary.request (count, path: "/bfsthismess/addBlock", requestId, road, session, technical)
where
  Authentication._authenticate (session) has (user)
  Share._isOwner (road, user) has (owner: true)
then
  Constrain.addBlock (count, road, technical)
```

### BFSThisMess.AddBlock:owner#2

Authored path: `BFSThisMess.AddBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 68.

```reaction
when Constrain.addBlock (count, road, technical, block), asked by BFSThisMess.AddBlock:owner
where
  earlier, RequestBoundary.request (count, path: "/bfsthismess/addBlock", requestId, road, session, technical)
then
  RequestBoundary.respond (block, requestId)
```

### BFSThisMess.AddOption:hidden-block

Authored path: `BFSThisMess.AddOption`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 70.

```reaction
when RequestBoundary.request (block, path: "/bfsthismess/addOption", requestId, session, subject)
where
  Authentication._authenticate (session) has (user)
  Constrain._roadOfBlock (block) has (road)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_BLOCK", requestId)
```

### BFSThisMess.AddOption:missing-block

Authored path: `BFSThisMess.AddOption`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 70.

```reaction
when RequestBoundary.request (block, path: "/bfsthismess/addOption", requestId, session, subject)
where
  Authentication._authenticate (session)
  no Constrain._roadOfBlock (block)
then
  RequestBoundary.respond (error: "NO_SUCH_BLOCK", requestId)
```

### BFSThisMess.AddOption:no-session

Authored path: `BFSThisMess.AddOption`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 70.

```reaction
when RequestBoundary.request (block, path: "/bfsthismess/addOption", requestId, session, subject)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.AddOption:not-owner

Authored path: `BFSThisMess.AddOption`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 70.

```reaction
when RequestBoundary.request (block, path: "/bfsthismess/addOption", requestId, session, subject)
where
  Authentication._authenticate (session) has (user)
  Constrain._roadOfBlock (block) has (road)
  Share._canView (road, user) has (allowed: true)
  Share._isOwner (road, user) has (owner: false)
then
  RequestBoundary.respond (error: "NOT_AN_OWNER", requestId)
```

### BFSThisMess.AddOption:owner

Authored path: `BFSThisMess.AddOption`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 70.

```reaction
when RequestBoundary.request (block, path: "/bfsthismess/addOption", requestId, session, subject)
where
  Authentication._authenticate (session) has (user)
  Constrain._roadOfBlock (block) has (road)
  Share._isOwner (road, user) has (owner: true)
then
  Constrain.addOption (block, subject)
```

### BFSThisMess.AddOption:owner#2

Authored path: `BFSThisMess.AddOption`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 70.

```reaction
when Constrain.addOption (block, subject), asked by BFSThisMess.AddOption:owner
where
  earlier, RequestBoundary.request (block, path: "/bfsthismess/addOption", requestId, session, subject)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.AddPrior:hidden-road

Authored path: `BFSThisMess.AddPrior`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 66.

```reaction
when RequestBoundary.request (path: "/bfsthismess/addPrior", requestId, road, session, subject)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.AddPrior:no-session

Authored path: `BFSThisMess.AddPrior`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 66.

```reaction
when RequestBoundary.request (path: "/bfsthismess/addPrior", requestId, road, session, subject)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.AddPrior:not-owner

Authored path: `BFSThisMess.AddPrior`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 66.

```reaction
when RequestBoundary.request (path: "/bfsthismess/addPrior", requestId, road, session, subject)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._isOwner (road, user) has (owner: false)
then
  RequestBoundary.respond (error: "NOT_AN_OWNER", requestId)
```

### BFSThisMess.AddPrior:owner

Authored path: `BFSThisMess.AddPrior`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 66.

```reaction
when RequestBoundary.request (path: "/bfsthismess/addPrior", requestId, road, session, subject)
where
  Authentication._authenticate (session) has (user)
  Share._isOwner (road, user) has (owner: true)
then
  Constrain.addPrior (road, subject)
```

### BFSThisMess.AddPrior:owner#2

Authored path: `BFSThisMess.AddPrior`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 66.

```reaction
when Constrain.addPrior (road, subject), asked by BFSThisMess.AddPrior:owner
where
  earlier, RequestBoundary.request (path: "/bfsthismess/addPrior", requestId, road, session, subject)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.CheckPlan:hidden-road

Authored path: `BFSThisMess.CheckPlan`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 113.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 120.

```reaction
when RequestBoundary.request (path: "/bfsthismess/checkPlan", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.CheckPlan:no-session

Authored path: `BFSThisMess.CheckPlan`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 113.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 120.

```reaction
when RequestBoundary.request (path: "/bfsthismess/checkPlan", requestId, road, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.CheckPlan:viewer

Authored path: `BFSThisMess.CheckPlan`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 113.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 120.

```reaction
when RequestBoundary.request (path: "/bfsthismess/checkPlan", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
then
  RequestBoundary.respond (requestId, verdict: former "the verdict on a plan" with (road))
```

### BFSThisMess.ChooseAlternative

Authored path: `BFSThisMess.ChooseAlternative`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 85.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 89.

```reaction
when RequestBoundary.request (alternative, choice, path: "/bfsthismess/chooseAlternative", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._isOwner (road, user) has (owner: true)
then
  Requirements.choose (alternative, choice, road)
```

### BFSThisMess.ChooseAlternative#2

Authored path: `BFSThisMess.ChooseAlternative`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 85.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 89.

```reaction
when Requirements.choose (alternative, choice, road), asked by BFSThisMess.ChooseAlternative
then
  Constrain.removeListedBlocks (road)
```

### BFSThisMess.ChooseAlternative#3

Authored path: `BFSThisMess.ChooseAlternative`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 85.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 89.

```reaction
when Constrain.removeListedBlocks (road), asked by BFSThisMess.ChooseAlternative#2
at the flow's settlement frontier
where
  earlier, RequestBoundary.request (alternative, choice, path: "/bfsthismess/chooseAlternative", requestId, road, session)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.ChooseAlternativeRefused:hidden-road

Authored path: `BFSThisMess.ChooseAlternativeRefused`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 85.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 90.

```reaction
when RequestBoundary.request (alternative, choice, path: "/bfsthismess/chooseAlternative", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.ChooseAlternativeRefused:no-session

Authored path: `BFSThisMess.ChooseAlternativeRefused`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 85.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 90.

```reaction
when RequestBoundary.request (alternative, choice, path: "/bfsthismess/chooseAlternative", requestId, road, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.ChooseAlternativeRefused:not-owner

Authored path: `BFSThisMess.ChooseAlternativeRefused`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 85.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 90.

```reaction
when RequestBoundary.request (alternative, choice, path: "/bfsthismess/chooseAlternative", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._isOwner (road, user) has (owner: false)
then
  RequestBoundary.respond (error: "NOT_AN_OWNER", requestId)
```

### BFSThisMess.ClearCap:hidden-road

Authored path: `BFSThisMess.ClearCap`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 77.

```reaction
when RequestBoundary.request (capType, path: "/bfsthismess/clearCap", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.ClearCap:no-session

Authored path: `BFSThisMess.ClearCap`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 77.

```reaction
when RequestBoundary.request (capType, path: "/bfsthismess/clearCap", requestId, road, session, term, year)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.ClearCap:not-owner

Authored path: `BFSThisMess.ClearCap`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 77.

```reaction
when RequestBoundary.request (capType, path: "/bfsthismess/clearCap", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._isOwner (road, user) has (owner: false)
then
  RequestBoundary.respond (error: "NOT_AN_OWNER", requestId)
```

### BFSThisMess.ClearCap:owner

Authored path: `BFSThisMess.ClearCap`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 77.

```reaction
when RequestBoundary.request (capType, path: "/bfsthismess/clearCap", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._isOwner (road, user) has (owner: true)
then
  Constrain.clearCap (capType, road, term, year)
```

### BFSThisMess.ClearCap:owner#2

Authored path: `BFSThisMess.ClearCap`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 77.

```reaction
when Constrain.clearCap (capType, road, term, year), asked by BFSThisMess.ClearCap:owner
where
  earlier, RequestBoundary.request (capType, path: "/bfsthismess/clearCap", requestId, road, session, term, year)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.DeleteRoad:hidden-road

Authored path: `BFSThisMess.DeleteRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 52.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 61.

```reaction
when RequestBoundary.request (path: "/bfsthismess/deleteRoad", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.DeleteRoad:no-session

Authored path: `BFSThisMess.DeleteRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 52.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 61.

```reaction
when RequestBoundary.request (path: "/bfsthismess/deleteRoad", requestId, road, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.DeleteRoad:not-owner

Authored path: `BFSThisMess.DeleteRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 52.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 61.

```reaction
when RequestBoundary.request (path: "/bfsthismess/deleteRoad", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._isOwner (road, user) has (owner: false)
then
  RequestBoundary.respond (error: "NOT_AN_OWNER", requestId)
```

### BFSThisMess.DeleteRoad:owner

Authored path: `BFSThisMess.DeleteRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 52.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 61.

```reaction
when RequestBoundary.request (path: "/bfsthismess/deleteRoad", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._isOwner (road, user) has (owner: true)
then
  Constrain.deleteRoad (road)
```

### BFSThisMess.DeleteRoad:owner#2

Authored path: `BFSThisMess.DeleteRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 52.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 61.

```reaction
when Constrain.deleteRoad (road), asked by BFSThisMess.DeleteRoad:owner
where
  earlier, RequestBoundary.request (path: "/bfsthismess/deleteRoad", requestId, road, session)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.DeleteUnclaimedRoad

Authored path: `BFSThisMess.DeleteUnclaimedRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 46.

```reaction
when refused Share.claim (road)
then
  Constrain.deleteRoad (road)
```

### BFSThisMess.FindPaths:hidden-road

Authored path: `BFSThisMess.FindPaths`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 109.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 117.

```reaction
when RequestBoundary.request (includeIAPAndSummer, limit, path: "/bfsthismess/findPaths", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.FindPaths:no-session

Authored path: `BFSThisMess.FindPaths`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 109.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 117.

```reaction
when RequestBoundary.request (includeIAPAndSummer, limit, path: "/bfsthismess/findPaths", requestId, road, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.FindPaths:viewer

Authored path: `BFSThisMess.FindPaths`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 109.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 117.

```reaction
when RequestBoundary.request (includeIAPAndSummer, limit, path: "/bfsthismess/findPaths", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
then
  RequestBoundary.respond (paths: former "the paths of a road" with (includeIAPAndSummer, limit, road), requestId)
```

### BFSThisMess.ForgetChoices

Authored path: `BFSThisMess.ForgetChoices`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 52.

```reaction
when Constrain.deleteRoad (road)
then
  Requirements.forget (road)
```

### BFSThisMess.ListBlockOptions

Authored path: `BFSThisMess.ListBlockOptions`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 83.

```reaction
when Constrain.addListedBlock (origin, block)
where
  Requirements._options (item: origin) has (subject)
then
  Constrain.addOption (block, subject)
```

### BFSThisMess.ListGirBlocks

Authored path: `BFSThisMess.ListGirBlocks`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 83.

```reaction
when Constrain.removeListedBlocks (road)
where
  Requirements._activeBlocks (list: "girs", road) has (count, item, technical, title)
then
  Constrain.addListedBlock (count, group: item, origin: item, road, technical, title)
```

### BFSThisMess.ListMajorBlocks

Authored path: `BFSThisMess.ListMajorBlocks`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 83.

```reaction
when Constrain.removeListedBlocks (road)
where
  Constrain._road (road) has (major)
  Requirements._activeBlocks (list: major, road) has (count, item, technical, title)
then
  Constrain.addListedBlock (count, group: item, origin: item, road, technical, title)
```

### BFSThisMess.ListMajors

Authored path: `BFSThisMess.ListMajors`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 46.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 88.

```reaction
when RequestBoundary.request (path: "/bfsthismess/listMajors", requestId)
then
  RequestBoundary.respond (majors: former "the majors", requestId)
```

### BFSThisMess.LogIn

Authored path: `BFSThisMess.LogIn`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 23.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 27.

```reaction
when RequestBoundary.request (password, path: "/bfsthismess/logIn", requestId, username)
then
  Authentication.login (password, username)
```

### BFSThisMess.LogIn#2

Authored path: `BFSThisMess.LogIn`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 23.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 27.

```reaction
when Authentication.login (password, username, session), asked by BFSThisMess.LogIn
where
  earlier, RequestBoundary.request (password, path: "/bfsthismess/logIn", requestId, username)
then
  RequestBoundary.respond (requestId, session)
```

### BFSThisMess.LogOut

Authored path: `BFSThisMess.LogOut`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 23.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 28.

```reaction
when RequestBoundary.request (path: "/bfsthismess/logOut", requestId, session)
then
  Authentication.logout (session)
```

### BFSThisMess.LogOut#2

Authored path: `BFSThisMess.LogOut`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 23.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 28.

```reaction
when Authentication.logout (session), asked by BFSThisMess.LogOut
where
  earlier, RequestBoundary.request (path: "/bfsthismess/logOut", requestId, session)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.MyRoads:no-session

Authored path: `BFSThisMess.MyRoads`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 107.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 116.

```reaction
when RequestBoundary.request (path: "/bfsthismess/myRoads", requestId, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.MyRoads:signed-in

Authored path: `BFSThisMess.MyRoads`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 107.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 116.

```reaction
when RequestBoundary.request (path: "/bfsthismess/myRoads", requestId, session)
where
  Authentication._authenticate (session) has (user)
then
  RequestBoundary.respond (requestId, roads: former "the roads of a user" with (user))
```

### BFSThisMess.NewRoad

Authored path: `BFSThisMess.NewRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 46.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 57.

```reaction
when RequestBoundary.request (major, name, path: "/bfsthismess/newRoad", requestId, session, startTerm, startYear)
where
  Authentication._authenticate (session)
  Requirements._list (list: major) has (found: true, kind: "MAJOR")
then
  Constrain.newRoad (major, name, startTerm, startYear)
```

### BFSThisMess.NewRoad#2

Authored path: `BFSThisMess.NewRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 46.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 57.

```reaction
when Constrain.newRoad (major, name, startTerm, startYear, road), asked by BFSThisMess.NewRoad
at the flow's settlement frontier
where
  earlier, RequestBoundary.request (major, name, path: "/bfsthismess/newRoad", requestId, session, startTerm, startYear)
  Authentication._authenticate (session) has (user)
then
  Share.claim (road, user)
```

### BFSThisMess.NewRoad#3

Authored path: `BFSThisMess.NewRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 46.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 57.

```reaction
when Share.claim (road, user), asked by BFSThisMess.NewRoad#2
then
  Constrain.removeListedBlocks (road)
```

### BFSThisMess.NewRoad#4

Authored path: `BFSThisMess.NewRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 46.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 57.

```reaction
when Constrain.removeListedBlocks (road), asked by BFSThisMess.NewRoad#3
at the flow's settlement frontier
where
  earlier, RequestBoundary.request (major, name, path: "/bfsthismess/newRoad", requestId, session, startTerm, startYear)
then
  RequestBoundary.respond (requestId, road)
```

### BFSThisMess.NewRoadUnknownMajor

Authored path: `BFSThisMess.NewRoadUnknownMajor`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 46.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 59.

```reaction
when RequestBoundary.request (major, name, path: "/bfsthismess/newRoad", requestId, session, startTerm, startYear)
where
  Authentication._authenticate (session)
  no Requirements._list (list: major) has (found: true, kind: "MAJOR")
then
  RequestBoundary.respond (error: "NO_SUCH_MAJOR", requestId)
```

### BFSThisMess.NewRoadWithoutSession

Authored path: `BFSThisMess.NewRoadWithoutSession`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 46.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 58.

```reaction
when RequestBoundary.request (major, name, path: "/bfsthismess/newRoad", requestId, session, startTerm, startYear)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.Pin:hidden-road

Authored path: `BFSThisMess.Pin`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 73.

```reaction
when RequestBoundary.request (path: "/bfsthismess/pin", requestId, road, session, subject, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.Pin:no-session

Authored path: `BFSThisMess.Pin`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 73.

```reaction
when RequestBoundary.request (path: "/bfsthismess/pin", requestId, road, session, subject, term, year)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.Pin:not-owner

Authored path: `BFSThisMess.Pin`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 73.

```reaction
when RequestBoundary.request (path: "/bfsthismess/pin", requestId, road, session, subject, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._isOwner (road, user) has (owner: false)
then
  RequestBoundary.respond (error: "NOT_AN_OWNER", requestId)
```

### BFSThisMess.Pin:owner

Authored path: `BFSThisMess.Pin`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 73.

```reaction
when RequestBoundary.request (path: "/bfsthismess/pin", requestId, road, session, subject, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._isOwner (road, user) has (owner: true)
then
  Constrain.pin (road, subject, term, year)
```

### BFSThisMess.Pin:owner#2

Authored path: `BFSThisMess.Pin`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 73.

```reaction
when Constrain.pin (road, subject, term, year), asked by BFSThisMess.Pin:owner
where
  earlier, RequestBoundary.request (path: "/bfsthismess/pin", requestId, road, session, subject, term, year)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.PreviewEndChange:hidden-road

Authored path: `BFSThisMess.PreviewEndChange`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 113.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 122.

```reaction
when RequestBoundary.request (path: "/bfsthismess/previewEndChange", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.PreviewEndChange:no-session

Authored path: `BFSThisMess.PreviewEndChange`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 113.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 122.

```reaction
when RequestBoundary.request (path: "/bfsthismess/previewEndChange", requestId, road, session, term, year)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.PreviewEndChange:viewer

Authored path: `BFSThisMess.PreviewEndChange`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 113.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 122.

```reaction
when RequestBoundary.request (path: "/bfsthismess/previewEndChange", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
then
  RequestBoundary.respond (lost: former "the pins lost by moving the end" with (road, term, year), requestId)
```

### BFSThisMess.PreviewStartChange:hidden-road

Authored path: `BFSThisMess.PreviewStartChange`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 113.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 121.

```reaction
when RequestBoundary.request (path: "/bfsthismess/previewStartChange", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.PreviewStartChange:no-session

Authored path: `BFSThisMess.PreviewStartChange`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 113.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 121.

```reaction
when RequestBoundary.request (path: "/bfsthismess/previewStartChange", requestId, road, session, term, year)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.PreviewStartChange:viewer

Authored path: `BFSThisMess.PreviewStartChange`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 113.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 121.

```reaction
when RequestBoundary.request (path: "/bfsthismess/previewStartChange", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
then
  RequestBoundary.respond (lost: former "the pins lost by moving the start" with (road, term, year), requestId)
```

### BFSThisMess.Register

Authored path: `BFSThisMess.Register`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 23.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 26.

```reaction
when RequestBoundary.request (password, path: "/bfsthismess/register", requestId, username)
then
  Authentication.register (password, username)
```

### BFSThisMess.Register#2

Authored path: `BFSThisMess.Register`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 23.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 26.

```reaction
when Authentication.register (password, username, user), asked by BFSThisMess.Register
where
  earlier, RequestBoundary.request (password, path: "/bfsthismess/register", requestId, username)
then
  RequestBoundary.respond (requestId, user)
```

### BFSThisMess.ReleaseRoad

Authored path: `BFSThisMess.ReleaseRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 52.

```reaction
when Constrain.deleteRoad (road)
then
  Share.release (road)
```

### BFSThisMess.RemoveBlock:hidden-block

Authored path: `BFSThisMess.RemoveBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 72.

```reaction
when RequestBoundary.request (block, path: "/bfsthismess/removeBlock", requestId, session)
where
  Authentication._authenticate (session) has (user)
  Constrain._roadOfBlock (block) has (road)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_BLOCK", requestId)
```

### BFSThisMess.RemoveBlock:missing-block

Authored path: `BFSThisMess.RemoveBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 72.

```reaction
when RequestBoundary.request (block, path: "/bfsthismess/removeBlock", requestId, session)
where
  Authentication._authenticate (session)
  no Constrain._roadOfBlock (block)
then
  RequestBoundary.respond (error: "NO_SUCH_BLOCK", requestId)
```

### BFSThisMess.RemoveBlock:no-session

Authored path: `BFSThisMess.RemoveBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 72.

```reaction
when RequestBoundary.request (block, path: "/bfsthismess/removeBlock", requestId, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.RemoveBlock:not-owner

Authored path: `BFSThisMess.RemoveBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 72.

```reaction
when RequestBoundary.request (block, path: "/bfsthismess/removeBlock", requestId, session)
where
  Authentication._authenticate (session) has (user)
  Constrain._roadOfBlock (block) has (road)
  Share._canView (road, user) has (allowed: true)
  Share._isOwner (road, user) has (owner: false)
then
  RequestBoundary.respond (error: "NOT_AN_OWNER", requestId)
```

### BFSThisMess.RemoveBlock:owner

Authored path: `BFSThisMess.RemoveBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 72.

```reaction
when RequestBoundary.request (block, path: "/bfsthismess/removeBlock", requestId, session)
where
  Authentication._authenticate (session) has (user)
  Constrain._roadOfBlock (block) has (road)
  Share._isOwner (road, user) has (owner: true)
then
  Constrain.removeBlock (block)
```

### BFSThisMess.RemoveBlock:owner#2

Authored path: `BFSThisMess.RemoveBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 72.

```reaction
when Constrain.removeBlock (block), asked by BFSThisMess.RemoveBlock:owner
where
  earlier, RequestBoundary.request (block, path: "/bfsthismess/removeBlock", requestId, session)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.RemoveOption:hidden-block

Authored path: `BFSThisMess.RemoveOption`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 71.

```reaction
when RequestBoundary.request (block, path: "/bfsthismess/removeOption", requestId, session, subject)
where
  Authentication._authenticate (session) has (user)
  Constrain._roadOfBlock (block) has (road)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_BLOCK", requestId)
```

### BFSThisMess.RemoveOption:missing-block

Authored path: `BFSThisMess.RemoveOption`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 71.

```reaction
when RequestBoundary.request (block, path: "/bfsthismess/removeOption", requestId, session, subject)
where
  Authentication._authenticate (session)
  no Constrain._roadOfBlock (block)
then
  RequestBoundary.respond (error: "NO_SUCH_BLOCK", requestId)
```

### BFSThisMess.RemoveOption:no-session

Authored path: `BFSThisMess.RemoveOption`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 71.

```reaction
when RequestBoundary.request (block, path: "/bfsthismess/removeOption", requestId, session, subject)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.RemoveOption:not-owner

Authored path: `BFSThisMess.RemoveOption`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 71.

```reaction
when RequestBoundary.request (block, path: "/bfsthismess/removeOption", requestId, session, subject)
where
  Authentication._authenticate (session) has (user)
  Constrain._roadOfBlock (block) has (road)
  Share._canView (road, user) has (allowed: true)
  Share._isOwner (road, user) has (owner: false)
then
  RequestBoundary.respond (error: "NOT_AN_OWNER", requestId)
```

### BFSThisMess.RemoveOption:owner

Authored path: `BFSThisMess.RemoveOption`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 71.

```reaction
when RequestBoundary.request (block, path: "/bfsthismess/removeOption", requestId, session, subject)
where
  Authentication._authenticate (session) has (user)
  Constrain._roadOfBlock (block) has (road)
  Share._isOwner (road, user) has (owner: true)
then
  Constrain.removeOption (block, subject)
```

### BFSThisMess.RemoveOption:owner#2

Authored path: `BFSThisMess.RemoveOption`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 71.

```reaction
when Constrain.removeOption (block, subject), asked by BFSThisMess.RemoveOption:owner
where
  earlier, RequestBoundary.request (block, path: "/bfsthismess/removeOption", requestId, session, subject)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.RemovePrior:hidden-road

Authored path: `BFSThisMess.RemovePrior`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 67.

```reaction
when RequestBoundary.request (path: "/bfsthismess/removePrior", requestId, road, session, subject)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.RemovePrior:no-session

Authored path: `BFSThisMess.RemovePrior`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 67.

```reaction
when RequestBoundary.request (path: "/bfsthismess/removePrior", requestId, road, session, subject)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.RemovePrior:not-owner

Authored path: `BFSThisMess.RemovePrior`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 67.

```reaction
when RequestBoundary.request (path: "/bfsthismess/removePrior", requestId, road, session, subject)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._isOwner (road, user) has (owner: false)
then
  RequestBoundary.respond (error: "NOT_AN_OWNER", requestId)
```

### BFSThisMess.RemovePrior:owner

Authored path: `BFSThisMess.RemovePrior`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 67.

```reaction
when RequestBoundary.request (path: "/bfsthismess/removePrior", requestId, road, session, subject)
where
  Authentication._authenticate (session) has (user)
  Share._isOwner (road, user) has (owner: true)
then
  Constrain.removePrior (road, subject)
```

### BFSThisMess.RemovePrior:owner#2

Authored path: `BFSThisMess.RemovePrior`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 67.

```reaction
when Constrain.removePrior (road, subject), asked by BFSThisMess.RemovePrior:owner
where
  earlier, RequestBoundary.request (path: "/bfsthismess/removePrior", requestId, road, session, subject)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.RenameRoad:hidden-road

Authored path: `BFSThisMess.RenameRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 60.

```reaction
when RequestBoundary.request (name, path: "/bfsthismess/renameRoad", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.RenameRoad:no-session

Authored path: `BFSThisMess.RenameRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 60.

```reaction
when RequestBoundary.request (name, path: "/bfsthismess/renameRoad", requestId, road, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.RenameRoad:not-owner

Authored path: `BFSThisMess.RenameRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 60.

```reaction
when RequestBoundary.request (name, path: "/bfsthismess/renameRoad", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._isOwner (road, user) has (owner: false)
then
  RequestBoundary.respond (error: "NOT_AN_OWNER", requestId)
```

### BFSThisMess.RenameRoad:owner

Authored path: `BFSThisMess.RenameRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 60.

```reaction
when RequestBoundary.request (name, path: "/bfsthismess/renameRoad", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._isOwner (road, user) has (owner: true)
then
  Constrain.renameRoad (name, road)
```

### BFSThisMess.RenameRoad:owner#2

Authored path: `BFSThisMess.RenameRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 60.

```reaction
when Constrain.renameRoad (name, road), asked by BFSThisMess.RenameRoad:owner
where
  earlier, RequestBoundary.request (name, path: "/bfsthismess/renameRoad", requestId, road, session)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.ResetSemester:hidden-road

Authored path: `BFSThisMess.ResetSemester`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 78.

```reaction
when RequestBoundary.request (path: "/bfsthismess/resetSemester", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.ResetSemester:no-session

Authored path: `BFSThisMess.ResetSemester`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 78.

```reaction
when RequestBoundary.request (path: "/bfsthismess/resetSemester", requestId, road, session, term, year)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.ResetSemester:not-owner

Authored path: `BFSThisMess.ResetSemester`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 78.

```reaction
when RequestBoundary.request (path: "/bfsthismess/resetSemester", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._isOwner (road, user) has (owner: false)
then
  RequestBoundary.respond (error: "NOT_AN_OWNER", requestId)
```

### BFSThisMess.ResetSemester:owner

Authored path: `BFSThisMess.ResetSemester`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 78.

```reaction
when RequestBoundary.request (path: "/bfsthismess/resetSemester", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._isOwner (road, user) has (owner: true)
then
  Constrain.resetSemester (road, term, year)
```

### BFSThisMess.ResetSemester:owner#2

Authored path: `BFSThisMess.ResetSemester`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 78.

```reaction
when Constrain.resetSemester (road, term, year), asked by BFSThisMess.ResetSemester:owner
where
  earlier, RequestBoundary.request (path: "/bfsthismess/resetSemester", requestId, road, session, term, year)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.SearchSubjects

Authored path: `BFSThisMess.SearchSubjects`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 35.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 38.

```reaction
when RequestBoundary.request (level, path: "/bfsthismess/searchSubjects", query, requestId, term)
then
  RequestBoundary.respond (courses: former "the matching courses" with (level, query, term), requestId)
```

### BFSThisMess.SetCap:hidden-road

Authored path: `BFSThisMess.SetCap`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 76.

```reaction
when RequestBoundary.request (capType, limit, path: "/bfsthismess/setCap", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.SetCap:no-session

Authored path: `BFSThisMess.SetCap`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 76.

```reaction
when RequestBoundary.request (capType, limit, path: "/bfsthismess/setCap", requestId, road, session, term, year)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.SetCap:not-owner

Authored path: `BFSThisMess.SetCap`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 76.

```reaction
when RequestBoundary.request (capType, limit, path: "/bfsthismess/setCap", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._isOwner (road, user) has (owner: false)
then
  RequestBoundary.respond (error: "NOT_AN_OWNER", requestId)
```

### BFSThisMess.SetCap:owner

Authored path: `BFSThisMess.SetCap`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 76.

```reaction
when RequestBoundary.request (capType, limit, path: "/bfsthismess/setCap", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._isOwner (road, user) has (owner: true)
then
  Constrain.setCap (capType, limit, road, term, year)
```

### BFSThisMess.SetCap:owner#2

Authored path: `BFSThisMess.SetCap`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 76.

```reaction
when Constrain.setCap (capType, limit, road, term, year), asked by BFSThisMess.SetCap:owner
where
  earlier, RequestBoundary.request (capType, limit, path: "/bfsthismess/setCap", requestId, road, session, term, year)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.SetCount:hidden-block

Authored path: `BFSThisMess.SetCount`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 69.

```reaction
when RequestBoundary.request (block, count, path: "/bfsthismess/setCount", requestId, session)
where
  Authentication._authenticate (session) has (user)
  Constrain._roadOfBlock (block) has (road)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_BLOCK", requestId)
```

### BFSThisMess.SetCount:missing-block

Authored path: `BFSThisMess.SetCount`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 69.

```reaction
when RequestBoundary.request (block, count, path: "/bfsthismess/setCount", requestId, session)
where
  Authentication._authenticate (session)
  no Constrain._roadOfBlock (block)
then
  RequestBoundary.respond (error: "NO_SUCH_BLOCK", requestId)
```

### BFSThisMess.SetCount:no-session

Authored path: `BFSThisMess.SetCount`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 69.

```reaction
when RequestBoundary.request (block, count, path: "/bfsthismess/setCount", requestId, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.SetCount:not-owner

Authored path: `BFSThisMess.SetCount`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 69.

```reaction
when RequestBoundary.request (block, count, path: "/bfsthismess/setCount", requestId, session)
where
  Authentication._authenticate (session) has (user)
  Constrain._roadOfBlock (block) has (road)
  Share._canView (road, user) has (allowed: true)
  Share._isOwner (road, user) has (owner: false)
then
  RequestBoundary.respond (error: "NOT_AN_OWNER", requestId)
```

### BFSThisMess.SetCount:owner

Authored path: `BFSThisMess.SetCount`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 69.

```reaction
when RequestBoundary.request (block, count, path: "/bfsthismess/setCount", requestId, session)
where
  Authentication._authenticate (session) has (user)
  Constrain._roadOfBlock (block) has (road)
  Share._isOwner (road, user) has (owner: true)
then
  Constrain.setCount (block, count)
```

### BFSThisMess.SetCount:owner#2

Authored path: `BFSThisMess.SetCount`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 69.

```reaction
when Constrain.setCount (block, count), asked by BFSThisMess.SetCount:owner
where
  earlier, RequestBoundary.request (block, count, path: "/bfsthismess/setCount", requestId, session)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.SetEnd:hidden-road

Authored path: `BFSThisMess.SetEnd`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 63.

```reaction
when RequestBoundary.request (path: "/bfsthismess/setEnd", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.SetEnd:no-session

Authored path: `BFSThisMess.SetEnd`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 63.

```reaction
when RequestBoundary.request (path: "/bfsthismess/setEnd", requestId, road, session, term, year)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.SetEnd:not-owner

Authored path: `BFSThisMess.SetEnd`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 63.

```reaction
when RequestBoundary.request (path: "/bfsthismess/setEnd", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._isOwner (road, user) has (owner: false)
then
  RequestBoundary.respond (error: "NOT_AN_OWNER", requestId)
```

### BFSThisMess.SetEnd:owner

Authored path: `BFSThisMess.SetEnd`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 63.

```reaction
when RequestBoundary.request (path: "/bfsthismess/setEnd", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._isOwner (road, user) has (owner: true)
then
  Constrain.setEnd (road, term, year)
```

### BFSThisMess.SetEnd:owner#2

Authored path: `BFSThisMess.SetEnd`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 63.

```reaction
when Constrain.setEnd (road, term, year), asked by BFSThisMess.SetEnd:owner
where
  earlier, RequestBoundary.request (path: "/bfsthismess/setEnd", requestId, road, session, term, year)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.SetLocked:hidden-road

Authored path: `BFSThisMess.SetLocked`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 75.

```reaction
when RequestBoundary.request (locked, path: "/bfsthismess/setLocked", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.SetLocked:no-session

Authored path: `BFSThisMess.SetLocked`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 75.

```reaction
when RequestBoundary.request (locked, path: "/bfsthismess/setLocked", requestId, road, session, term, year)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.SetLocked:not-owner

Authored path: `BFSThisMess.SetLocked`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 75.

```reaction
when RequestBoundary.request (locked, path: "/bfsthismess/setLocked", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._isOwner (road, user) has (owner: false)
then
  RequestBoundary.respond (error: "NOT_AN_OWNER", requestId)
```

### BFSThisMess.SetLocked:owner

Authored path: `BFSThisMess.SetLocked`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 75.

```reaction
when RequestBoundary.request (locked, path: "/bfsthismess/setLocked", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._isOwner (road, user) has (owner: true)
then
  Constrain.setLocked (locked, road, term, year)
```

### BFSThisMess.SetLocked:owner#2

Authored path: `BFSThisMess.SetLocked`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 75.

```reaction
when Constrain.setLocked (locked, road, term, year), asked by BFSThisMess.SetLocked:owner
where
  earlier, RequestBoundary.request (locked, path: "/bfsthismess/setLocked", requestId, road, session, term, year)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.SetMajor

Authored path: `BFSThisMess.SetMajor`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 64.

```reaction
when RequestBoundary.request (major, path: "/bfsthismess/setMajor", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._isOwner (road, user) has (owner: true)
  Requirements._list (list: major) has (found: true, kind: "MAJOR")
then
  Constrain.setMajor (major, road)
```

### BFSThisMess.SetMajor#2

Authored path: `BFSThisMess.SetMajor`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 64.

```reaction
when Constrain.setMajor (major, road), asked by BFSThisMess.SetMajor
then
  Constrain.removeListedBlocks (road)
```

### BFSThisMess.SetMajor#3

Authored path: `BFSThisMess.SetMajor`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 64.

```reaction
when Constrain.removeListedBlocks (road), asked by BFSThisMess.SetMajor#2
at the flow's settlement frontier
where
  earlier, RequestBoundary.request (major, path: "/bfsthismess/setMajor", requestId, road, session)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.SetMajorRefused:hidden-road

Authored path: `BFSThisMess.SetMajorRefused`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 65.

```reaction
when RequestBoundary.request (major, path: "/bfsthismess/setMajor", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.SetMajorRefused:no-session

Authored path: `BFSThisMess.SetMajorRefused`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 65.

```reaction
when RequestBoundary.request (major, path: "/bfsthismess/setMajor", requestId, road, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.SetMajorRefused:not-a-major

Authored path: `BFSThisMess.SetMajorRefused`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 65.

```reaction
when RequestBoundary.request (major, path: "/bfsthismess/setMajor", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._isOwner (road, user) has (owner: true)
  no Requirements._list (list: major) has (found: true, kind: "MAJOR")
then
  RequestBoundary.respond (error: "NO_SUCH_MAJOR", requestId)
```

### BFSThisMess.SetMajorRefused:not-owner

Authored path: `BFSThisMess.SetMajorRefused`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 65.

```reaction
when RequestBoundary.request (major, path: "/bfsthismess/setMajor", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._isOwner (road, user) has (owner: false)
then
  RequestBoundary.respond (error: "NOT_AN_OWNER", requestId)
```

### BFSThisMess.SetStart:hidden-road

Authored path: `BFSThisMess.SetStart`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 62.

```reaction
when RequestBoundary.request (path: "/bfsthismess/setStart", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.SetStart:no-session

Authored path: `BFSThisMess.SetStart`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 62.

```reaction
when RequestBoundary.request (path: "/bfsthismess/setStart", requestId, road, session, term, year)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.SetStart:not-owner

Authored path: `BFSThisMess.SetStart`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 62.

```reaction
when RequestBoundary.request (path: "/bfsthismess/setStart", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._isOwner (road, user) has (owner: false)
then
  RequestBoundary.respond (error: "NOT_AN_OWNER", requestId)
```

### BFSThisMess.SetStart:owner

Authored path: `BFSThisMess.SetStart`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 62.

```reaction
when RequestBoundary.request (path: "/bfsthismess/setStart", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._isOwner (road, user) has (owner: true)
then
  Constrain.setStart (road, term, year)
```

### BFSThisMess.SetStart:owner#2

Authored path: `BFSThisMess.SetStart`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 62.

```reaction
when Constrain.setStart (road, term, year), asked by BFSThisMess.SetStart:owner
where
  earlier, RequestBoundary.request (path: "/bfsthismess/setStart", requestId, road, session, term, year)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.ShareRoad:hidden-road

Authored path: `BFSThisMess.ShareRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 95.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 100.

```reaction
when RequestBoundary.request (path: "/bfsthismess/shareRoad", requestId, road, session, username)
where
  Authentication._authenticate (session) has (user: requester)
  Share._canView (road, user: requester) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.ShareRoad:no-session

Authored path: `BFSThisMess.ShareRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 95.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 100.

```reaction
when RequestBoundary.request (path: "/bfsthismess/shareRoad", requestId, road, session, username)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.ShareRoad:no-such-user

Authored path: `BFSThisMess.ShareRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 95.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 100.

```reaction
when RequestBoundary.request (path: "/bfsthismess/shareRoad", requestId, road, session, username)
where
  Authentication._authenticate (session) has (user: requester)
  Share._isOwner (road, user: requester) has (owner: true)
  no Authentication._lookup (username)
then
  RequestBoundary.respond (error: "NO_SUCH_USER", requestId)
```

### BFSThisMess.ShareRoad:not-owner

Authored path: `BFSThisMess.ShareRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 95.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 100.

```reaction
when RequestBoundary.request (path: "/bfsthismess/shareRoad", requestId, road, session, username)
where
  Authentication._authenticate (session) has (user: requester)
  Share._canView (road, user: requester) has (allowed: true)
  Share._isOwner (road, user: requester) has (owner: false)
then
  RequestBoundary.respond (error: "NOT_AN_OWNER", requestId)
```

### BFSThisMess.ShareRoad:owner

Authored path: `BFSThisMess.ShareRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 95.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 100.

```reaction
when RequestBoundary.request (path: "/bfsthismess/shareRoad", requestId, road, session, username)
where
  Authentication._authenticate (session) has (user: requester)
  Share._isOwner (road, user: requester) has (owner: true)
  Authentication._lookup (username) has (user)
then
  Share.share (requester, road, user)
```

### BFSThisMess.ShareRoad:owner#2

Authored path: `BFSThisMess.ShareRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 95.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 100.

```reaction
when Share.share (requester, road, user), asked by BFSThisMess.ShareRoad:owner
where
  earlier, RequestBoundary.request (path: "/bfsthismess/shareRoad", requestId, road, session, username)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.UnPin:hidden-road

Authored path: `BFSThisMess.UnPin`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 74.

```reaction
when RequestBoundary.request (path: "/bfsthismess/unPin", requestId, road, session, subject)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.UnPin:no-session

Authored path: `BFSThisMess.UnPin`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 74.

```reaction
when RequestBoundary.request (path: "/bfsthismess/unPin", requestId, road, session, subject)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.UnPin:not-owner

Authored path: `BFSThisMess.UnPin`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 74.

```reaction
when RequestBoundary.request (path: "/bfsthismess/unPin", requestId, road, session, subject)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._isOwner (road, user) has (owner: false)
then
  RequestBoundary.respond (error: "NOT_AN_OWNER", requestId)
```

### BFSThisMess.UnPin:owner

Authored path: `BFSThisMess.UnPin`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 74.

```reaction
when RequestBoundary.request (path: "/bfsthismess/unPin", requestId, road, session, subject)
where
  Authentication._authenticate (session) has (user)
  Share._isOwner (road, user) has (owner: true)
then
  Constrain.unPin (road, subject)
```

### BFSThisMess.UnPin:owner#2

Authored path: `BFSThisMess.UnPin`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 74.

```reaction
when Constrain.unPin (road, subject), asked by BFSThisMess.UnPin:owner
where
  earlier, RequestBoundary.request (path: "/bfsthismess/unPin", requestId, road, session, subject)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.UnshareRoad:hidden-road

Authored path: `BFSThisMess.UnshareRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 95.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 101.

```reaction
when RequestBoundary.request (path: "/bfsthismess/unshareRoad", requestId, road, session, username)
where
  Authentication._authenticate (session) has (user: requester)
  Share._canView (road, user: requester) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.UnshareRoad:no-session

Authored path: `BFSThisMess.UnshareRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 95.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 101.

```reaction
when RequestBoundary.request (path: "/bfsthismess/unshareRoad", requestId, road, session, username)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.UnshareRoad:no-such-user

Authored path: `BFSThisMess.UnshareRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 95.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 101.

```reaction
when RequestBoundary.request (path: "/bfsthismess/unshareRoad", requestId, road, session, username)
where
  Authentication._authenticate (session) has (user: requester)
  Share._isOwner (road, user: requester) has (owner: true)
  no Authentication._lookup (username)
then
  RequestBoundary.respond (error: "NO_SUCH_USER", requestId)
```

### BFSThisMess.UnshareRoad:not-owner

Authored path: `BFSThisMess.UnshareRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 95.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 101.

```reaction
when RequestBoundary.request (path: "/bfsthismess/unshareRoad", requestId, road, session, username)
where
  Authentication._authenticate (session) has (user: requester)
  Share._canView (road, user: requester) has (allowed: true)
  Share._isOwner (road, user: requester) has (owner: false)
then
  RequestBoundary.respond (error: "NOT_AN_OWNER", requestId)
```

### BFSThisMess.UnshareRoad:owner

Authored path: `BFSThisMess.UnshareRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 95.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 101.

```reaction
when RequestBoundary.request (path: "/bfsthismess/unshareRoad", requestId, road, session, username)
where
  Authentication._authenticate (session) has (user: requester)
  Share._isOwner (road, user: requester) has (owner: true)
  Authentication._lookup (username) has (user)
then
  Share.unshare (requester, road, user)
```

### BFSThisMess.UnshareRoad:owner#2

Authored path: `BFSThisMess.UnshareRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 95.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 101.

```reaction
when Share.unshare (requester, road, user), asked by BFSThisMess.UnshareRoad:owner
where
  earlier, RequestBoundary.request (path: "/bfsthismess/unshareRoad", requestId, road, session, username)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.ViewOptions:hidden-road

Authored path: `BFSThisMess.ViewOptions`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 113.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 119.

```reaction
when RequestBoundary.request (includeIAPAndSummer, path: "/bfsthismess/viewOptions", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.ViewOptions:no-session

Authored path: `BFSThisMess.ViewOptions`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 113.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 119.

```reaction
when RequestBoundary.request (includeIAPAndSummer, path: "/bfsthismess/viewOptions", requestId, road, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.ViewOptions:viewer

Authored path: `BFSThisMess.ViewOptions`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 113.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 119.

```reaction
when RequestBoundary.request (includeIAPAndSummer, path: "/bfsthismess/viewOptions", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
then
  RequestBoundary.respond (options: former "the options of a road" with (includeIAPAndSummer, road), requestId)
```

### BFSThisMess.ViewRatings

Authored path: `BFSThisMess.ViewRatings`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 35.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 40.

```reaction
when RequestBoundary.request (course, path: "/bfsthismess/viewRatings", requestId)
then
  RequestBoundary.respond (ratings: former "the ratings of a course" with (course), requestId)
```

### BFSThisMess.ViewRoad:hidden-road

Authored path: `BFSThisMess.ViewRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 111.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 118.

```reaction
when RequestBoundary.request (includeIAPAndSummer, limit, path: "/bfsthismess/viewRoad", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.ViewRoad:no-session

Authored path: `BFSThisMess.ViewRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 111.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 118.

```reaction
when RequestBoundary.request (includeIAPAndSummer, limit, path: "/bfsthismess/viewRoad", requestId, road, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.ViewRoad:viewer

Authored path: `BFSThisMess.ViewRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 111.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 118.

```reaction
when RequestBoundary.request (includeIAPAndSummer, limit, path: "/bfsthismess/viewRoad", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
then
  RequestBoundary.respond (constraints: former "the constraints of a road" with (road), paths: former "the paths of a road" with (includeIAPAndSummer, limit, road), requestId, requirements: former "the requirements of a road" with (road))
```

### BFSThisMess.ViewSchedule

Authored path: `BFSThisMess.ViewSchedule`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 35.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 41.

```reaction
when RequestBoundary.request (course, path: "/bfsthismess/viewSchedule", requestId)
then
  RequestBoundary.respond (requestId, schedule: former "the schedule of a course" with (course))
```

### BFSThisMess.ViewSharing:hidden-road

Authored path: `BFSThisMess.ViewSharing`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 97.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 102.

```reaction
when RequestBoundary.request (path: "/bfsthismess/viewSharing", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.ViewSharing:no-session

Authored path: `BFSThisMess.ViewSharing`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 97.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 102.

```reaction
when RequestBoundary.request (path: "/bfsthismess/viewSharing", requestId, road, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.ViewSharing:not-owner

Authored path: `BFSThisMess.ViewSharing`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 97.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 102.

```reaction
when RequestBoundary.request (path: "/bfsthismess/viewSharing", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._isOwner (road, user) has (owner: false)
then
  RequestBoundary.respond (error: "NOT_AN_OWNER", requestId)
```

### BFSThisMess.ViewSharing:owner

Authored path: `BFSThisMess.ViewSharing`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 97.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 102.

```reaction
when RequestBoundary.request (path: "/bfsthismess/viewSharing", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._isOwner (road, user) has (owner: true)
then
  RequestBoundary.respond (requestId, viewers: former "the people a road is shared with" with (road))
```

### BFSThisMess.ViewSubject

Authored path: `BFSThisMess.ViewSubject`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 35.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 39.

```reaction
when RequestBoundary.request (course, path: "/bfsthismess/viewSubject", requestId)
then
  RequestBoundary.respond (requestId, subject: former "the details of a course" with (course))
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

- `/bfsthismess/addBlock` — requires `count`, `road`, `session`, `technical`
- `/bfsthismess/addOption` — requires `block`, `session`, `subject`
- `/bfsthismess/addPrior` — requires `road`, `session`, `subject`
- `/bfsthismess/checkPlan` — requires `road`, `session`
- `/bfsthismess/chooseAlternative` — requires `alternative`, `choice`, `road`, `session`
- `/bfsthismess/clearCap` — requires `capType`, `road`, `session`, `term`, `year`
- `/bfsthismess/deleteRoad` — requires `road`, `session`
- `/bfsthismess/findPaths` — requires `includeIAPAndSummer`, `limit`, `road`, `session`
- `/bfsthismess/logIn` — requires `password`, `username`
- `/bfsthismess/logOut` — requires `session`
- `/bfsthismess/myRoads` — requires `session`
- `/bfsthismess/newRoad` — requires `major`, `name`, `session`, `startTerm`, `startYear`
- `/bfsthismess/pin` — requires `road`, `session`, `subject`, `term`, `year`
- `/bfsthismess/previewEndChange` — requires `road`, `session`, `term`, `year`
- `/bfsthismess/previewStartChange` — requires `road`, `session`, `term`, `year`
- `/bfsthismess/register` — requires `password`, `username`
- `/bfsthismess/removeBlock` — requires `block`, `session`
- `/bfsthismess/removeOption` — requires `block`, `session`, `subject`
- `/bfsthismess/removePrior` — requires `road`, `session`, `subject`
- `/bfsthismess/renameRoad` — requires `name`, `road`, `session`
- `/bfsthismess/resetSemester` — requires `road`, `session`, `term`, `year`
- `/bfsthismess/searchSubjects` — requires `level`, `query`, `term`
- `/bfsthismess/setCap` — requires `capType`, `limit`, `road`, `session`, `term`, `year`
- `/bfsthismess/setCount` — requires `block`, `count`, `session`
- `/bfsthismess/setEnd` — requires `road`, `session`, `term`, `year`
- `/bfsthismess/setLocked` — requires `locked`, `road`, `session`, `term`, `year`
- `/bfsthismess/setMajor` — requires `major`, `road`, `session`
- `/bfsthismess/setStart` — requires `road`, `session`, `term`, `year`
- `/bfsthismess/shareRoad` — requires `road`, `session`, `username`
- `/bfsthismess/unPin` — requires `road`, `session`, `subject`
- `/bfsthismess/unshareRoad` — requires `road`, `session`, `username`
- `/bfsthismess/viewOptions` — requires `includeIAPAndSummer`, `road`, `session`
- `/bfsthismess/viewRatings` — requires `course`
- `/bfsthismess/viewRoad` — requires `includeIAPAndSummer`, `limit`, `road`, `session`
- `/bfsthismess/viewSchedule` — requires `course`
- `/bfsthismess/viewSharing` — requires `road`, `session`
- `/bfsthismess/viewSubject` — requires `course`
