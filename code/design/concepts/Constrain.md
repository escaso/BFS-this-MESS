# Constrain

## Purpose

Let a student state everything a multi-year course plan must satisfy (what they have already done, what they must take, and how much they can take each semester) and find plans that meet it.

## Principle

A student creates a road for a major, starting in a given semester. They record the credit they brought in as prior credit, pin the subjects they have taken to the semesters they took them in, and lock those semesters so that nothing else can be added to them. The major's requirements are added to the road as blocks, each asking for some number of subjects from a list of options. The student caps the units they are willing to take in a semester, and may pin subjects they have chosen for the future. They then ask for the options that still fit, or for plans that finish as early as possible. If no plan fits, they relax a cap, remove a pin, or move the end of the road later to widen the set of valid plans.

## Types

```types
external Subject
  The generic type for a course/subject. It is only an identity here; the facts this concept needs about a subject (units, terms, prerequisites) are held in this concept's own state (see Listings, Dependencies and Cancellations).

Term is IAP or SPRING or SUMMER or FALL
  The part of an academic year a semester falls in, as named in the subject listing.

DependencyKind is PREREQUISITE or COREQUISITE
  Whether a dependency must be satisfied in an earlier semester (PREREQUISITE) or in the same or an earlier one (COREQUISITE).
```

## State

```state
Rule: A season is a year together with a term. Seasons are ordered by year, then by term (IAP < SPRING < SUMMER < FALL), so FALL 2026 comes before IAP 2027.

a set of Roads with
  a name String
  a major String
  a startYear Number
  a startTerm Term
  an endYear Number
  an endTerm Term
  a prior set of Subject
  Rule: major is a label, e.g. "6-3" or "2-A". Its requirements are added to the road as blocks by whoever sets them up.
  Rule: The start is the student's first semester at MIT and is a FALL or SPRING season. The end is the last season they plan to be enrolled and comes after the start.
  Rule: By default the end is eight FALL and SPRING semesters after the start, counting the start itself. A FALL start in year Y ends in SPRING of Y + 4; a SPRING start in year Y ends in FALL of Y + 3. A plan that finishes after the end needs an extra semester the student has not yet decided on.
  Rule: prior is credit the student brought in before their first semester (AP, transfer, ASE and so on). It is history: it belongs to no season, is part of every plan, and counts toward blocks. A subject is never both prior credit and pinned in the same road.

a set of Blocks with
  a Road
  an options set of Subject
  a count Number
  Rule: A block is a requirement: the road needs at least count distinct subjects from the options of the block. count is at least 1.
  Rule: A subject that must be taken is a block with that one subject as its only option and a count of 1.
  Rule: A block with no options is ignored until it has one.
  Rule: One subject cannot count toward two blocks of the same road.

a set of Pins with
  a Road
  a Subject
  a year Number
  a term Term
  unique road and subject
  Rule: A pin's season is the season its subject is (or was) taken in. It lies between the start and the end of its road, inclusive.
  Rule: A pinned subject must appear in every valid plan, whether or not it is in a block.

a set of Semesters with
  a Road
  a year Number
  a term Term
  a locked Flag
  an optional maxUnits Number
  an optional maxTechnicalUnits Number
  unique road and year and term
  Rule: A season of a road with no Semester behaves as an unlocked Semester with no caps, except that an IAP season has maxUnits 12.
  Rule: Caps are measured in units, using the units of each subject. A cap that is absent means no cap; a cap of 0 allows nothing.
  Rule: A locked semester contains exactly the subjects pinned to it, no more and no fewer; it is how history is recorded. A locked semester with no pins is empty.
  Rule: Any semester can be locked or unlocked on its own, so locked semesters need not be contiguous.

a set of Listings with
  a unique Subject
  a units Number
  a technical Flag
  a terms set of Term
  Rule: units is the total units of the subject, as a number. terms are the terms the subject can run in.

a set of Dependencies with
  a course Subject
  a kind DependencyKind
  an options set of Subject
  a count Number
  Rule: A dependency says that course needs at least count of its options in the plan. A PREREQUISITE must be in an earlier season than the course; a COREQUISITE in the same season or an earlier one. Prior credit always counts.
  Rule: An "or" in a subject's prerequisites is a dependency with count 1 and several options.

a set of Cancellations with
  a Subject
  a year Number
  a term Term
  unique subject and year and term
  Rule: A cancellation says a subject is not offered in that season even though its terms allow it. A subject with no cancellation is assumed to be available.

Rule: Listings, Dependencies and Cancellations are this concept's copy of the facts it needs about subjects. They are kept up to date by synchronizations with the concept that owns subject information, and by no other means.
```

