# Constrain

## Purpose

Let a student state everything a multi-year course plan must satisfy (what they have already done, what they must take, and how much they can take each semester) and find plans that meet it.

## Principle

A student creates a road for a major, starting in a given semester. They record the credit they brought in as prior credit, pin the subjects they have taken to the semesters they took them in, and lock those semesters so that nothing else can be added to them. The major's requirements are added to the road as blocks, each asking for some number of subjects from a list of options. The student caps the units they are willing to take in a semester, and may pin subjects they have chosen for the future. They then ask for the options that still fit, or for plans that finish as early as possible. A requirement with very many options, such as eight HASS subjects, is left to the student: a plan keeps an open slot for it in some semester, and the student asks which subjects could fill that slot and pins one. If no plan fits, they relax a cap, remove a pin, or move the end of the road later to widen the set of valid plans.

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
  a history String
  Rule: major is a label, e.g. "6-3" or "2-A". Its requirements are added to the road as blocks by whoever sets them up.
  Rule: The start is the student's first semester at MIT and is a FALL or SPRING season. The end is the last season they plan to be enrolled and comes after the start.
  Rule: By default the end is eight FALL and SPRING semesters after the start, counting the start itself. A FALL start in year Y ends in SPRING of Y + 4; a SPRING start in year Y ends in FALL of Y + 3. A plan that finishes after the end needs an extra semester the student has not yet decided on.
  Rule: prior is credit the student brought in before their first semester (AP, transfer, ASE and so on). It is history: it belongs to no season, is part of every plan, and counts toward blocks. A subject is never both prior credit and pinned in the same road.
  Rule: history is the account history of the road's owner as last applied (see applyHistory): JSON of the form {"prior": [subjects], "seasons": [{"year", "term", "subjects": [subjects]}]}, or empty for a road it has never been applied to. A road made before history existed has an empty history.

a set of Blocks with
  a Road
  an options set of Subject
  a count Number
  a title String
  a technical Flag
  a group String
  an origin String
  an early Flag
  Rule: A block is a requirement: the road needs at least count distinct subjects from the options of the block. count is at least 1.
  Rule: A subject that must be taken is a block with that one subject as its only option and a count of 1.
  Rule: A block with no options is ignored until it has one.
  Rule: group says which blocks compete for subjects: one subject cannot count toward two blocks of the same group, but may count toward blocks of different groups. The blocks a student adds share the empty group; whoever lists blocks chooses their groups (for example, the blocks of one major in one group, and each requirement a subject may meet on top of others in a group of its own).
  Rule: origin names the requirement a block was listed from (e.g. "major6-3/4.2"); it is empty for a block the student adds. A block with an origin is a listed block: it is replaced, not edited, when the requirements change.
  Rule: technical says whether the subjects of the block count toward caps on technical units (see technical below). title is a name for the block, e.g. "Foundation", or empty.
  Rule: early says plans take the subjects of the block as early as they can without finishing later (for example the GIRs). A block the student adds is not early. A block made before early existed is early if it has an origin and is not technical.
  Rule: A block with more than 100 options is open. Plans do not choose subjects for an open block; they leave slots for it that the student fills (see slots below). Subjects that are taken, or chosen for other blocks, still count toward it.

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
  a fromHistory Flag
  an optional maxUnits Number
  an optional maxTechnicalUnits Number
  unique road and year and term
  Rule: A season of a road with no Semester behaves as an unlocked Semester with no caps, except that an IAP season has maxUnits 12.
  Rule: Caps are measured in units, using the units of each subject. A cap that is absent means no cap; a cap of 0 allows nothing.
  Rule: A locked semester contains exactly the subjects pinned to it, no more and no fewer; it is how history is recorded. A locked semester with no pins is empty.
  Rule: Any semester can be locked or unlocked on its own, so locked semesters need not be contiguous.
  Rule: fromHistory says the semester holds a season of the road's history, so it is locked and is changed only by applying the history again. A Semester made before fromHistory existed is not from history.