## Actions

```actions
newRoad(name: String, major: String, startYear: Number, startTerm: Term) : returns (road: Road)
  where name is empty
  then
    refuses EMPTY_NAME "A road needs a name."
  where name is not empty and startTerm is not FALL or SPRING
  then
    refuses BAD_START "A road must start in a Fall or Spring semester."
  where name is not empty and startTerm is FALL or SPRING
  then
    create a new road with this name, the specified major, this start, the default end for this start (see the state rules), no prior credit, no blocks, no pins and no semesters
    returns road

renameRoad(road: Road, name: String) : returns ()
  where road does not exist
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where road exists and name is empty
  then
    refuses EMPTY_NAME "A road needs a name."
  where road exists and name is not empty
  then
    set the name of road to name
    returns

deleteRoad(road: Road) : returns ()
  where road does not exist
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where road exists
  then
    delete road together with its blocks, pins and semesters
    returns

setStart(road: Road, year: Number, term: Term) : returns ()
  where road does not exist
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where road exists and term is not FALL or SPRING
  then
    refuses BAD_START "A road must start in a Fall or Spring semester."
  where road exists and term is FALL or SPRING
  then
    move the end of road by as many FALL and SPRING semesters as the start moves, so the road keeps the same number of semesters (including any extra semester added with setEnd)
    set the start of road to this season
    delete every pin of road that now lies before the start or after the end
    returns

setEnd(road: Road, year: Number, term: Term) : returns ()
  where road does not exist
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where road exists and this season does not come after the start of road
  then
    refuses END_BEFORE_START "The end must come after the start."
  where road exists and this season comes after the start of road
  then
    set the end of road to this season (moving it later is how the student adds an extra semester)
    delete every pin of road that now lies after the end
    returns

setMajor(road: Road, major: String) : returns ()
  where road does not exist
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where road exists and major is empty
  then
    refuses EMPTY_MAJOR "A major cannot be empty."
  where road exists and major is not empty
  then
    set the major of road to major
    returns

addPrior(road: Road, subject: Subject) : returns ()
  where road does not exist
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where road exists
  then
    if subject is pinned in road, delete that pin
    add subject to the prior credit of road
    returns

removePrior(road: Road, subject: Subject) : returns ()
  where road does not exist
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where road exists and subject is not in the prior credit of road
  then
    refuses NOT_PRIOR "That subject is not prior credit for this road."
  where road exists and subject is in the prior credit of road
  then
    remove subject from the prior credit of road
    returns

addBlock(road: Road, count: Number) : returns (block: Block)
  where road does not exist
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where road exists and count is less than 1
  then
    refuses BAD_COUNT "A block must require at least one subject."
  where road exists and count is at least 1
  then
    create a new block of road with this count and no options
    returns block

setCount(block: Block, count: Number) : returns ()
  where block does not exist
  then
    refuses NO_SUCH_BLOCK "There is no such block."
  where block exists and count is less than 1
  then
    refuses BAD_COUNT "A block must require at least one subject."
  where block exists and count is at least 1
  then
    set the count of block to count
    returns

addOption(block: Block, subject: Subject) : returns ()
  where block does not exist
  then
    refuses NO_SUCH_BLOCK "There is no such block."
  where block exists
  then
    add subject to the options of block
    returns

removeOption(block: Block, subject: Subject) : returns ()
  where block does not exist
  then
    refuses NO_SUCH_BLOCK "There is no such block."
  where block exists and subject is not an option of block
  then
    refuses NOT_AN_OPTION "That subject is not an option of this block."
  where block exists and subject is an option of block
  then
    remove subject from the options of block
    returns

removeBlock(block: Block) : returns ()
  where block does not exist
  then
    refuses NO_SUCH_BLOCK "There is no such block."
  where block exists
  then
    delete block
    returns

pin(road: Road, subject: Subject, year: Number, term: Term) : returns ()
  where road does not exist
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where road exists and subject has no Listing
  then
    refuses NO_LISTING "That subject is not known."
  where road exists and subject is in the prior credit of road
  then
    refuses ALREADY_PRIOR "That subject is already prior credit."
  where road exists and this season is before the start or after the end of road
  then
    refuses OUT_OF_SPAN "That semester is outside the road."
  where road exists and the semester of this season is locked, or subject is currently pinned in a locked semester
  then
    refuses LOCKED_SEASON "That semester is locked."
  where none of the above holds
  then
    if a pin for subject exists in road, set its season to this season, otherwise create a new pin for subject with this season and add it to road
    returns

unPin(road: Road, subject: Subject) : returns ()
  where road does not exist
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where road exists and no pin for subject exists in road
  then
    refuses NOT_PINNED "That subject is not pinned in this road."
  where road exists and the pin for subject is in a locked semester
  then
    refuses LOCKED_SEASON "That semester is locked."
  where road exists and a pin for subject exists in an unlocked semester
  then
    delete the pin
    returns

setLocked(road: Road, year: Number, term: Term, locked: Flag) : returns ()
  where road does not exist
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where road exists
  then
    if road has no Semester for this season, create one, unlocked, with no maxTechnicalUnits and with maxUnits 12 if term is IAP, otherwise no maxUnits
    set the locked of that Semester to locked
    a locked semester now contains exactly its pinned subjects (a locked semester with no pins is empty)
    returns

setCap(road: Road, year: Number, term: Term, capType: String, limit: Number) : returns ()
  where road does not exist
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where road exists and capType is not "total" or "technical"
  then
    refuses BAD_CAP_TYPE "The cap type must be total or technical."
  where road exists, capType is "total" or "technical", and limit is less than 0
  then
    refuses NEGATIVE_LIMIT "A cap cannot be negative."
  where road exists, capType is "total" or "technical", and limit is at least 0
  then
    if road has no Semester for this season, create one as in setLocked
    if capType is "total", set the maxUnits of that Semester to limit; if capType is "technical", set its maxTechnicalUnits to limit
    returns

clearCap(road: Road, year: Number, term: Term, capType: String) : returns ()
  where road does not exist
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where road exists and capType is not "total" or "technical"
  then
    refuses BAD_CAP_TYPE "The cap type must be total or technical."
  where road exists and capType is "total" or "technical"
  then
    if road has no Semester for this season, create one as in setLocked
    remove the respective cap (maxUnits or maxTechnicalUnits) of that Semester, so that it is uncapped
    returns

resetSemester(road: Road, year: Number, term: Term) : returns ()
  where road does not exist
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where road exists and road has no Semester for this season
  then
    refuses NO_SUCH_SEMESTER "That semester has no settings."
  where road exists and road has a Semester for this season
  then
    delete that Semester, so the season takes the defaults in the state rules (its pins are unaffected)
    returns

setListing(subject: Subject, units: Number, technical: Flag, terms: set of Term) : returns ()
  then
    if subject has a Listing, replace its units, technical and terms, otherwise create one
    returns

removeListing(subject: Subject) : returns ()
  where subject has no Listing
  then
    refuses NO_LISTING "That subject is not known."
  where subject has a Listing
  then
    delete the Listing of subject, together with every Dependency whose course is subject and every Cancellation of subject
    returns

addDependency(course: Subject, kind: DependencyKind, count: Number) : returns (dependency: Dependency)
  where course has no Listing
  then
    refuses NO_LISTING "That subject is not known."
  where course has a Listing and count is less than 1
  then
    refuses BAD_COUNT "A dependency must require at least one subject."
  where course has a Listing and count is at least 1
  then
    create a new dependency of course with this kind, this count and no options
    returns dependency

addDependencyOption(dependency: Dependency, subject: Subject) : returns ()
  where dependency does not exist
  then
    refuses NO_SUCH_DEPENDENCY "There is no such dependency."
  where dependency exists
  then
    add subject to the options of dependency
    returns

removeDependency(dependency: Dependency) : returns ()
  where dependency does not exist
  then
    refuses NO_SUCH_DEPENDENCY "There is no such dependency."
  where dependency exists
  then
    delete dependency
    returns

markCancelled(subject: Subject, year: Number, term: Term) : returns ()
  where subject has no Listing
  then
    refuses NO_LISTING "That subject is not known."
  where subject has a Listing
  then
    add a Cancellation of subject for this season if there is none
    returns

unmarkCancelled(subject: Subject, year: Number, term: Term) : returns ()
  where subject has no Cancellation for this season
  then
    refuses NOT_CANCELLED "That subject is not marked as cancelled in that semester."
  where subject has a Cancellation for this season
  then
    delete it
    returns
```

## Definitions

Shorthand used by the queries below. These are not state; each is computed from the state of a road.

```definitions
Who has been taken
  taken(road)               the prior credit of road plus every pinned subject
  takenBefore(road, season) the prior credit plus the subjects pinned to earlier seasons
  takenBy(road, season)     the prior credit plus the subjects pinned to that season or an earlier one

Can a subject be taken in a season?
  canRun(subject, season)
    the subject has a Listing, its terms include the term of season, and it has no Cancellation for season
  dependenciesMet(road, subject, season)
    every PREREQUISITE dependency of subject has at least count of its options in takenBefore(road, season),
    and every COREQUISITE dependency has at least count of its options in takenBy(road, season)

Units
  room(road, season)
    the units still free in season after its pins: maxUnits minus the units pinned, and maxTechnicalUnits minus the technical units pinned.
    An absent cap leaves unlimited room. A season with no Semester uses the defaults in the state rules.
  withinCaps(road, season)
    neither room is negative
  fitsRoom(road, subject, season)
    the units of subject fit in the total room of season, and if subject is technical, in its technical room

The one test for adding a subject
  canGoIn(road, subject, season)
    season is unlocked and between the start and end of road, subject is not in taken(road),
    canRun(subject, season), dependenciesMet(road, subject, season), and fitsRoom(road, subject, season)

Blocks
  covered(road, subjects)
    the subjects can be assigned to the blocks of road so that every block with options gets at least count distinct options,
    and no subject is assigned to two blocks
  reachable(road)
    the subjects in taken(road), plus every option of a block that canGoIn some season up to the end of road,
    working through the seasons in order and treating subjects reachable in earlier seasons as taken.
    Each subject is checked on its own, so two reachable subjects may not fit in the same season together
```