a set of Listings with
  a unique Subject
  a units Number
  a popularity Number
  a terms set of Term
  Rule: units is the total units of the subject, as a number. terms are the terms the subject can run in. popularity is how many students usually take it (0 if unknown); among options that are otherwise equal, plans take the more popular.

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

a Catalog with
  an optional snapshot String
  Rule: snapshot is the id of the last catalog snapshot whose subjects were all copied into Listings, Dependencies and Cancellations, so that a copy that was cut short is made again. Whoever copies may make it include a digest of the snapshot's contents, so that a snapshot edited under the same id is copied again.

Rule: Listings, Dependencies and Cancellations are this concept's copy of the facts it needs about subjects. They are kept up to date by synchronizations with the concept that owns subject information, and by no other means.
Rule: historyPrior(road) is the prior subjects of the history of road, together with the subjects of every season of the history that lies before the start or after the end of road (taken, but outside the seasons the road shows). historySeasons(road) is the seasons of the history that lie between the start and the end of road.
Rule: placed(road) holds when the subjects of historyPrior(road) are in the prior credit of road and are pinned nowhere, and for each season of historySeasons(road), road has a locked Semester for it with fromHistory true whose pins are exactly the subjects of that season; no other Semester of road is fromHistory. Placing the history of road makes placed(road) hold: it takes out what the history placed before (the prior credit it added, and the pins of its Semesters, which become unlocked and not from history), deletes any other pin of a subject the history now holds, and removes such a subject from the prior credit if it is in a season.
Rule: taken(road) is the prior credit of road plus every pinned subject. takenBefore(road, season) is the prior credit plus the subjects pinned to earlier seasons. takenBy(road, season) is the prior credit plus the subjects pinned to that season or an earlier one.
Rule: canRun(subject, season) holds when the subject has a Listing, its terms include the term of season, and it has no Cancellation for season.
Rule: dependenciesMet(road, subject, season) holds when every PREREQUISITE dependency of subject has at least count of its options in takenBefore(road, season), and every COREQUISITE dependency has at least count of its options in takenBy(road, season).
Rule: technical(road, subject) holds when subject is an option of a technical block of road. Whether a subject is technical depends on the road's requirements: 21M.301 is technical for a Music major and not for a Computer Science one.
Rule: room(road, season) is the units still free in season after its pins: maxUnits minus the units pinned, and maxTechnicalUnits minus the units pinned of subjects that are technical(road, subject). An absent cap leaves unlimited room. A season with no Semester uses the defaults in the rules above.
Rule: withinCaps(road, season) holds when neither room of season is negative. fitsRoom(road, subject, season) holds when the units of subject fit in the total room of season, and if technical(road, subject), in its technical room.
Rule: canGoIn(road, subject, season) is the one test for adding a subject: season is unlocked and between the start and end of road, subject is not in taken(road), canRun(subject, season), dependenciesMet(road, subject, season), and fitsRoom(road, subject, season) all hold.
Rule: covered(road, subjects) holds when, for each group, the subjects can be assigned to the blocks of road in that group so that every block with options gets at least count distinct options, and no subject is assigned to two blocks of the group.
Rule: candidates(road) is the subjects a plan may add: every option of a block of road that is not open, plus every option of a dependency of a candidate or of a pinned subject, repeated until nothing new is added. A candidate that is only a prerequisite or corequisite is taken to meet that dependency; it counts toward a block only if it is also an option of that block.
Rule: A slot is a place a plan keeps for a subject the student will choose. It stands for a set of open blocks, at most one of each group, whose options have at least 10 subjects in common, and it is filled by one of those common options. It takes 12 units of room, and counts toward technical room if one of its blocks is technical.
Rule: slots(road, subjects) are made, for a plan taking subjects, from what the open blocks still need once taken(road) and subjects count toward them (assigned as in covered). Going through the open blocks from the fewest options to the most, each subject a block still needs is put into the first slot made so far that it may join (the slot has no block of its group, and the common options stay at least 10), or else into a new slot. So the 8 HASS subjects of the GIRs share slots with the HASS-A, HASS-H, HASS-S and CI-H subjects, and need 8 slots in all.
Rule: reachable(road) is the subjects in taken(road), plus every candidate that canGoIn some season up to the end of road, working through the seasons in order and treating subjects reachable in earlier seasons as taken. Each subject is checked on its own, so two reachable subjects may not fit in the same season together.
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

copyRoad(road: Road, name: String) : returns (copy: Road)
  where road does not exist
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where road exists and name is empty
  then
    refuses EMPTY_NAME "A road needs a name."
  where road exists and name is not empty
  then
    create a new road copy with this name and the major, start and end of road, a copy of each of its blocks (with the same options, count, title, technical, group, origin and early), of each of its pins and of each of its semesters (with the same locks and caps, and none from history), no prior credit and an empty history
    returns copy

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
    place the history of road again, since the seasons it shows have moved
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
    place the history of road again, since the seasons it shows have moved
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
  where road exists and subject has no Listing
  then
    refuses NO_LISTING "That subject is not known."
  where road exists and subject is pinned in a semester from history
  then
    refuses HISTORY_SEASON "That semester is part of your history. Change it in your history."
  where road exists, subject has a Listing and is not pinned in a semester from history
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
  where road exists and subject is in historyPrior(road)
  then
    refuses HISTORY_PRIOR "That credit is part of your history. Change it in your history."
  where road exists and subject is in the prior credit of road and not in historyPrior(road)
  then
    remove subject from the prior credit of road
    returns

addBlock(road: Road, count: Number, technical: Flag) : returns (block: Block)
  where road does not exist
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where road exists and count is less than 1
  then
    refuses BAD_COUNT "A block must require at least one subject."
  where road exists and count is at least 1
  then
    create a new block of road with this count and technical, no options, an empty title, an empty group and an empty origin
    returns block

addListedBlock(road: Road, count: Number, title: String, technical: Flag, group: String, origin: String, early: Flag) : returns (block: Block)
  where road does not exist
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where road exists and count is less than 1
  then
    refuses BAD_COUNT "A block must require at least one subject."
  where road exists and count is at least 1
  then
    create a new block of road with this count, title, technical, group, origin and early, and no options
    returns block

removeListedBlocks(road: Road) : returns ()
  where road does not exist
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where road exists
  then
    delete every block of road that has an origin, keeping the blocks the student added
    returns

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
  where block exists and subject has no Listing
  then
    refuses NO_LISTING "That subject is not known."
  where block exists and subject has a Listing
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
  where road exists and the semester of this season is from history, or subject is currently pinned in a semester from history
  then
    refuses HISTORY_SEASON "That semester is part of your history. Change it in your history."
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
  where road exists and the pin for subject is in a semester from history
  then
    refuses HISTORY_SEASON "That semester is part of your history. Change it in your history."
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
  where road exists and its Semester for this season is from history
  then
    refuses HISTORY_SEASON "That semester is part of your history. Change it in your history."
  where road exists and its Semester for this season, if any, is not from history
  then
    if road has no Semester for this season, create one, unlocked, not from history, with no maxTechnicalUnits and with maxUnits 12 if term is IAP, otherwise no maxUnits
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
  where road exists and its Semester for this season is from history
  then
    refuses HISTORY_SEASON "That semester is part of your history. Change it in your history."
  where road exists and road has a Semester for this season that is not from history
  then
    delete that Semester, so the season takes the defaults in the state rules (its pins are unaffected)
    returns

applyHistory(road: Road, history: String) : returns ()
  where road does not exist
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where road exists and history is not JSON of the form described in the state rules
  then
    refuses BAD_HISTORY "That history could not be read."
  where road exists and history can be read
  then
    set the history of road to history
    place the history of road (see placed in the state rules), so that its prior credit and its past seasons are as the history says, locked
    returns