## Queries

```queries
_road(road: Road) : one (name: String, major: String, startYear: Number, startTerm: Term, endYear: Number, endTerm: Term)
  where road exists. Answers the name, major, start and end of road.

_prior(road: Road) : many (subject: Subject)
  where road exists. Answers each subject in the prior credit of road, or no rows if there are none.

_blocks(road: Road) : many (block: Block, count: Number, subject: Subject)
  where road exists. Answers one row for each option of each block of road, ordered by block, or no rows if there are none. A block with no options has no rows.

_pins(road: Road) : many (subject: Subject, year: Number, term: Term)
  where road exists. Answers every pin of road, ordered by season, or no rows if there are none.

_semesters(road: Road) : many (year: Number, term: Term, locked: Flag, maxUnits: Number, maxTechnicalUnits: Number)
  where road exists. Answers every Semester of road, ordered by season, or no rows if there are none. A cap that is absent is answered as 0, meaning no cap. Seasons with no Semester take the defaults given in the state rules.

_pinsLostBySetStart(road: Road, year: Number, term: Term) : many (subject: Subject, year: Number, term: Term)
  where road exists and term is FALL or SPRING. Answers the pins that setStart(road, year, term) would delete, so that the student can be warned first, or no rows if there are none.

_pinsLostBySetEnd(road: Road, year: Number, term: Term) : many (subject: Subject, year: Number, term: Term)
  where road exists and this season comes after the start of road. Answers the pins that setEnd(road, year, term) would delete, so that the student can be warned first, or no rows if there are none.

_satisfies(road: Road) : one (satisfied: Flag)
  where road exists. Judges the plan the student has chosen so far (the prior credit and pins of road). Answers true if all four hold, otherwise false:
    1. covered(road, taken(road))
    2. every pin is in a season where canRun(subject, season)
    3. dependenciesMet(road, subject, season) holds for every pin
    4. withinCaps(road, season) holds for every unlocked season
  Locked semesters are exempt from caps, since history is a fact and not a choice. Pins and locks hold by construction, since the plan is made of the pins.

_options(road: Road, includeIAPAndSummer: Flag) : many (year: Number, term: Term, subject: Subject, fitsByEnd: Flag)
  where road exists. Answers one row for each season and subject such that:
    - the season is from the start of road through its end (FALL and SPRING always; IAP and SUMMER only if includeIAPAndSummer is true)
    - the subject is an option of some block of road
    - canGoIn(road, subject, season)
  fitsByEnd is true if, with subject pinned to season, covered(road, reachable(road)) still holds. It is false when taking the option would push some block past the end of road: the student should move the end later (setEnd) before choosing it. Because reachable checks each subject on its own, fitsByEnd can be true when the subjects only fit one at a time; _findPath catches that case.

_findPath(road: Road, includeIAPAndSummer: Flag, limit: Number) : many (plan: Number, year: Number, term: Term, subject: Subject)
  where road exists and limit is at least 1. Answers up to limit plans, numbered from 1, with one row for each subject in each season of each plan (prior credit is in every plan but has no rows; see _prior). Each plan satisfies _satisfies and finishes in the earliest possible season. Locked semesters appear exactly as pinned. The search is breadth-first:
    1. Start from the pins of road, beginning at the first unlocked season (counting from the start) that has room left after its pins.
    2. Extend a plan by taking a row of _options whose subject is an option of some block, and treating it as a pin.
    3. A plan is complete when covered(road, taken(road)) holds.
    4. Keep the complete plans that finish earliest.
  FALL and SPRING seasons are always used; IAP and SUMMER only if includeIAPAndSummer is true (pins and locks in them are respected either way). Plans may finish after the end of road if none finishes by it; the student can compare a plan's last season with the end to see this. If no valid plan exists, answers no rows.
```

## Notes

Design notes (not part of the concept's behavior):

- Subject facts are mirrored here on purpose. Constrain keeps its own Listings, Dependencies and Cancellations so that it never reads another concept's state. CourseOffering stays the owner of subject information; a synchronization copies the facts across whenever CourseOffering loads. When CourseOffering is updated it should hold units as a number (summed from e.g. "3-0-9") and represent a subject's prerequisite "or" groups as blocks, as here.
- Requirements were previously a separate "required" set plus elective blocks. A required subject is now a block with a single option and a count of 1, which removes a special case from every query. The old _placements query (the required-only view) is dropped for now because that distinction no longer exists in the state.
- The requirements of a major are produced outside this concept (e.g. a MajorRequirements concept loaded from the web, versioned by catalog year). A synchronization on setMajor replaces all blocks of the road with the new major's: it removes every existing block and adds the new ones with addBlock and addOption.
- fitsByEnd now checks all blocks together: it asks whether the blocks can still be covered if every reachable subject were taken, so it accounts for a subject not counting toward two blocks. Previously each block was checked on its own.
- Known gap: _options and _findPath only consider subjects that appear in a block. A prerequisite that is not prior credit, not pinned and not in any block can never be satisfied by the search.