setListing(subject: Subject, units: Number) : returns ()
  where subject has a Listing
  then
    replace the units of its Listing and keep its terms
    returns
  where subject has no Listing
  then
    create a Listing for subject with this units, no terms and popularity 0
    returns

setPopularity(subject: Subject, popularity: Number) : returns ()
  where subject has a Listing
  then
    set the popularity of its Listing to popularity
    returns
  where subject has no Listing
  then
    refuses NO_LISTING "That subject is not known."

addListingTerm(subject: Subject, term: Term) : returns ()
  where subject has no Listing
  then
    refuses NO_LISTING "That subject is not known."
  where subject has a Listing
  then
    add term to the terms of the Listing of subject if it is not already there
    returns

removeListingTerm(subject: Subject, term: Term) : returns ()
  where subject has no Listing
  then
    refuses NO_LISTING "That subject is not known."
  where subject has a Listing and term is not in the terms of its Listing
  then
    refuses NOT_A_TERM "That subject does not run in that term."
  where subject has a Listing and term is in the terms of its Listing
  then
    remove term from the terms of the Listing of subject
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

markCatalog(snapshot: String) : returns ()
  where snapshot is not empty
  then
    set the snapshot of Catalog to snapshot
    returns
  where snapshot is empty
  then
    refuses NO_SNAPSHOT "A catalog snapshot needs an id."
```

## Queries

```queries
_road(road: Road) : one (name: String, major: String, startYear: Number, startTerm: Term, endYear: Number, endTerm: Term)
  where road exists. Answers the name, major, start and end of road.

_prior(road: Road) : many (subject: Subject, fromHistory: Flag)
  where road exists. Answers each subject in the prior credit of road, with whether it is in historyPrior(road), or no rows if there are none.

_blocks(road: Road) : many (block: Block, count: Number, subject: Subject, title: String, technical: Flag, group: String, origin: String, early: Flag)
  where road exists. Answers one row for each option of each block of road, ordered by block (listed blocks first, in the order they were added, then the student's), or no rows if there are none. A block with no options has no rows.

_pins(road: Road) : many (subject: Subject, year: Number, term: Term)
  where road exists. Answers every pin of road, ordered by season, or no rows if there are none.

_semesters(road: Road) : many (year: Number, term: Term, locked: Flag, fromHistory: Flag, maxUnits: Number, maxTechnicalUnits: Number)
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
    - the subject is in candidates(road)
    - canGoIn(road, subject, season)
  fitsByEnd is true if, with subject pinned to season, covered(road, reachable(road)) still holds. It is false when taking the option would push some block past the end of road: the student should move the end later (setEnd) before choosing it. Because reachable checks each subject on its own, fitsByEnd can be true when the subjects only fit one at a time; _findPath catches that case.

_findPath(road: Road, includeIAPAndSummer: Flag, limit: Number) : many (plan: Number, year: Number, term: Term, subject: Subject, slot: String, title: String, units: Number, counts: String)
  where road exists and limit is at least 1. Answers up to limit plans, numbered from 1, with one row for each subject in each season of each plan (prior credit is in every plan but has no rows; see _prior), and one row for each slot, whose subject is empty, whose slot is the ids of its blocks joined by commas, and whose title is the titles of its blocks joined by " · ". slot and title are empty for a subject. units is the units of the subject, or 12 for a slot. counts is the ids of the blocks, joined by commas, that the subject is counted toward in that plan (assigned as in covered, each group on its own), or empty if it is only there for a dependency; for a slot it is the slot's blocks. Each plan would satisfy _satisfies once its slots are filled, and locked semesters appear exactly as pinned. Plans are built, not searched for exhaustively, so that a whole degree can be planned:
    1. Choose: for each group, pick subjects that cover its blocks, preferring subjects already taken or chosen for another group, then those needing the fewest new subjects before them (their own prerequisites, followed down; a subject every plan takes, the only options of a block, is not new), then the more popular. Then pick for each group again, in the same order, now preferring subjects chosen for the other groups, so that a requirement that may share subjects takes those of the others.
    2. Complete: add, for every chosen or pinned subject, the cheapest options of each dependency that is not yet met, the more popular among equals, until nothing is missing.
    3. Slots: make slots(road, subjects) and place them first, one per FALL or SPRING season in turn from the first unlocked season to the end of road (then again from the start), each where its 12 units fit.
    4. Schedule: from the first unlocked season of road, place the subjects season by season (FALL and SPRING always; IAP and SUMMER only if includeIAPAndSummer is true), each in the first season where canGoIn holds once its dependencies are placed. Subjects that more others wait on go first, and a subject needed by a pin goes before the pin. Each plan is also scheduled with the subjects of early blocks (and what they need) first; that schedule is kept unless it finishes later, after the end of road. Electives (subjects chosen for a block that has other options, outside early blocks, that nothing else in the plan waits on) are placed last, from the end backwards, one per semester in turn, each in the latest season where canGoIn holds up to the later of the end of road and the plan's last season (or, if none, the first one where it does), so that the early semesters hold what later subjects need; as with early blocks, that schedule is kept unless it finishes later, after the end of road.
  Different plans come from choosing different options for the blocks: leaving out one chosen subject, or every subject chosen for one block, at a time. Plans that take the same subjects count once. Plans are ordered breadth-first: by the season they finish in, then by the number of subjects they add. If some plan finishes by the end of road, only plans that finish by the end are answered; otherwise the earliest-finishing plans are answered. Among plans that finish in the same season, each next plan answered is the one with the most subjects that no plan answered before it has, so that the plans differ, and the student can compare a plan's last season with the end to see that it needs extra semesters. If no plan can be built, answers no rows.

_historyWarnings(history: String) : many (year: Number, term: Term, subject: Subject, missing: String)
  Answers one row for each dependency of each subject of a season of history (as in applyHistory) that the history does not meet: a PREREQUISITE needs count of its options in the prior credit of history or in an earlier season of it, a COREQUISITE in the same season or an earlier one. missing words the dependency as its options joined by " or ", or as "count of" its options joined by ", " when count is more than 1. Rows are in season order, then subject order. A history that cannot be read answers no rows. Real history may predate the catalog's rules, so these are warnings, not refusals.

_unmetDependencies(road: Road) : many (year: Number, term: Term, subject: Subject, missing: String)
  where road exists. Answers, in the same form as _historyWarnings, one row for each dependency of each pin of road outside the semesters from history that the prior credit and pins of road do not meet, so that a student who corrects their history is told which planned subjects it leaves without what they need.

_planSeasons(road: Road, includeIAPAndSummer: Flag, limit: Number) : many (plan: Number, year: Number, term: Term, subjects: String, slots: Number, units: Number, locked: Flag)
  where road exists and limit is at least 1. Answers one row for each season of each plan of _findPath(road, includeIAPAndSummer, limit) that has a subject or a slot, in plan and season order: subjects are the plan's subjects in that season, in subject order, joined by commas; slots the number of its slots; units their units in all; and locked whether the season's Semester is locked. It is _findPath grouped by season, for working out the hours of each semester of each plan.

_slotOptions(road: Road, blocks: String, year: Number, term: Term) : many (subject: Subject)
  where road exists. blocks is the ids of blocks of road joined by commas, as in a slot of _findPath. Answers, in subject order, each subject that is an option of every one of these blocks and canGoIn(road, subject, season) for this season, or no rows if there are none.

_loadedCatalog() : one (found: Flag, id: String)
  If a catalog snapshot has been marked, answers found = true with the id of the last one; otherwise answers found = false and an empty id.

_roadOfBlock(block: Block) : optional (road: Road)
  Answers the road that block belongs to, or no row if block does not exist.
```