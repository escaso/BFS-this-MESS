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
- `_matching(prefix: String) : many (user: User, username: String)`

#### Instances

- `Authentication` — instance of `Authentication` — [Application types](../design/types.md), line 17.

### Constrain

Defined in [Constrain](../design/concepts/Constrain.md), line 1.

#### Actions

- `newRoad(name: String, major: String, startYear: Number, startTerm: Term) : returns (road: Road)`
  - Refuses `EMPTY_NAME`: A road needs a name.
  - Refuses `BAD_START`: A road must start in a Fall or Spring semester.
- `copyRoad(road: Road, name: String) : returns (copy: Road)`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
  - Refuses `EMPTY_NAME`: A road needs a name.
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
  - Refuses `HISTORY_SEASON`: That semester is part of your history. Change it in your history.
- `removePrior(road: Road, subject: Subject) : returns ()`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
  - Refuses `NOT_PRIOR`: That subject is not prior credit for this road.
  - Refuses `HISTORY_PRIOR`: That credit is part of your history. Change it in your history.
- `addBlock(road: Road, count: Number, technical: Flag) : returns (block: Block)`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
  - Refuses `BAD_COUNT`: A block must require at least one subject.
- `addListedBlock(road: Road, count: Number, title: String, technical: Flag, group: String, origin: String, early: Flag) : returns (block: Block)`
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
  - Refuses `HISTORY_SEASON`: That semester is part of your history. Change it in your history.
  - Refuses `LOCKED_SEASON`: That semester is locked.
- `unPin(road: Road, subject: Subject) : returns ()`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
  - Refuses `NOT_PINNED`: That subject is not pinned in this road.
  - Refuses `HISTORY_SEASON`: That semester is part of your history. Change it in your history.
  - Refuses `LOCKED_SEASON`: That semester is locked.
- `setLocked(road: Road, year: Number, term: Term, locked: Flag) : returns ()`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
  - Refuses `HISTORY_SEASON`: That semester is part of your history. Change it in your history.
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
  - Refuses `HISTORY_SEASON`: That semester is part of your history. Change it in your history.
- `applyHistory(road: Road, history: String) : returns ()`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
  - Refuses `BAD_HISTORY`: That history could not be read.
- `setListing(subject: Subject, units: Number) : returns ()`
- `setPopularity(subject: Subject, popularity: Number) : returns ()`
  - Refuses `NO_LISTING`: That subject is not known.
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
- `markCatalog(snapshot: String) : returns ()`
  - Refuses `NO_SNAPSHOT`: A catalog snapshot needs an id.

#### Queries

- `_road(road: Road) : one (name: String, major: String, startYear: Number, startTerm: Term, endYear: Number, endTerm: Term)`
- `_prior(road: Road) : many (subject: Subject, fromHistory: Flag)`
- `_blocks(road: Road) : many (block: Block, count: Number, subject: Subject, title: String, technical: Flag, group: String, origin: String, early: Flag)`
- `_pins(road: Road) : many (subject: Subject, year: Number, term: Term)`
- `_semesters(road: Road) : many (year: Number, term: Term, locked: Flag, fromHistory: Flag, maxUnits: Number, maxTechnicalUnits: Number)`
- `_pinsLostBySetStart(road: Road, year: Number, term: Term) : many (subject: Subject, year: Number, term: Term)`
- `_pinsLostBySetEnd(road: Road, year: Number, term: Term) : many (subject: Subject, year: Number, term: Term)`
- `_satisfies(road: Road) : one (satisfied: Flag)`
- `_options(road: Road, includeIAPAndSummer: Flag) : many (year: Number, term: Term, subject: Subject, fitsByEnd: Flag)`
- `_findPath(road: Road, includeIAPAndSummer: Flag, limit: Number, plans?: String) : many (plan: Number, year: Number, term: Term, subject: Subject, slot: String, title: String, units: Number, counts: String)`
- `_historyWarnings(history: String) : many (year: Number, term: Term, subject: Subject, missing: String)`
- `_unmetDependencies(road: Road) : many (year: Number, term: Term, subject: Subject, missing: String)`
- `_planSeasons(road: Road, includeIAPAndSummer: Flag, limit: Number, plans?: String) : many (plan: Number, year: Number, term: Term, subjects: String, slots: Number, units: Number, locked: Flag)`
- `_plansEncoded(road: Road, includeIAPAndSummer: Flag, limit: Number) : one (plans: String)`
- `_slotOptions(road: Road, blocks: String, year: Number, term: Term) : many (subject: Subject)`
- `_loadedCatalog() : one (found: Flag, id: String)`
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
- `_matches(course: Subject, query: String) : one (matches: Flag)`
- `_terms(course: Subject) : many (term: Term)`
- `_schedule(course: Subject) : one (found: Flag, units: String, meetingTimes: String, location: String)`

#### Instances

- `CourseOffering` — instance of `CourseOffering` — [Application types](../design/types.md), line 11.
  - `Subject` is `CourseId` — [Application types](../design/types.md), line 12.

### History

Defined in [History](../design/concepts/History.md), line 1.

#### Actions

- `addPrior(user: User, subject: Subject) : returns ()`
  - Refuses `ALREADY_TAKEN`: That subject is already in your history.
- `removePrior(user: User, subject: Subject) : returns ()`
  - Refuses `NOT_PRIOR`: That subject is not in your prior credit.
- `finishPrior(user: User) : returns ()`
- `setStart(user: User, year: Number, term: Term) : returns ()`
  - Refuses `BAD_START`: You must have started in a Fall or Spring semester.
- `addTaken(user: User, year: Number, term: Term, subject: Subject) : returns ()`
  - Refuses `NOT_PAST`: That semester is not one of your past semesters.
  - Refuses `LOCKED`: That semester is locked. Unlock it to change it.
  - Refuses `ALREADY_TAKEN`: That subject is already in your history.
- `removeTaken(user: User, year: Number, term: Term, subject: Subject) : returns ()`
  - Refuses `NOT_TAKEN`: That subject is not in that semester.
  - Refuses `LOCKED`: That semester is locked. Unlock it to change it.
- `lock(user: User, year: Number, term: Term) : returns ()`
  - Refuses `NOT_PAST`: That semester is not one of your past semesters.
- `unlock(user: User, year: Number, term: Term) : returns ()`
  - Refuses `NOT_LOCKED`: That semester is not locked.

#### Queries

- `_profile(user: User) : one (started: Flag, startYear: Number, startTerm: Term, priorDone: Flag, currentYear: Number, currentTerm: Term, complete: Flag)`
- `_prior(user: User) : many (subject: Subject)`
- `_seasons(user: User) : many (year: Number, term: Term, answered: Flag, locked: Flag, count: Number)`
- `_taken(user: User, year: Number, term: Term) : many (subject: Subject)`
- `_allTaken(user: User) : many (year: Number, term: Term, subject: Subject)`
- `_pending(user: User) : optional (year: Number, term: Term)`
- `_encoded(user: User) : one (history: String)`

#### Instances

- `History` — instance of `History` — [Application types](../design/types.md), line 27.
  - `Subject` is `CourseId` — [Application types](../design/types.md), line 29.
  - `User` is `Authentication.User` — [Application types](../design/types.md), line 28.

### Requirements

Defined in [Requirements](../design/concepts/Requirements.md), line 1.

#### Actions

- `load(snapshot: String) : returns (count: Number)`
  - Refuses `LOAD_FAILED`: The requirements snapshot could not be parsed.
- `choose(road: Road, choice: Item, alternative: Item) : returns ()`
  - Refuses `NO_SUCH_CHOICE`: There is no such choice.
  - Refuses `NOT_AN_ALTERNATIVE`: That is not one of the alternatives of this choice.
- `copyChoices(from: Road, to: Road) : returns ()`
- `forget(road: Road) : returns ()`

#### Queries

- `_loadedSnapshot() : one (found: Flag, id: String)`
- `_lists() : many (list: String, title: String, shortTitle: String, mediumTitle: String, kind: ListKind)`
- `_list(list: String) : one (found: Flag, title: String, shortTitle: String, mediumTitle: String, kind: ListKind)`
- `_activeBlocks(list: String, road: Road) : many (item: Item, title: String, count: Number, technical: Flag, group: String)`
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
- `share(road: Road, requester: User, user: User, role: Role) : returns ()`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
  - Refuses `NOT_AN_EDITOR`: You can only view this road.
  - Refuses `BAD_ROLE`: A role must be view or edit.
  - Refuses `EDITORS_ADD_VIEWERS`: Editors can only add viewers.
  - Refuses `SHARE_WITH_OWNER`: The owner already has access to this road.
- `setRole(road: Road, requester: User, user: User, role: Role) : returns ()`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
  - Refuses `NOT_AN_OWNER`: Only the owner can change who a road is shared with.
  - Refuses `BAD_ROLE`: A role must be view or edit.
  - Refuses `NOT_SHARED`: That road is not shared with that user.
- `unshare(road: Road, requester: User, user: User) : returns ()`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
  - Refuses `NOT_AN_OWNER`: Only the owner can change who a road is shared with.
  - Refuses `NOT_SHARED`: That road is not shared with that user.
- `enableLink(road: Road, requester: User, role: Role) : returns ()`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
  - Refuses `NOT_AN_OWNER`: Only the owner can manage this road's links.
  - Refuses `BAD_ROLE`: A role must be view or edit.
- `disableLink(road: Road, requester: User, role: Role) : returns ()`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
  - Refuses `NOT_AN_OWNER`: Only the owner can manage this road's links.
  - Refuses `BAD_ROLE`: A role must be view or edit.
- `regenerateLink(road: Road, requester: User, role: Role) : returns ()`
  - Refuses `NO_SUCH_ROAD`: There is no such road.
  - Refuses `NOT_AN_OWNER`: Only the owner can manage this road's links.
  - Refuses `BAD_ROLE`: A role must be view or edit.
- `join(token: String, user: User) : returns (road: Road)`
  - Refuses `INVALID_LINK`: This link is no longer valid.

#### Queries

- `_canView(road: Road, user: User) : one (allowed: Flag)`
- `_canEdit(road: Road, user: User) : one (allowed: Flag)`
- `_isOwner(road: Road, user: User) : one (owner: Flag)`
- `_role(road: Road, user: User) : one (role: Access)`
- `_roadsOwnedBy(user: User) : many (road: Road)`
- `_roadsSharedWith(user: User) : many (road: Road, role: Role)`
- `_grantsVisibleTo(road: Road, requester: User) : many (user: User, role: Role, addedBy: User)`
- `_ownerVisibleTo(road: Road, user: User) : optional (owner: User)`
- `_ownerOf(road: Road) : optional (owner: User)`
- `_known(road: Road, requester: User, user: User) : one (known: Flag)`
- `_links(road: Road, requester: User) : many (role: Role, token: String, enabled: Flag)`

#### Instances

- `Share` — instance of `Share` — [Application types](../design/types.md), line 23.
  - `Road` is `Constrain.Road` — [Application types](../design/types.md), line 24.
  - `User` is `Authentication.User` — [Application types](../design/types.md), line 25.

### TimeBudget

Defined in [TimeBudget](../design/concepts/TimeBudget.md), line 1.

#### Actions

- `ensureDefault(user: User) : returns (template: Template)`
- `override(user: User, year: Number, term: Term) : returns (template: Template)`
  - Refuses `NO_DEFAULT`: Set up your regular week first.
- `resetToDefault(user: User, year: Number, term: Term) : returns ()`
  - Refuses `NOT_OVERRIDDEN`: That semester already uses your regular week.
- `addBlock(user: User, template: Template, category: Category, day: Number, start: Number, slots: Number) : returns (block: Block)`
  - Refuses `NO_SUCH_TEMPLATE`: There is no such week.
  - Refuses `NO_SUCH_CATEGORY`: There is no such category.
  - Refuses `MANAGED_CATEGORY`: Class time comes from your classes; it cannot be painted.
  - Refuses `BAD_SLOT`: A block must start on a 15-minute mark and last from 15 minutes to under a week.
  - Refuses `OVERLAP`: That time is already blocked.
- `setBlock(user: User, block: Block, category: Category, day: Number, start: Number, slots: Number) : returns ()`
  - Refuses `NO_SUCH_BLOCK`: There is no such block.
  - Refuses `NO_SUCH_CATEGORY`: There is no such category.
  - Refuses `MANAGED_CATEGORY`: Class time comes from your classes; it cannot be painted.
  - Refuses `BAD_SLOT`: A block must start on a 15-minute mark and last from 15 minutes to under a week.
  - Refuses `OVERLAP`: That time is already blocked.
- `removeBlock(user: User, block: Block) : returns ()`
  - Refuses `NO_SUCH_BLOCK`: There is no such block.
- `addCategory(user: User, name: String, color: String) : returns (category: Category)`
  - Refuses `EMPTY_NAME`: A category needs a name.
  - Refuses `NAME_TAKEN`: You already have a category with that name.
- `renameCategory(user: User, category: Category, name: String) : returns ()`
  - Refuses `NOT_YOUR_CATEGORY`: Only your own categories can be changed.
  - Refuses `EMPTY_NAME`: A category needs a name.
  - Refuses `NAME_TAKEN`: You already have a category with that name.
- `recolorCategory(user: User, category: Category, color: String) : returns ()`
  - Refuses `NOT_YOUR_CATEGORY`: Only your own categories can be changed.
- `deleteCategory(user: User, category: Category) : returns ()`
  - Refuses `NOT_YOUR_CATEGORY`: Only your own categories can be changed.
- `setBuffer(user: User, buffer: Number) : returns ()`
  - Refuses `BAD_BUFFER`: The reserve must be from 0% to 50% of your free time.
- `setFactor(user: User, factor: Number) : returns ()`
  - Refuses `BAD_FACTOR`: Study hours per class hour must be from 2 to 3.
- `setSubjectFactor(user: User, subject: String, factor: Number) : returns ()`
  - Refuses `BAD_FACTOR`: Study hours per class hour must be from 2 to 3.
- `clearSubjectFactor(user: User, subject: String) : returns ()`
  - Refuses `NO_SUBJECT_FACTOR`: That subject uses your usual factor.
- `setMode(road: Road, mode: Mode) : returns ()`
  - Refuses `BAD_MODE`: The time budget is either soft or hard.
- `setRoadBuffer(road: Road, buffer: Number) : returns ()`
  - Refuses `BAD_BUFFER`: The reserve must be from 0% to 50% of your free time.
- `clearRoadBuffer(road: Road) : returns ()`
- `setShareMode(road: Road, shareMode: ShareMode) : returns ()`
  - Refuses `BAD_SHARE_MODE`: Share either hours only or your blocked time too.
- `setClass(subject: String, scheduleYear?: Number, scheduleTerm?: Term, parts: String, inClassHours?: Number, outOfClassHours?: Number, contactUnits?: Number) : returns ()`
  - Refuses `BAD_CLASS`: That class could not be read.
- `removeClass(subject: String) : returns ()`
- `chooseSection(road: Road, year: Number, term: Term, subject: String, kind: Kind, section: Number) : returns ()`
  - Refuses `NO_SUCH_SECTION`: That class has no such section that semester.
- `clearSection(road: Road, year: Number, term: Term, subject: String, kind: Kind) : returns ()`
  - Refuses `NOT_CHOSEN`: That section was picked for you already.
- `forgetRoad(road: Road) : returns ()`

#### Queries

- `_default(user: User) : optional (template: Template)`
- `_templateFor(user: User, year: Number, term: Term) : optional (template: Template, overridden: Flag)`
- `_overrides(user: User) : many (year: Number, term: Term, template: Template)`
- `_categories(user: User) : many (category: Category, name: String, color: String, own: Flag, managed: Flag)`
- `_blocks(template: Template) : many (block: Block, category: Category, day: Number, start: Number, slots: Number)`
- `_rollup(template: Template) : many (category: Category, day: Number, hours: Number)`
- `_blocked(template: Template) : one (blocked: Number, free: Number)`
- `_settings(user: User) : one (buffer: Number, factor: Number)`
- `_subjectFactors(user: User) : many (subject: String, factor: Number)`
- `_classHours(user: User, subject: String, year: Number, term: Term) : one (known: Flag, inClass: Number, inClassSource: String, outOfClass: Number, outOfClassSource: String, factor: Number, total: Number, schedule: String)`
- `_sections(subject: String, year: Number, term: Term) : many (kind: Kind, section: Number, room: String, day: Number, start: Number, slots: Number)`
- `_semesterMetrics(user: User, road: Road, year: Number, term: Term, subjects: String, openSlots: Number) : one (inClass: Number, outOfClass: Number, total: Number, blocked: Number, free: Number, buffer: Number, usable: Number, capacity: Number, status: Status, conflicts: Number, estimated: Flag)`
- `_placement(user: User, road: Road, year: Number, term: Term, subjects: String) : many (subject: String, kind: Kind, section: Number, options: Number, chosen: Flag, room: String, day: Number, start: Number, slots: Number, conflicted: Flag)`
- `_conflicts(user: User, road: Road, year: Number, term: Term, subjects: String) : many (subject: String, kind: Kind, day: Number, start: Number, slots: Number, withBlock: Flag, with: String)`
- `_unplaced(year: Number, term: Term, subjects: String) : many (subject: String, reason: String)`
- `_searchLimit(road: Road, limit: Number) : one (candidates: Number)`
- `_keptPlans(user: User, road: Road, plans: String, limit: Number) : one (mode: Mode, kept: String, dropped: Number)`
- `_binding(user: User, road: Road, plans: String, kept: String) : many (plan: Number, year: Number, term: Term, inClass: Number, outOfClass: Number, free: Number, usable: Number, status: Status)`
- `_roadSettings(road: Road) : one (mode: Mode, hasBuffer: Flag, buffer: Number, shareMode: ShareMode)`

#### Instances

- `TimeBudget` — instance of `TimeBudget` — [Application types](../design/types.md), line 31.
  - `Road` is `Constrain.Road` — [Application types](../design/types.md), line 33.
  - `User` is `Authentication.User` — [Application types](../design/types.md), line 32.

## Application types

Concrete types:

- `CourseId` — [Application types](../design/types.md), line 6.

## Formers

_Formers name result shapes evaluated when asked. The source former owns_
_the authored explanation; this section records the generated shape._

### a week of blocked time

Authored path: `BFSThisMess.Week`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 170.

```former
Former "a week of blocked time" — inputs (template); bindings (blocked, free, block, category, day, start, slots, rollCategory, rollDay, hours); promises exactly one record — forms:
  a record of
    where TimeBudget._blocked (template) has (blocked, free)
    blocked
    blocks: each TimeBudget._blocks (template) has (block, category, day, slots, start)
      form a record of
        block
        category
        day
        slots
        start
    free
    rollup: each TimeBudget._rollup (template) has (category: rollCategory, day: rollDay, hours)
      form a record of
        category: rollCategory
        day: rollDay
        hours
    template
```

### the constraints of a road

Authored path: `BFSThisMess.RoadConstraints`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 213.

```former
Former "the constraints of a road" — inputs (road); bindings (name, major, startYear, startTerm, endYear, endTerm, priorSubject, priorFromHistory, block, count, option, blockTitle, blockTechnical, blockOrigin, pinSubject, pinYear, pinTerm, year, term, locked, fromHistory, maxUnits, maxTechnicalUnits); promises exactly one record — forms:
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
    prior: each Constrain._prior (road) has (fromHistory: priorFromHistory, subject: priorSubject)
      form a record of
        fromHistory: priorFromHistory
        subject: priorSubject
    semesters: each Constrain._semesters (road) has (fromHistory, locked, maxTechnicalUnits, maxUnits, term, year)
      form a record of
        fromHistory
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

### the history of a user

Authored path: `BFSThisMess.UserHistory`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 130.

```former
Former "the history of a user" — inputs (user); bindings (started, startYear, startTerm, priorDone, currentYear, currentTerm, complete, history, prior, year, term, answered, locked, count, takenYear, takenTerm, taken, pendingYear, pendingTerm, warnYear, warnTerm, warnSubject, missing, road, name, roadYear, roadTerm, roadSubject, roadMissing); promises exactly one record — forms:
  a record of
    where History._profile (user) has (complete, currentTerm, currentYear, priorDone, startTerm, startYear, started)
    where History._encoded (user) has (history)
    complete
    currentTerm
    currentYear
    pending: each History._pending (user) has (term: pendingTerm, year: pendingYear)
      form a record of
        term: pendingTerm
        year: pendingYear
    prior: each History._prior (user) has (subject: prior)
      form a record of
        subject: prior
    priorDone
    roadWarnings: each Share._roadsOwnedBy (user) has (road)
      where Constrain._road (road) has (name)
      where Constrain._unmetDependencies (road) has (missing: roadMissing, subject: roadSubject, term: roadTerm, year: roadYear)
      form a record of
        missing: roadMissing
        name
        road
        subject: roadSubject
        term: roadTerm
        year: roadYear
    seasons: each History._seasons (user) has (answered, count, locked, term, year)
      form a record of
        answered
        count
        locked
        term
        year
    startTerm
    startYear
    started
    taken: each History._allTaken (user) has (subject: taken, term: takenTerm, year: takenYear)
      form a record of
        subject: taken
        term: takenTerm
        year: takenYear
    warnings: each Constrain._historyWarnings (history) has (missing, subject: warnSubject, term: warnTerm, year: warnYear)
      form a record of
        missing
        subject: warnSubject
        term: warnTerm
        year: warnYear
```

### the hours of a class

Authored path: `BFSThisMess.ClassHours`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 157.

```former
Former "the hours of a class" — inputs (user, subject, year, term); bindings (known, inClass, inClassSource, outOfClass, outOfClassSource, factor, total, schedule, kind, section, room, day, start, slots); promises exactly one record — forms:
  a record of
    where TimeBudget._classHours (subject, term, user, year) has (factor, inClass, inClassSource, known, outOfClass, outOfClassSource, schedule, total)
    factor
    inClass
    inClassSource
    known
    outOfClass
    outOfClassSource
    schedule
    sections: each TimeBudget._sections (subject, term, year) has (day, kind, room, section, slots, start)
      form a record of
        day
        kind
        room
        section
        slots
        start
    total
```

### the hours of the semesters of the paths of a road

Authored path: `BFSThisMess.PlanMetrics`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 190.

```former
Former "the hours of the semesters of the paths of a road" — inputs (road, includeIAPAndSummer, limit); bindings (candidates, encoded, owner, mode, kept, dropped, plan, year, term, subjects, slots, units, locked, inClass, outOfClass, total, blocked, free, buffer, usable, capacity, status, conflicts, estimated); promises exactly one record — forms:
  a record of
    where TimeBudget._searchLimit (limit, road) has (candidates)
    where Constrain._plansEncoded (includeIAPAndSummer, limit: candidates, road) has (plans: encoded)
    where Share._ownerOf (road) has (owner)
    where TimeBudget._keptPlans (limit, plans: encoded, road, user: owner) has (dropped, kept, mode)
    semesters: each Constrain._planSeasons (includeIAPAndSummer, limit: candidates, plans: kept, road) has (locked, plan, slots, subjects, term, units, year)
      where TimeBudget._semesterMetrics (openSlots: slots, road, subjects, term, user: owner, year) has (blocked, buffer, capacity, conflicts, estimated, free, inClass, outOfClass, status, total, usable)
      form a record of
        blocked
        buffer
        capacity
        conflicts
        estimated
        free
        inClass
        locked
        outOfClass
        plan
        slots
        status
        subjects
        term
        total
        units
        usable
        year
```

### the links of a road

Authored path: `BFSThisMess.RoadLinks`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 107.

```former
Former "the links of a road" — inputs (road, requester); bindings (role, token, enabled); promises exactly one record — forms:
  a record of
    links: each Share._links (requester, road) has (enabled, role, token)
      form a record of
        enabled
        role
        token
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
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 215.

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
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 211.

```former
Former "the paths of a road" — inputs (road, includeIAPAndSummer, limit); bindings (candidates, encoded, owner, mode, kept, dropped, plan, year, term, subject, slot, title, units, counts, bPlan, bYear, bTerm, bInClass, bOutOfClass, bFree, bUsable, bStatus); promises exactly one record — forms:
  a record of
    where TimeBudget._searchLimit (limit, road) has (candidates)
    where Constrain._plansEncoded (includeIAPAndSummer, limit: candidates, road) has (plans: encoded)
    where Share._ownerOf (road) has (owner)
    where TimeBudget._keptPlans (limit, plans: encoded, road, user: owner) has (dropped, kept, mode)
    binding: each TimeBudget._binding (kept, plans: encoded, road, user: owner) has (free: bFree, inClass: bInClass, outOfClass: bOutOfClass, plan: bPlan, status: bStatus, term: bTerm, usable: bUsable, year: bYear)
      form a record of
        free: bFree
        inClass: bInClass
        outOfClass: bOutOfClass
        plan: bPlan
        status: bStatus
        term: bTerm
        usable: bUsable
        year: bYear
    dropped
    mode
    plans: each Constrain._findPath (includeIAPAndSummer, limit: candidates, plans: kept, road) has (counts, plan, slot, subject, term, title, units, year)
      form a record of
        counts
        plan
        slot
        subject
        term
        title
        units
        year
```

### the people a road is shared with

Authored path: `BFSThisMess.RoadPeople`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 105.

```former
Former "the people a road is shared with" — inputs (road, requester); bindings (user, role, addedBy, username, addedByName); promises exactly one record — forms:
  a record of
    people: each Share._grantsVisibleTo (requester, road) has (addedBy, role, user)
      where Authentication._username (user) has (username)
      where Authentication._username (user: addedBy) has (username: addedByName)
      form a record of
        addedBy: addedByName
        role
        username
```

### the people who match

Authored path: `BFSThisMess.MatchingPeople`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 101.

```former
Former "the people who match" — inputs (road, requester, prefix); bindings (user, username); promises exactly one record — forms:
  a record of
    people: each Authentication._matching (prefix) has (user, username)
      where Share._known (requester, road, user) has (known: false)
      form a record of
        username
```

### the pins lost by moving the end

Authored path: `BFSThisMess.PinsLostByEnd`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 215.

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
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 215.

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
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 209.

```former
Former "the roads of a user" — inputs (user); bindings (owned, ownedName, ownedMajor, shared, sharedName, sharedMajor, sharedRole, shown, owner, ownerName); promises exactly one record — forms:
  a record of
    owned: each Share._roadsOwnedBy (user) has (road: owned)
      where Constrain._road (road: owned) has (major: ownedMajor, name: ownedName)
      form a record of
        major: ownedMajor
        name: ownedName
        road: owned
    shared: each Share._roadsSharedWith (user) has (road: shared, role: sharedRole)
      where Constrain._road (road: shared) has (major: sharedMajor, name: sharedName)
      form a record of
        major: sharedMajor
        name: sharedName
        road: shared
        role: sharedRole
    sharedBy: each Share._roadsSharedWith (user) has (road: shown)
      where Share._ownerVisibleTo (road: shown, user) has (owner)
      where Authentication._username (user: owner) has (username: ownerName)
      form a record of
        road: shown
        username: ownerName
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

### the schedule of a semester of a plan

Authored path: `BFSThisMess.SemesterSchedule`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 190.

```former
Former "the schedule of a semester of a plan" — inputs (road, year, term, subjects); bindings (owner, subject, kind, section, options, chosen, room, day, start, slots, conflicted, cSubject, cKind, cDay, cStart, cSlots, withBlock, with, uSubject, reason, template, bCategory, bDay, bStart, bSlots, category, name, color); promises exactly one record — forms:
  a record of
    where Share._ownerOf (road) has (owner)
    blocks: each TimeBudget._templateFor (term, user: owner, year) has (template)
      where TimeBudget._blocks (template) has (category: bCategory, day: bDay, slots: bSlots, start: bStart)
      form a record of
        category: bCategory
        day: bDay
        slots: bSlots
        start: bStart
    categories: each TimeBudget._categories (user: owner) has (category, color, name)
      form a record of
        category
        color
        name
    conflicts: each TimeBudget._conflicts (road, subjects, term, user: owner, year) has (day: cDay, kind: cKind, slots: cSlots, start: cStart, subject: cSubject, with, withBlock)
      form a record of
        day: cDay
        kind: cKind
        slots: cSlots
        start: cStart
        subject: cSubject
        with
        withBlock
    placement: each TimeBudget._placement (road, subjects, term, user: owner, year) has (chosen, conflicted, day, kind, options, room, section, slots, start, subject)
      form a record of
        chosen
        conflicted
        day
        kind
        options
        room
        section
        slots
        start
        subject
    unplaced: each TimeBudget._unplaced (subjects, term, year) has (reason, subject: uSubject)
      form a record of
        reason
        subject: uSubject
```

### the study settings of a user

Authored path: `BFSThisMess.StudySettings`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 157.

```former
Former "the study settings of a user" — inputs (user); bindings (buffer, factor, subject, subjectFactor); promises exactly one record — forms:
  a record of
    where TimeBudget._settings (user) has (buffer, factor)
    buffer
    factor
    subjectFactors: each TimeBudget._subjectFactors (user) has (factor: subjectFactor, subject)
      form a record of
        factor: subjectFactor
        subject
```

### the subjects for a slot

Authored path: `BFSThisMess.SlotSubjects`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 217.

```former
Former "the subjects for a slot" — inputs (road, blocks, year, term, topic); bindings (subject, name, units); promises exactly one record — forms:
  a record of
    subjects: each Constrain._slotOptions (blocks, road, term, year) has (subject)
      where CourseOffering._matches (course: subject, query: topic) has (matches: true)
      where CourseOffering._course (course: subject) has (name, units)
      form a record of
        name
        subject
        units
```

### the time settings of a road

Authored path: `BFSThisMess.RoadTime`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.

```former
Former "the time settings of a road" — inputs (road); bindings (mode, hasBuffer, buffer, shareMode); promises exactly one record — forms:
  a record of
    where TimeBudget._roadSettings (road) has (buffer, hasBuffer, mode, shareMode)
    buffer
    hasBuffer
    mode
    shareMode
```

### the verdict on a plan

Authored path: `BFSThisMess.PlanVerdict`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 215.

```former
Former "the verdict on a plan" — inputs (road); bindings (satisfied); promises exactly one record — forms:
  a record of
    where Constrain._satisfies (road) has (satisfied)
    satisfied
```

### the week of a semester

Authored path: `BFSThisMess.SemesterWeek`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 170.

```former
Former "the week of a semester" — inputs (user, year, term); bindings (template, overridden, blocked, free, block, category, day, start, slots, rollCategory, rollDay, hours); promises exactly one record — forms:
  a record of
    where TimeBudget._templateFor (term, user, year) has (overridden, template)
    where TimeBudget._blocked (template) has (blocked, free)
    blocked
    blocks: each TimeBudget._blocks (template) has (block, category, day, slots, start)
      form a record of
        block
        category
        day
        slots
        start
    free
    overridden
    rollup: each TimeBudget._rollup (template) has (category: rollCategory, day: rollDay, hours)
      form a record of
        category: rollCategory
        day: rollDay
        hours
    template
```

### the weeks of a user

Authored path: `BFSThisMess.WeekSetup`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 170.

```former
Former "the weeks of a user" — inputs (user); bindings (category, name, color, own, managed, year, term, overrideTemplate, started, startYear, startTerm, priorDone, currentYear, currentTerm, complete); promises exactly one record — forms:
  a record of
    where History._profile (user) has (complete, currentTerm, currentYear, priorDone, startTerm, startYear, started)
    categories: each TimeBudget._categories (user) has (category, color, managed, name, own)
      form a record of
        category
        color
        managed
        name
        own
    currentTerm
    currentYear
    overrides: each TimeBudget._overrides (user) has (template: overrideTemplate, term, year)
      form a record of
        template: overrideTemplate
        term
        year
```

### their access to a road

Authored path: `BFSThisMess.RoadAccess`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 213.

```former
Former "their access to a road" — inputs (road, user); bindings (role, owner, username); promises exactly one record — forms:
  a record of
    where Share._role (road, user) has (role)
    role
    sharedBy: each Share._ownerVisibleTo (road, user) has (owner)
      where Authentication._username (user: owner) has (username)
      form a record of
        username
```

## Reactions

### BFSThisMess.AddBlock:editor

Authored path: `BFSThisMess.AddBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 68.

```reaction
when RequestBoundary.request (count, path: "/bfsthismess/addBlock", requestId, road, session, technical)
where
  Authentication._authenticate (session) has (user)
  Share._canEdit (road, user) has (allowed: true)
then
  Constrain.addBlock (count, road, technical)
```

### BFSThisMess.AddBlock:editor#2

Authored path: `BFSThisMess.AddBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 68.

```reaction
when Constrain.addBlock (count, road, technical, block), asked by BFSThisMess.AddBlock:editor
where
  earlier, RequestBoundary.request (count, path: "/bfsthismess/addBlock", requestId, road, session, technical)
then
  RequestBoundary.respond (block, requestId)
```

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

### BFSThisMess.AddBlock:view-only

Authored path: `BFSThisMess.AddBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 68.

```reaction
when RequestBoundary.request (count, path: "/bfsthismess/addBlock", requestId, road, session, technical)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._canEdit (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NOT_AN_EDITOR", requestId)
```

### BFSThisMess.AddCategory:no-session

Authored path: `BFSThisMess.AddCategory`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 172.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 182.

```reaction
when RequestBoundary.request (color, name, path: "/bfsthismess/addCategory", requestId, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.AddCategory:signed-in

Authored path: `BFSThisMess.AddCategory`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 172.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 182.

```reaction
when RequestBoundary.request (color, name, path: "/bfsthismess/addCategory", requestId, session)
where
  Authentication._authenticate (session) has (user)
then
  TimeBudget.addCategory (color, name, user)
```

### BFSThisMess.AddCategory:signed-in#2

Authored path: `BFSThisMess.AddCategory`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 172.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 182.

```reaction
when TimeBudget.addCategory (color, name, user, category), asked by BFSThisMess.AddCategory:signed-in
where
  earlier, RequestBoundary.request (color, name, path: "/bfsthismess/addCategory", requestId, session)
then
  RequestBoundary.respond (category, requestId)
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

### BFSThisMess.AddOption:owner

Authored path: `BFSThisMess.AddOption`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 70.

```reaction
when RequestBoundary.request (block, path: "/bfsthismess/addOption", requestId, session, subject)
where
  Authentication._authenticate (session) has (user)
  Constrain._roadOfBlock (block) has (road)
  Share._canEdit (road, user) has (allowed: true)
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

### BFSThisMess.AddOption:view-only

Authored path: `BFSThisMess.AddOption`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 70.

```reaction
when RequestBoundary.request (block, path: "/bfsthismess/addOption", requestId, session, subject)
where
  Authentication._authenticate (session) has (user)
  Constrain._roadOfBlock (block) has (road)
  Share._canView (road, user) has (allowed: true)
  Share._canEdit (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NOT_AN_EDITOR", requestId)
```

### BFSThisMess.AddPrior:editor

Authored path: `BFSThisMess.AddPrior`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 66.

```reaction
when RequestBoundary.request (path: "/bfsthismess/addPrior", requestId, road, session, subject)
where
  Authentication._authenticate (session) has (user)
  Share._canEdit (road, user) has (allowed: true)
then
  Constrain.addPrior (road, subject)
```

### BFSThisMess.AddPrior:editor#2

Authored path: `BFSThisMess.AddPrior`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 66.

```reaction
when Constrain.addPrior (road, subject), asked by BFSThisMess.AddPrior:editor
where
  earlier, RequestBoundary.request (path: "/bfsthismess/addPrior", requestId, road, session, subject)
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

### BFSThisMess.AddPrior:view-only

Authored path: `BFSThisMess.AddPrior`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 66.

```reaction
when RequestBoundary.request (path: "/bfsthismess/addPrior", requestId, road, session, subject)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._canEdit (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NOT_AN_EDITOR", requestId)
```

### BFSThisMess.AddPriorCredit

Authored path: `BFSThisMess.AddPriorCredit`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 132.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 138.

```reaction
when RequestBoundary.request (path: "/bfsthismess/addPriorCredit", requestId, session, subject)
where
  Authentication._authenticate (session) has (user)
  CourseOffering._course (course: subject) has (found: true)
then
  History.addPrior (subject, user)
```

### BFSThisMess.AddPriorCredit#2

Authored path: `BFSThisMess.AddPriorCredit`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 132.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 138.

```reaction
when History.addPrior (subject, user), asked by BFSThisMess.AddPriorCredit
at the flow's settlement frontier
where
  earlier, RequestBoundary.request (path: "/bfsthismess/addPriorCredit", requestId, session, subject)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.AddPriorCreditRefused:no-session

Authored path: `BFSThisMess.AddPriorCreditRefused`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 132.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 139.

```reaction
when RequestBoundary.request (path: "/bfsthismess/addPriorCredit", requestId, session, subject)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.AddPriorCreditRefused:unknown-subject

Authored path: `BFSThisMess.AddPriorCreditRefused`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 132.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 139.

```reaction
when RequestBoundary.request (path: "/bfsthismess/addPriorCredit", requestId, session, subject)
where
  Authentication._authenticate (session)
  CourseOffering._course (course: subject) has (found: false)
then
  RequestBoundary.respond (error: "UNKNOWN_SUBJECT", requestId)
```

### BFSThisMess.AddTaken

Authored path: `BFSThisMess.AddTaken`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 132.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 145.

```reaction
when RequestBoundary.request (path: "/bfsthismess/addTaken", requestId, session, subject, term, year)
where
  Authentication._authenticate (session) has (user)
  CourseOffering._course (course: subject) has (found: true)
then
  History.addTaken (subject, term, user, year)
```

### BFSThisMess.AddTaken#2

Authored path: `BFSThisMess.AddTaken`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 132.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 145.

```reaction
when History.addTaken (subject, term, user, year), asked by BFSThisMess.AddTaken
at the flow's settlement frontier
where
  earlier, RequestBoundary.request (path: "/bfsthismess/addTaken", requestId, session, subject, term, year)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.AddTakenRefused:no-session

Authored path: `BFSThisMess.AddTakenRefused`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 132.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 146.

```reaction
when RequestBoundary.request (path: "/bfsthismess/addTaken", requestId, session, subject, term, year)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.AddTakenRefused:unknown-subject

Authored path: `BFSThisMess.AddTakenRefused`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 132.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 146.

```reaction
when RequestBoundary.request (path: "/bfsthismess/addTaken", requestId, session, subject, term, year)
where
  Authentication._authenticate (session)
  CourseOffering._course (course: subject) has (found: false)
then
  RequestBoundary.respond (error: "UNKNOWN_SUBJECT", requestId)
```

### BFSThisMess.AddTimeBlock:no-session

Authored path: `BFSThisMess.AddTimeBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 172.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 179.

```reaction
when RequestBoundary.request (category, day, path: "/bfsthismess/addTimeBlock", requestId, session, slots, start, template)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.AddTimeBlock:signed-in

Authored path: `BFSThisMess.AddTimeBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 172.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 179.

```reaction
when RequestBoundary.request (category, day, path: "/bfsthismess/addTimeBlock", requestId, session, slots, start, template)
where
  Authentication._authenticate (session) has (user)
then
  TimeBudget.addBlock (category, day, slots, start, template, user)
```

### BFSThisMess.AddTimeBlock:signed-in#2

Authored path: `BFSThisMess.AddTimeBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 172.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 179.

```reaction
when TimeBudget.addBlock (category, day, slots, start, template, user, block), asked by BFSThisMess.AddTimeBlock:signed-in
where
  earlier, RequestBoundary.request (category, day, path: "/bfsthismess/addTimeBlock", requestId, session, slots, start, template)
then
  RequestBoundary.respond (block, requestId)
```

### BFSThisMess.CheckPlan:hidden-road

Authored path: `BFSThisMess.CheckPlan`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 215.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 224.

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
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 215.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 224.

```reaction
when RequestBoundary.request (path: "/bfsthismess/checkPlan", requestId, road, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.CheckPlan:viewer

Authored path: `BFSThisMess.CheckPlan`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 215.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 224.

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
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 91.

```reaction
when RequestBoundary.request (alternative, choice, path: "/bfsthismess/chooseAlternative", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canEdit (road, user) has (allowed: true)
then
  Requirements.choose (alternative, choice, road)
```

### BFSThisMess.ChooseAlternative#2

Authored path: `BFSThisMess.ChooseAlternative`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 85.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 91.

```reaction
when Requirements.choose (alternative, choice, road), asked by BFSThisMess.ChooseAlternative
then
  Constrain.removeListedBlocks (road)
```

### BFSThisMess.ChooseAlternative#3

Authored path: `BFSThisMess.ChooseAlternative`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 85.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 91.

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
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 92.

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
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 92.

```reaction
when RequestBoundary.request (alternative, choice, path: "/bfsthismess/chooseAlternative", requestId, road, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.ChooseAlternativeRefused:view-only

Authored path: `BFSThisMess.ChooseAlternativeRefused`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 85.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 92.

```reaction
when RequestBoundary.request (alternative, choice, path: "/bfsthismess/chooseAlternative", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._canEdit (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NOT_AN_EDITOR", requestId)
```

### BFSThisMess.ChooseSection:editor

Authored path: `BFSThisMess.ChooseSection`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 203.

```reaction
when RequestBoundary.request (kind, path: "/bfsthismess/chooseSection", requestId, road, section, session, subject, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canEdit (road, user) has (allowed: true)
then
  TimeBudget.chooseSection (kind, road, section, subject, term, year)
```

### BFSThisMess.ChooseSection:editor#2

Authored path: `BFSThisMess.ChooseSection`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 203.

```reaction
when TimeBudget.chooseSection (kind, road, section, subject, term, year), asked by BFSThisMess.ChooseSection:editor
where
  earlier, RequestBoundary.request (kind, path: "/bfsthismess/chooseSection", requestId, road, section, session, subject, term, year)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.ChooseSection:hidden-road

Authored path: `BFSThisMess.ChooseSection`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 203.

```reaction
when RequestBoundary.request (kind, path: "/bfsthismess/chooseSection", requestId, road, section, session, subject, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.ChooseSection:no-session

Authored path: `BFSThisMess.ChooseSection`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 203.

```reaction
when RequestBoundary.request (kind, path: "/bfsthismess/chooseSection", requestId, road, section, session, subject, term, year)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.ChooseSection:view-only

Authored path: `BFSThisMess.ChooseSection`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 203.

```reaction
when RequestBoundary.request (kind, path: "/bfsthismess/chooseSection", requestId, road, section, session, subject, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._canEdit (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NOT_AN_EDITOR", requestId)
```

### BFSThisMess.ClearCap:editor

Authored path: `BFSThisMess.ClearCap`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 77.

```reaction
when RequestBoundary.request (capType, path: "/bfsthismess/clearCap", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canEdit (road, user) has (allowed: true)
then
  Constrain.clearCap (capType, road, term, year)
```

### BFSThisMess.ClearCap:editor#2

Authored path: `BFSThisMess.ClearCap`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 77.

```reaction
when Constrain.clearCap (capType, road, term, year), asked by BFSThisMess.ClearCap:editor
where
  earlier, RequestBoundary.request (capType, path: "/bfsthismess/clearCap", requestId, road, session, term, year)
then
  RequestBoundary.respond (requestId)
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

### BFSThisMess.ClearCap:view-only

Authored path: `BFSThisMess.ClearCap`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 77.

```reaction
when RequestBoundary.request (capType, path: "/bfsthismess/clearCap", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._canEdit (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NOT_AN_EDITOR", requestId)
```

### BFSThisMess.ClearRoadReserve:editor

Authored path: `BFSThisMess.ClearRoadReserve`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 202.

```reaction
when RequestBoundary.request (path: "/bfsthismess/clearRoadReserve", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canEdit (road, user) has (allowed: true)
then
  TimeBudget.clearRoadBuffer (road)
```

### BFSThisMess.ClearRoadReserve:editor#2

Authored path: `BFSThisMess.ClearRoadReserve`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 202.

```reaction
when TimeBudget.clearRoadBuffer (road), asked by BFSThisMess.ClearRoadReserve:editor
where
  earlier, RequestBoundary.request (path: "/bfsthismess/clearRoadReserve", requestId, road, session)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.ClearRoadReserve:hidden-road

Authored path: `BFSThisMess.ClearRoadReserve`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 202.

```reaction
when RequestBoundary.request (path: "/bfsthismess/clearRoadReserve", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.ClearRoadReserve:no-session

Authored path: `BFSThisMess.ClearRoadReserve`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 202.

```reaction
when RequestBoundary.request (path: "/bfsthismess/clearRoadReserve", requestId, road, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.ClearRoadReserve:view-only

Authored path: `BFSThisMess.ClearRoadReserve`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 202.

```reaction
when RequestBoundary.request (path: "/bfsthismess/clearRoadReserve", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._canEdit (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NOT_AN_EDITOR", requestId)
```

### BFSThisMess.ClearSection:editor

Authored path: `BFSThisMess.ClearSection`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 204.

```reaction
when RequestBoundary.request (kind, path: "/bfsthismess/clearSection", requestId, road, session, subject, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canEdit (road, user) has (allowed: true)
then
  TimeBudget.clearSection (kind, road, subject, term, year)
```

### BFSThisMess.ClearSection:editor#2

Authored path: `BFSThisMess.ClearSection`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 204.

```reaction
when TimeBudget.clearSection (kind, road, subject, term, year), asked by BFSThisMess.ClearSection:editor
where
  earlier, RequestBoundary.request (kind, path: "/bfsthismess/clearSection", requestId, road, session, subject, term, year)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.ClearSection:hidden-road

Authored path: `BFSThisMess.ClearSection`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 204.

```reaction
when RequestBoundary.request (kind, path: "/bfsthismess/clearSection", requestId, road, session, subject, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.ClearSection:no-session

Authored path: `BFSThisMess.ClearSection`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 204.

```reaction
when RequestBoundary.request (kind, path: "/bfsthismess/clearSection", requestId, road, session, subject, term, year)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.ClearSection:view-only

Authored path: `BFSThisMess.ClearSection`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 204.

```reaction
when RequestBoundary.request (kind, path: "/bfsthismess/clearSection", requestId, road, session, subject, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._canEdit (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NOT_AN_EDITOR", requestId)
```

### BFSThisMess.ClearSubjectFactor:no-session

Authored path: `BFSThisMess.ClearSubjectFactor`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 157.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 165.

```reaction
when RequestBoundary.request (path: "/bfsthismess/clearSubjectFactor", requestId, session, subject)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.ClearSubjectFactor:signed-in

Authored path: `BFSThisMess.ClearSubjectFactor`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 157.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 165.

```reaction
when RequestBoundary.request (path: "/bfsthismess/clearSubjectFactor", requestId, session, subject)
where
  Authentication._authenticate (session) has (user)
then
  TimeBudget.clearSubjectFactor (subject, user)
```

### BFSThisMess.ClearSubjectFactor:signed-in#2

Authored path: `BFSThisMess.ClearSubjectFactor`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 157.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 165.

```reaction
when TimeBudget.clearSubjectFactor (subject, user), asked by BFSThisMess.ClearSubjectFactor:signed-in
where
  earlier, RequestBoundary.request (path: "/bfsthismess/clearSubjectFactor", requestId, session, subject)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.CopyRoad

Authored path: `BFSThisMess.CopyRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 109.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 124.

```reaction
when RequestBoundary.request (name, path: "/bfsthismess/copyRoad", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
then
  Constrain.copyRoad (name, road)
```

### BFSThisMess.CopyRoad#2

Authored path: `BFSThisMess.CopyRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 109.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 124.

```reaction
when Constrain.copyRoad (name, road, copy), asked by BFSThisMess.CopyRoad
at the flow's settlement frontier
where
  earlier, RequestBoundary.request (name, path: "/bfsthismess/copyRoad", requestId, road, session)
  Authentication._authenticate (session) has (user)
then
  Share.claim (road: copy, user)
```

### BFSThisMess.CopyRoad#3

Authored path: `BFSThisMess.CopyRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 109.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 124.

```reaction
when Share.claim (road: copy, user), asked by BFSThisMess.CopyRoad#2
where
  earlier, Constrain.copyRoad (name, road, copy), asked by BFSThisMess.CopyRoad
then
  Requirements.copyChoices (from: road, to: copy)
```

### BFSThisMess.CopyRoad#4

Authored path: `BFSThisMess.CopyRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 109.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 124.

```reaction
when Requirements.copyChoices (from: road, to: copy), asked by BFSThisMess.CopyRoad#3
at the flow's settlement frontier
where
  earlier, RequestBoundary.request (name, path: "/bfsthismess/copyRoad", requestId, road, session)
then
  RequestBoundary.respond (requestId, road: copy)
```

### BFSThisMess.CopyRoadRefused:hidden-road

Authored path: `BFSThisMess.CopyRoadRefused`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 109.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 125.

```reaction
when RequestBoundary.request (name, path: "/bfsthismess/copyRoad", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.CopyRoadRefused:no-session

Authored path: `BFSThisMess.CopyRoadRefused`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 109.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 125.

```reaction
when RequestBoundary.request (name, path: "/bfsthismess/copyRoad", requestId, road, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.DeleteCategory:no-session

Authored path: `BFSThisMess.DeleteCategory`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 172.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 185.

```reaction
when RequestBoundary.request (category, path: "/bfsthismess/deleteCategory", requestId, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.DeleteCategory:signed-in

Authored path: `BFSThisMess.DeleteCategory`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 172.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 185.

```reaction
when RequestBoundary.request (category, path: "/bfsthismess/deleteCategory", requestId, session)
where
  Authentication._authenticate (session) has (user)
then
  TimeBudget.deleteCategory (category, user)
```

### BFSThisMess.DeleteCategory:signed-in#2

Authored path: `BFSThisMess.DeleteCategory`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 172.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 185.

```reaction
when TimeBudget.deleteCategory (category, user), asked by BFSThisMess.DeleteCategory:signed-in
where
  earlier, RequestBoundary.request (category, path: "/bfsthismess/deleteCategory", requestId, session)
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

### BFSThisMess.DisableLink:hidden-road

Authored path: `BFSThisMess.DisableLink`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 107.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 121.

```reaction
when RequestBoundary.request (path: "/bfsthismess/disableLink", requestId, road, role, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.DisableLink:no-session

Authored path: `BFSThisMess.DisableLink`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 107.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 121.

```reaction
when RequestBoundary.request (path: "/bfsthismess/disableLink", requestId, road, role, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.DisableLink:not-owner

Authored path: `BFSThisMess.DisableLink`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 107.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 121.

```reaction
when RequestBoundary.request (path: "/bfsthismess/disableLink", requestId, road, role, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._isOwner (road, user) has (owner: false)
then
  RequestBoundary.respond (error: "NOT_AN_OWNER", requestId)
```

### BFSThisMess.DisableLink:owner

Authored path: `BFSThisMess.DisableLink`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 107.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 121.

```reaction
when RequestBoundary.request (path: "/bfsthismess/disableLink", requestId, road, role, session)
where
  Authentication._authenticate (session) has (user)
  Share._isOwner (road, user) has (owner: true)
then
  Share.disableLink (requester: user, road, role)
```

### BFSThisMess.DisableLink:owner#2

Authored path: `BFSThisMess.DisableLink`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 107.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 121.

```reaction
when Share.disableLink (requester: user, road, role), asked by BFSThisMess.DisableLink:owner
where
  earlier, RequestBoundary.request (path: "/bfsthismess/disableLink", requestId, road, role, session)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.EnableLink:hidden-road

Authored path: `BFSThisMess.EnableLink`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 107.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 120.

```reaction
when RequestBoundary.request (path: "/bfsthismess/enableLink", requestId, road, role, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.EnableLink:no-session

Authored path: `BFSThisMess.EnableLink`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 107.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 120.

```reaction
when RequestBoundary.request (path: "/bfsthismess/enableLink", requestId, road, role, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.EnableLink:not-owner

Authored path: `BFSThisMess.EnableLink`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 107.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 120.

```reaction
when RequestBoundary.request (path: "/bfsthismess/enableLink", requestId, road, role, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._isOwner (road, user) has (owner: false)
then
  RequestBoundary.respond (error: "NOT_AN_OWNER", requestId)
```

### BFSThisMess.EnableLink:owner

Authored path: `BFSThisMess.EnableLink`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 107.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 120.

```reaction
when RequestBoundary.request (path: "/bfsthismess/enableLink", requestId, road, role, session)
where
  Authentication._authenticate (session) has (user)
  Share._isOwner (road, user) has (owner: true)
then
  Share.enableLink (requester: user, road, role)
```

### BFSThisMess.EnableLink:owner#2

Authored path: `BFSThisMess.EnableLink`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 107.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 120.

```reaction
when Share.enableLink (requester: user, road, role), asked by BFSThisMess.EnableLink:owner
where
  earlier, RequestBoundary.request (path: "/bfsthismess/enableLink", requestId, road, role, session)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.FindPaths:hidden-road

Authored path: `BFSThisMess.FindPaths`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 211.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 221.

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
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 211.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 221.

```reaction
when RequestBoundary.request (includeIAPAndSummer, limit, path: "/bfsthismess/findPaths", requestId, road, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.FindPaths:viewer

Authored path: `BFSThisMess.FindPaths`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 211.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 221.

```reaction
when RequestBoundary.request (includeIAPAndSummer, limit, path: "/bfsthismess/findPaths", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
then
  RequestBoundary.respond (paths: former "the paths of a road" with (includeIAPAndSummer, limit, road), requestId)
```

### BFSThisMess.FindUsers:editor

Authored path: `BFSThisMess.FindUsers`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 101.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 115.

```reaction
when RequestBoundary.request (path: "/bfsthismess/findUsers", prefix, requestId, road, session)
where
  Authentication._authenticate (session) has (user: requester)
  Share._canEdit (road, user: requester) has (allowed: true)
then
  RequestBoundary.respond (people: former "the people who match" with (prefix, requester, road), requestId)
```

### BFSThisMess.FindUsers:hidden-road

Authored path: `BFSThisMess.FindUsers`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 101.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 115.

```reaction
when RequestBoundary.request (path: "/bfsthismess/findUsers", prefix, requestId, road, session)
where
  Authentication._authenticate (session) has (user: requester)
  Share._canView (road, user: requester) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.FindUsers:no-session

Authored path: `BFSThisMess.FindUsers`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 101.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 115.

```reaction
when RequestBoundary.request (path: "/bfsthismess/findUsers", prefix, requestId, road, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.FindUsers:view-only

Authored path: `BFSThisMess.FindUsers`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 101.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 115.

```reaction
when RequestBoundary.request (path: "/bfsthismess/findUsers", prefix, requestId, road, session)
where
  Authentication._authenticate (session) has (user: requester)
  Share._canView (road, user: requester) has (allowed: true)
  Share._canEdit (road, user: requester) has (allowed: false)
then
  RequestBoundary.respond (error: "NOT_AN_EDITOR", requestId)
```

### BFSThisMess.FinishPriorCredit:no-session

Authored path: `BFSThisMess.FinishPriorCredit`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 132.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 142.

```reaction
when RequestBoundary.request (path: "/bfsthismess/finishPriorCredit", requestId, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.FinishPriorCredit:signed-in

Authored path: `BFSThisMess.FinishPriorCredit`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 132.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 142.

```reaction
when RequestBoundary.request (path: "/bfsthismess/finishPriorCredit", requestId, session)
where
  Authentication._authenticate (session) has (user)
then
  History.finishPrior (user)
```

### BFSThisMess.FinishPriorCredit:signed-in#2

Authored path: `BFSThisMess.FinishPriorCredit`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 132.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 142.

```reaction
when History.finishPrior (user), asked by BFSThisMess.FinishPriorCredit:signed-in
where
  earlier, RequestBoundary.request (path: "/bfsthismess/finishPriorCredit", requestId, session)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.ForgetChoices

Authored path: `BFSThisMess.ForgetChoices`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 52.

```reaction
when Constrain.deleteRoad (road)
then
  Requirements.forget (road)
```

### BFSThisMess.ForgetRoadTime

Authored path: `BFSThisMess.ForgetRoadTime`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 194.

```reaction
when Constrain.deleteRoad (road)
then
  TimeBudget.forgetRoad (road)
```

### BFSThisMess.JoinLink:no-session

Authored path: `BFSThisMess.JoinLink`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 107.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 123.

```reaction
when RequestBoundary.request (path: "/bfsthismess/joinLink", requestId, session, token)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.JoinLink:signed-in

Authored path: `BFSThisMess.JoinLink`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 107.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 123.

```reaction
when RequestBoundary.request (path: "/bfsthismess/joinLink", requestId, session, token)
where
  Authentication._authenticate (session) has (user)
then
  Share.join (token, user)
```

### BFSThisMess.JoinLink:signed-in#2

Authored path: `BFSThisMess.JoinLink`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 107.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 123.

```reaction
when Share.join (token, user, road), asked by BFSThisMess.JoinLink:signed-in
where
  earlier, RequestBoundary.request (path: "/bfsthismess/joinLink", requestId, session, token)
then
  RequestBoundary.respond (requestId, road)
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
  Requirements._activeBlocks (list: "girs", road) has (count, group, item, technical, title)
then
  Constrain.addListedBlock (count, early: true, group, origin: item, road, technical, title)
```

### BFSThisMess.ListMajorBlocks

Authored path: `BFSThisMess.ListMajorBlocks`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 83.

```reaction
when Constrain.removeListedBlocks (road)
where
  Constrain._road (road) has (major)
  Requirements._activeBlocks (list: major, road) has (count, group, item, technical, title)
then
  Constrain.addListedBlock (count, early: false, group, origin: item, road, technical, title)
```

### BFSThisMess.ListMajors

Authored path: `BFSThisMess.ListMajors`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 46.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 90.

```reaction
when RequestBoundary.request (path: "/bfsthismess/listMajors", requestId)
then
  RequestBoundary.respond (majors: former "the majors", requestId)
```

### BFSThisMess.LockSeason

Authored path: `BFSThisMess.LockSeason`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 132.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 149.

```reaction
when RequestBoundary.request (path: "/bfsthismess/lockSeason", requestId, session, term, year)
where
  Authentication._authenticate (session) has (user)
then
  History.lock (term, user, year)
```

### BFSThisMess.LockSeason#2

Authored path: `BFSThisMess.LockSeason`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 132.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 149.

```reaction
when History.lock (term, user, year), asked by BFSThisMess.LockSeason
at the flow's settlement frontier
where
  earlier, RequestBoundary.request (path: "/bfsthismess/lockSeason", requestId, session, term, year)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.LockSeasonRefused

Authored path: `BFSThisMess.LockSeasonRefused`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 132.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 150.

```reaction
when RequestBoundary.request (path: "/bfsthismess/lockSeason", requestId, session, term, year)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
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

### BFSThisMess.MakeRegularWeek

Authored path: `BFSThisMess.MakeRegularWeek`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 194.

```reaction
when Authentication.register (user)
then
  TimeBudget.ensureDefault (user)
```

### BFSThisMess.MakeRegularWeekForOwner

Authored path: `BFSThisMess.MakeRegularWeekForOwner`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 194.

```reaction
when Share.claim (road, user)
then
  TimeBudget.ensureDefault (user)
```

### BFSThisMess.MyRoads:no-session

Authored path: `BFSThisMess.MyRoads`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 209.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 220.

```reaction
when RequestBoundary.request (path: "/bfsthismess/myRoads", requestId, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.MyRoads:signed-in

Authored path: `BFSThisMess.MyRoads`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 209.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 220.

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

### BFSThisMess.OverrideWeek:no-session

Authored path: `BFSThisMess.OverrideWeek`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 170.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 177.

```reaction
when RequestBoundary.request (path: "/bfsthismess/overrideWeek", requestId, session, term, year)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.OverrideWeek:signed-in

Authored path: `BFSThisMess.OverrideWeek`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 170.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 177.

```reaction
when RequestBoundary.request (path: "/bfsthismess/overrideWeek", requestId, session, term, year)
where
  Authentication._authenticate (session) has (user)
then
  TimeBudget.ensureDefault (user)
```

### BFSThisMess.OverrideWeek:signed-in#2

Authored path: `BFSThisMess.OverrideWeek`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 170.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 177.

```reaction
when TimeBudget.ensureDefault (user), asked by BFSThisMess.OverrideWeek:signed-in
where
  earlier, RequestBoundary.request (path: "/bfsthismess/overrideWeek", requestId, session, term, year)
then
  TimeBudget.override (term, user, year)
```

### BFSThisMess.OverrideWeek:signed-in#3

Authored path: `BFSThisMess.OverrideWeek`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 170.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 177.

```reaction
when TimeBudget.override (term, user, year, template), asked by BFSThisMess.OverrideWeek:signed-in#2
where
  earlier, RequestBoundary.request (path: "/bfsthismess/overrideWeek", requestId, session, term, year)
then
  RequestBoundary.respond (requestId, template)
```

### BFSThisMess.Pin:editor

Authored path: `BFSThisMess.Pin`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 73.

```reaction
when RequestBoundary.request (path: "/bfsthismess/pin", requestId, road, session, subject, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canEdit (road, user) has (allowed: true)
then
  Constrain.pin (road, subject, term, year)
```

### BFSThisMess.Pin:editor#2

Authored path: `BFSThisMess.Pin`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 73.

```reaction
when Constrain.pin (road, subject, term, year), asked by BFSThisMess.Pin:editor
where
  earlier, RequestBoundary.request (path: "/bfsthismess/pin", requestId, road, session, subject, term, year)
then
  RequestBoundary.respond (requestId)
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

### BFSThisMess.Pin:view-only

Authored path: `BFSThisMess.Pin`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 73.

```reaction
when RequestBoundary.request (path: "/bfsthismess/pin", requestId, road, session, subject, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._canEdit (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NOT_AN_EDITOR", requestId)
```

### BFSThisMess.PlaceHistoryAfterAddPrior

Authored path: `BFSThisMess.PlaceHistoryAfterAddPrior`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 134.

```reaction
when History.addPrior (user)
where
  Share._roadsOwnedBy (user) has (road)
  History._encoded (user) has (history)
then
  Constrain.applyHistory (history, road)
```

### BFSThisMess.PlaceHistoryAfterAddTaken

Authored path: `BFSThisMess.PlaceHistoryAfterAddTaken`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 134.

```reaction
when History.addTaken (user)
where
  Share._roadsOwnedBy (user) has (road)
  History._encoded (user) has (history)
then
  Constrain.applyHistory (history, road)
```

### BFSThisMess.PlaceHistoryAfterLock

Authored path: `BFSThisMess.PlaceHistoryAfterLock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 134.

```reaction
when History.lock (user)
where
  Share._roadsOwnedBy (user) has (road)
  History._encoded (user) has (history)
then
  Constrain.applyHistory (history, road)
```

### BFSThisMess.PlaceHistoryAfterRemovePrior

Authored path: `BFSThisMess.PlaceHistoryAfterRemovePrior`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 134.

```reaction
when History.removePrior (user)
where
  Share._roadsOwnedBy (user) has (road)
  History._encoded (user) has (history)
then
  Constrain.applyHistory (history, road)
```

### BFSThisMess.PlaceHistoryAfterRemoveTaken

Authored path: `BFSThisMess.PlaceHistoryAfterRemoveTaken`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 134.

```reaction
when History.removeTaken (user)
where
  Share._roadsOwnedBy (user) has (road)
  History._encoded (user) has (history)
then
  Constrain.applyHistory (history, road)
```

### BFSThisMess.PlaceHistoryAfterSetStart

Authored path: `BFSThisMess.PlaceHistoryAfterSetStart`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 134.

```reaction
when History.setStart (user)
where
  Share._roadsOwnedBy (user) has (road)
  History._encoded (user) has (history)
then
  Constrain.applyHistory (history, road)
```

### BFSThisMess.PlaceHistoryAfterUnlock

Authored path: `BFSThisMess.PlaceHistoryAfterUnlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 134.

```reaction
when History.unlock (user)
where
  Share._roadsOwnedBy (user) has (road)
  History._encoded (user) has (history)
then
  Constrain.applyHistory (history, road)
```

### BFSThisMess.PlaceHistoryOnClaim

Authored path: `BFSThisMess.PlaceHistoryOnClaim`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 134.

```reaction
when Share.claim (road, user)
where
  History._encoded (user) has (history)
then
  Constrain.applyHistory (history, road)
```

### BFSThisMess.PreviewEndChange:hidden-road

Authored path: `BFSThisMess.PreviewEndChange`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 215.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 226.

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
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 215.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 226.

```reaction
when RequestBoundary.request (path: "/bfsthismess/previewEndChange", requestId, road, session, term, year)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.PreviewEndChange:viewer

Authored path: `BFSThisMess.PreviewEndChange`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 215.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 226.

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
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 215.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 225.

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
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 215.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 225.

```reaction
when RequestBoundary.request (path: "/bfsthismess/previewStartChange", requestId, road, session, term, year)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.PreviewStartChange:viewer

Authored path: `BFSThisMess.PreviewStartChange`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 215.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 225.

```reaction
when RequestBoundary.request (path: "/bfsthismess/previewStartChange", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
then
  RequestBoundary.respond (lost: former "the pins lost by moving the start" with (road, term, year), requestId)
```

### BFSThisMess.RecolorCategory:no-session

Authored path: `BFSThisMess.RecolorCategory`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 172.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 184.

```reaction
when RequestBoundary.request (category, color, path: "/bfsthismess/recolorCategory", requestId, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.RecolorCategory:signed-in

Authored path: `BFSThisMess.RecolorCategory`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 172.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 184.

```reaction
when RequestBoundary.request (category, color, path: "/bfsthismess/recolorCategory", requestId, session)
where
  Authentication._authenticate (session) has (user)
then
  TimeBudget.recolorCategory (category, color, user)
```

### BFSThisMess.RecolorCategory:signed-in#2

Authored path: `BFSThisMess.RecolorCategory`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 172.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 184.

```reaction
when TimeBudget.recolorCategory (category, color, user), asked by BFSThisMess.RecolorCategory:signed-in
where
  earlier, RequestBoundary.request (category, color, path: "/bfsthismess/recolorCategory", requestId, session)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.RefreshRequirements

Authored path: `BFSThisMess.RefreshRequirements`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 87.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 93.

```reaction
when RequestBoundary.request (path: "/bfsthismess/refreshRequirements", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canEdit (road, user) has (allowed: true)
then
  Constrain.removeListedBlocks (road)
```

### BFSThisMess.RefreshRequirements#2

Authored path: `BFSThisMess.RefreshRequirements`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 87.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 93.

```reaction
when Constrain.removeListedBlocks (road), asked by BFSThisMess.RefreshRequirements
at the flow's settlement frontier
where
  earlier, RequestBoundary.request (path: "/bfsthismess/refreshRequirements", requestId, road, session)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.RefreshRequirementsRefused:hidden-road

Authored path: `BFSThisMess.RefreshRequirementsRefused`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 87.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 94.

```reaction
when RequestBoundary.request (path: "/bfsthismess/refreshRequirements", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.RefreshRequirementsRefused:no-session

Authored path: `BFSThisMess.RefreshRequirementsRefused`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 87.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 94.

```reaction
when RequestBoundary.request (path: "/bfsthismess/refreshRequirements", requestId, road, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.RefreshRequirementsRefused:view-only

Authored path: `BFSThisMess.RefreshRequirementsRefused`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 87.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 94.

```reaction
when RequestBoundary.request (path: "/bfsthismess/refreshRequirements", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._canEdit (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NOT_AN_EDITOR", requestId)
```

### BFSThisMess.RegenerateLink:hidden-road

Authored path: `BFSThisMess.RegenerateLink`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 107.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 122.

```reaction
when RequestBoundary.request (path: "/bfsthismess/regenerateLink", requestId, road, role, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.RegenerateLink:no-session

Authored path: `BFSThisMess.RegenerateLink`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 107.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 122.

```reaction
when RequestBoundary.request (path: "/bfsthismess/regenerateLink", requestId, road, role, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.RegenerateLink:not-owner

Authored path: `BFSThisMess.RegenerateLink`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 107.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 122.

```reaction
when RequestBoundary.request (path: "/bfsthismess/regenerateLink", requestId, road, role, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._isOwner (road, user) has (owner: false)
then
  RequestBoundary.respond (error: "NOT_AN_OWNER", requestId)
```

### BFSThisMess.RegenerateLink:owner

Authored path: `BFSThisMess.RegenerateLink`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 107.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 122.

```reaction
when RequestBoundary.request (path: "/bfsthismess/regenerateLink", requestId, road, role, session)
where
  Authentication._authenticate (session) has (user)
  Share._isOwner (road, user) has (owner: true)
then
  Share.regenerateLink (requester: user, road, role)
```

### BFSThisMess.RegenerateLink:owner#2

Authored path: `BFSThisMess.RegenerateLink`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 107.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 122.

```reaction
when Share.regenerateLink (requester: user, road, role), asked by BFSThisMess.RegenerateLink:owner
where
  earlier, RequestBoundary.request (path: "/bfsthismess/regenerateLink", requestId, road, role, session)
then
  RequestBoundary.respond (requestId)
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

### BFSThisMess.RemoveBlock:owner

Authored path: `BFSThisMess.RemoveBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 72.

```reaction
when RequestBoundary.request (block, path: "/bfsthismess/removeBlock", requestId, session)
where
  Authentication._authenticate (session) has (user)
  Constrain._roadOfBlock (block) has (road)
  Share._canEdit (road, user) has (allowed: true)
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

### BFSThisMess.RemoveBlock:view-only

Authored path: `BFSThisMess.RemoveBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 72.

```reaction
when RequestBoundary.request (block, path: "/bfsthismess/removeBlock", requestId, session)
where
  Authentication._authenticate (session) has (user)
  Constrain._roadOfBlock (block) has (road)
  Share._canView (road, user) has (allowed: true)
  Share._canEdit (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NOT_AN_EDITOR", requestId)
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

### BFSThisMess.RemoveOption:owner

Authored path: `BFSThisMess.RemoveOption`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 71.

```reaction
when RequestBoundary.request (block, path: "/bfsthismess/removeOption", requestId, session, subject)
where
  Authentication._authenticate (session) has (user)
  Constrain._roadOfBlock (block) has (road)
  Share._canEdit (road, user) has (allowed: true)
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

### BFSThisMess.RemoveOption:view-only

Authored path: `BFSThisMess.RemoveOption`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 71.

```reaction
when RequestBoundary.request (block, path: "/bfsthismess/removeOption", requestId, session, subject)
where
  Authentication._authenticate (session) has (user)
  Constrain._roadOfBlock (block) has (road)
  Share._canView (road, user) has (allowed: true)
  Share._canEdit (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NOT_AN_EDITOR", requestId)
```

### BFSThisMess.RemovePrior:editor

Authored path: `BFSThisMess.RemovePrior`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 67.

```reaction
when RequestBoundary.request (path: "/bfsthismess/removePrior", requestId, road, session, subject)
where
  Authentication._authenticate (session) has (user)
  Share._canEdit (road, user) has (allowed: true)
then
  Constrain.removePrior (road, subject)
```

### BFSThisMess.RemovePrior:editor#2

Authored path: `BFSThisMess.RemovePrior`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 67.

```reaction
when Constrain.removePrior (road, subject), asked by BFSThisMess.RemovePrior:editor
where
  earlier, RequestBoundary.request (path: "/bfsthismess/removePrior", requestId, road, session, subject)
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

### BFSThisMess.RemovePrior:view-only

Authored path: `BFSThisMess.RemovePrior`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 67.

```reaction
when RequestBoundary.request (path: "/bfsthismess/removePrior", requestId, road, session, subject)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._canEdit (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NOT_AN_EDITOR", requestId)
```

### BFSThisMess.RemovePriorCredit

Authored path: `BFSThisMess.RemovePriorCredit`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 132.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 140.

```reaction
when RequestBoundary.request (path: "/bfsthismess/removePriorCredit", requestId, session, subject)
where
  Authentication._authenticate (session) has (user)
then
  History.removePrior (subject, user)
```

### BFSThisMess.RemovePriorCredit#2

Authored path: `BFSThisMess.RemovePriorCredit`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 132.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 140.

```reaction
when History.removePrior (subject, user), asked by BFSThisMess.RemovePriorCredit
at the flow's settlement frontier
where
  earlier, RequestBoundary.request (path: "/bfsthismess/removePriorCredit", requestId, session, subject)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.RemovePriorCreditRefused

Authored path: `BFSThisMess.RemovePriorCreditRefused`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 132.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 141.

```reaction
when RequestBoundary.request (path: "/bfsthismess/removePriorCredit", requestId, session, subject)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.RemoveTaken

Authored path: `BFSThisMess.RemoveTaken`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 132.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 147.

```reaction
when RequestBoundary.request (path: "/bfsthismess/removeTaken", requestId, session, subject, term, year)
where
  Authentication._authenticate (session) has (user)
then
  History.removeTaken (subject, term, user, year)
```

### BFSThisMess.RemoveTaken#2

Authored path: `BFSThisMess.RemoveTaken`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 132.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 147.

```reaction
when History.removeTaken (subject, term, user, year), asked by BFSThisMess.RemoveTaken
at the flow's settlement frontier
where
  earlier, RequestBoundary.request (path: "/bfsthismess/removeTaken", requestId, session, subject, term, year)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.RemoveTakenRefused

Authored path: `BFSThisMess.RemoveTakenRefused`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 132.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 148.

```reaction
when RequestBoundary.request (path: "/bfsthismess/removeTaken", requestId, session, subject, term, year)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.RemoveTimeBlock:no-session

Authored path: `BFSThisMess.RemoveTimeBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 172.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 181.

```reaction
when RequestBoundary.request (block, path: "/bfsthismess/removeTimeBlock", requestId, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.RemoveTimeBlock:signed-in

Authored path: `BFSThisMess.RemoveTimeBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 172.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 181.

```reaction
when RequestBoundary.request (block, path: "/bfsthismess/removeTimeBlock", requestId, session)
where
  Authentication._authenticate (session) has (user)
then
  TimeBudget.removeBlock (block, user)
```

### BFSThisMess.RemoveTimeBlock:signed-in#2

Authored path: `BFSThisMess.RemoveTimeBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 172.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 181.

```reaction
when TimeBudget.removeBlock (block, user), asked by BFSThisMess.RemoveTimeBlock:signed-in
where
  earlier, RequestBoundary.request (block, path: "/bfsthismess/removeTimeBlock", requestId, session)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.RenameCategory:no-session

Authored path: `BFSThisMess.RenameCategory`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 172.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 183.

```reaction
when RequestBoundary.request (category, name, path: "/bfsthismess/renameCategory", requestId, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.RenameCategory:signed-in

Authored path: `BFSThisMess.RenameCategory`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 172.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 183.

```reaction
when RequestBoundary.request (category, name, path: "/bfsthismess/renameCategory", requestId, session)
where
  Authentication._authenticate (session) has (user)
then
  TimeBudget.renameCategory (category, name, user)
```

### BFSThisMess.RenameCategory:signed-in#2

Authored path: `BFSThisMess.RenameCategory`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 172.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 183.

```reaction
when TimeBudget.renameCategory (category, name, user), asked by BFSThisMess.RenameCategory:signed-in
where
  earlier, RequestBoundary.request (category, name, path: "/bfsthismess/renameCategory", requestId, session)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.RenameRoad:editor

Authored path: `BFSThisMess.RenameRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 60.

```reaction
when RequestBoundary.request (name, path: "/bfsthismess/renameRoad", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canEdit (road, user) has (allowed: true)
then
  Constrain.renameRoad (name, road)
```

### BFSThisMess.RenameRoad:editor#2

Authored path: `BFSThisMess.RenameRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 60.

```reaction
when Constrain.renameRoad (name, road), asked by BFSThisMess.RenameRoad:editor
where
  earlier, RequestBoundary.request (name, path: "/bfsthismess/renameRoad", requestId, road, session)
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

### BFSThisMess.RenameRoad:view-only

Authored path: `BFSThisMess.RenameRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 60.

```reaction
when RequestBoundary.request (name, path: "/bfsthismess/renameRoad", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._canEdit (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NOT_AN_EDITOR", requestId)
```

### BFSThisMess.ResetSemester:editor

Authored path: `BFSThisMess.ResetSemester`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 78.

```reaction
when RequestBoundary.request (path: "/bfsthismess/resetSemester", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canEdit (road, user) has (allowed: true)
then
  Constrain.resetSemester (road, term, year)
```

### BFSThisMess.ResetSemester:editor#2

Authored path: `BFSThisMess.ResetSemester`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 78.

```reaction
when Constrain.resetSemester (road, term, year), asked by BFSThisMess.ResetSemester:editor
where
  earlier, RequestBoundary.request (path: "/bfsthismess/resetSemester", requestId, road, session, term, year)
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

### BFSThisMess.ResetSemester:view-only

Authored path: `BFSThisMess.ResetSemester`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 78.

```reaction
when RequestBoundary.request (path: "/bfsthismess/resetSemester", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._canEdit (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NOT_AN_EDITOR", requestId)
```

### BFSThisMess.ResetWeek:no-session

Authored path: `BFSThisMess.ResetWeek`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 170.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 178.

```reaction
when RequestBoundary.request (path: "/bfsthismess/resetWeek", requestId, session, term, year)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.ResetWeek:signed-in

Authored path: `BFSThisMess.ResetWeek`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 170.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 178.

```reaction
when RequestBoundary.request (path: "/bfsthismess/resetWeek", requestId, session, term, year)
where
  Authentication._authenticate (session) has (user)
then
  TimeBudget.resetToDefault (term, user, year)
```

### BFSThisMess.ResetWeek:signed-in#2

Authored path: `BFSThisMess.ResetWeek`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 170.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 178.

```reaction
when TimeBudget.resetToDefault (term, user, year), asked by BFSThisMess.ResetWeek:signed-in
where
  earlier, RequestBoundary.request (path: "/bfsthismess/resetWeek", requestId, session, term, year)
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

### BFSThisMess.SetCap:editor

Authored path: `BFSThisMess.SetCap`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 76.

```reaction
when RequestBoundary.request (capType, limit, path: "/bfsthismess/setCap", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canEdit (road, user) has (allowed: true)
then
  Constrain.setCap (capType, limit, road, term, year)
```

### BFSThisMess.SetCap:editor#2

Authored path: `BFSThisMess.SetCap`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 76.

```reaction
when Constrain.setCap (capType, limit, road, term, year), asked by BFSThisMess.SetCap:editor
where
  earlier, RequestBoundary.request (capType, limit, path: "/bfsthismess/setCap", requestId, road, session, term, year)
then
  RequestBoundary.respond (requestId)
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

### BFSThisMess.SetCap:view-only

Authored path: `BFSThisMess.SetCap`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 76.

```reaction
when RequestBoundary.request (capType, limit, path: "/bfsthismess/setCap", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._canEdit (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NOT_AN_EDITOR", requestId)
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

### BFSThisMess.SetCount:owner

Authored path: `BFSThisMess.SetCount`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 69.

```reaction
when RequestBoundary.request (block, count, path: "/bfsthismess/setCount", requestId, session)
where
  Authentication._authenticate (session) has (user)
  Constrain._roadOfBlock (block) has (road)
  Share._canEdit (road, user) has (allowed: true)
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

### BFSThisMess.SetCount:view-only

Authored path: `BFSThisMess.SetCount`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 50.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 69.

```reaction
when RequestBoundary.request (block, count, path: "/bfsthismess/setCount", requestId, session)
where
  Authentication._authenticate (session) has (user)
  Constrain._roadOfBlock (block) has (road)
  Share._canView (road, user) has (allowed: true)
  Share._canEdit (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NOT_AN_EDITOR", requestId)
```

### BFSThisMess.SetEnd:editor

Authored path: `BFSThisMess.SetEnd`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 63.

```reaction
when RequestBoundary.request (path: "/bfsthismess/setEnd", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canEdit (road, user) has (allowed: true)
then
  Constrain.setEnd (road, term, year)
```

### BFSThisMess.SetEnd:editor#2

Authored path: `BFSThisMess.SetEnd`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 63.

```reaction
when Constrain.setEnd (road, term, year), asked by BFSThisMess.SetEnd:editor
where
  earlier, RequestBoundary.request (path: "/bfsthismess/setEnd", requestId, road, session, term, year)
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

### BFSThisMess.SetEnd:view-only

Authored path: `BFSThisMess.SetEnd`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 63.

```reaction
when RequestBoundary.request (path: "/bfsthismess/setEnd", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._canEdit (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NOT_AN_EDITOR", requestId)
```

### BFSThisMess.SetHistoryStart

Authored path: `BFSThisMess.SetHistoryStart`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 132.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 143.

```reaction
when RequestBoundary.request (path: "/bfsthismess/setHistoryStart", requestId, session, term, year)
where
  Authentication._authenticate (session) has (user)
then
  History.setStart (term, user, year)
```

### BFSThisMess.SetHistoryStart#2

Authored path: `BFSThisMess.SetHistoryStart`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 132.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 143.

```reaction
when History.setStart (term, user, year), asked by BFSThisMess.SetHistoryStart
at the flow's settlement frontier
where
  earlier, RequestBoundary.request (path: "/bfsthismess/setHistoryStart", requestId, session, term, year)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.SetHistoryStartRefused

Authored path: `BFSThisMess.SetHistoryStartRefused`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 132.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 144.

```reaction
when RequestBoundary.request (path: "/bfsthismess/setHistoryStart", requestId, session, term, year)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.SetLocked:editor

Authored path: `BFSThisMess.SetLocked`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 75.

```reaction
when RequestBoundary.request (locked, path: "/bfsthismess/setLocked", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canEdit (road, user) has (allowed: true)
then
  Constrain.setLocked (locked, road, term, year)
```

### BFSThisMess.SetLocked:editor#2

Authored path: `BFSThisMess.SetLocked`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 75.

```reaction
when Constrain.setLocked (locked, road, term, year), asked by BFSThisMess.SetLocked:editor
where
  earlier, RequestBoundary.request (locked, path: "/bfsthismess/setLocked", requestId, road, session, term, year)
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

### BFSThisMess.SetLocked:view-only

Authored path: `BFSThisMess.SetLocked`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 75.

```reaction
when RequestBoundary.request (locked, path: "/bfsthismess/setLocked", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._canEdit (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NOT_AN_EDITOR", requestId)
```

### BFSThisMess.SetMajor

Authored path: `BFSThisMess.SetMajor`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 64.

```reaction
when RequestBoundary.request (major, path: "/bfsthismess/setMajor", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canEdit (road, user) has (allowed: true)
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
  Share._canEdit (road, user) has (allowed: true)
  no Requirements._list (list: major) has (found: true, kind: "MAJOR")
then
  RequestBoundary.respond (error: "NO_SUCH_MAJOR", requestId)
```

### BFSThisMess.SetMajorRefused:view-only

Authored path: `BFSThisMess.SetMajorRefused`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 65.

```reaction
when RequestBoundary.request (major, path: "/bfsthismess/setMajor", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._canEdit (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NOT_AN_EDITOR", requestId)
```

### BFSThisMess.SetReserve:no-session

Authored path: `BFSThisMess.SetReserve`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 157.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 163.

```reaction
when RequestBoundary.request (buffer, path: "/bfsthismess/setReserve", requestId, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.SetReserve:signed-in

Authored path: `BFSThisMess.SetReserve`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 157.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 163.

```reaction
when RequestBoundary.request (buffer, path: "/bfsthismess/setReserve", requestId, session)
where
  Authentication._authenticate (session) has (user)
then
  TimeBudget.setBuffer (buffer, user)
```

### BFSThisMess.SetReserve:signed-in#2

Authored path: `BFSThisMess.SetReserve`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 157.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 163.

```reaction
when TimeBudget.setBuffer (buffer, user), asked by BFSThisMess.SetReserve:signed-in
where
  earlier, RequestBoundary.request (buffer, path: "/bfsthismess/setReserve", requestId, session)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.SetRoadReserve:editor

Authored path: `BFSThisMess.SetRoadReserve`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 201.

```reaction
when RequestBoundary.request (buffer, path: "/bfsthismess/setRoadReserve", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canEdit (road, user) has (allowed: true)
then
  TimeBudget.setRoadBuffer (buffer, road)
```

### BFSThisMess.SetRoadReserve:editor#2

Authored path: `BFSThisMess.SetRoadReserve`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 201.

```reaction
when TimeBudget.setRoadBuffer (buffer, road), asked by BFSThisMess.SetRoadReserve:editor
where
  earlier, RequestBoundary.request (buffer, path: "/bfsthismess/setRoadReserve", requestId, road, session)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.SetRoadReserve:hidden-road

Authored path: `BFSThisMess.SetRoadReserve`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 201.

```reaction
when RequestBoundary.request (buffer, path: "/bfsthismess/setRoadReserve", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.SetRoadReserve:no-session

Authored path: `BFSThisMess.SetRoadReserve`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 201.

```reaction
when RequestBoundary.request (buffer, path: "/bfsthismess/setRoadReserve", requestId, road, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.SetRoadReserve:view-only

Authored path: `BFSThisMess.SetRoadReserve`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 201.

```reaction
when RequestBoundary.request (buffer, path: "/bfsthismess/setRoadReserve", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._canEdit (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NOT_AN_EDITOR", requestId)
```

### BFSThisMess.SetRole:hidden-road

Authored path: `BFSThisMess.SetRole`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 103.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 116.

```reaction
when RequestBoundary.request (path: "/bfsthismess/setRole", requestId, road, role, session, username)
where
  Authentication._authenticate (session) has (user: requester)
  Share._canView (road, user: requester) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.SetRole:no-session

Authored path: `BFSThisMess.SetRole`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 103.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 116.

```reaction
when RequestBoundary.request (path: "/bfsthismess/setRole", requestId, road, role, session, username)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.SetRole:no-such-user

Authored path: `BFSThisMess.SetRole`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 103.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 116.

```reaction
when RequestBoundary.request (path: "/bfsthismess/setRole", requestId, road, role, session, username)
where
  Authentication._authenticate (session) has (user: requester)
  Share._isOwner (road, user: requester) has (owner: true)
  no Authentication._lookup (username)
then
  RequestBoundary.respond (error: "NO_SUCH_USER", requestId)
```

### BFSThisMess.SetRole:not-owner

Authored path: `BFSThisMess.SetRole`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 103.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 116.

```reaction
when RequestBoundary.request (path: "/bfsthismess/setRole", requestId, road, role, session, username)
where
  Authentication._authenticate (session) has (user: requester)
  Share._canView (road, user: requester) has (allowed: true)
  Share._isOwner (road, user: requester) has (owner: false)
then
  RequestBoundary.respond (error: "NOT_AN_OWNER", requestId)
```

### BFSThisMess.SetRole:owner

Authored path: `BFSThisMess.SetRole`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 103.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 116.

```reaction
when RequestBoundary.request (path: "/bfsthismess/setRole", requestId, road, role, session, username)
where
  Authentication._authenticate (session) has (user: requester)
  Share._isOwner (road, user: requester) has (owner: true)
  Authentication._lookup (username) has (user)
then
  Share.setRole (requester, road, role, user)
```

### BFSThisMess.SetRole:owner#2

Authored path: `BFSThisMess.SetRole`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 103.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 116.

```reaction
when Share.setRole (requester, road, role, user), asked by BFSThisMess.SetRole:owner
where
  earlier, RequestBoundary.request (path: "/bfsthismess/setRole", requestId, road, role, session, username)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.SetScheduleMode:editor

Authored path: `BFSThisMess.SetScheduleMode`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 200.

```reaction
when RequestBoundary.request (mode, path: "/bfsthismess/setScheduleMode", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canEdit (road, user) has (allowed: true)
then
  TimeBudget.setMode (mode, road)
```

### BFSThisMess.SetScheduleMode:editor#2

Authored path: `BFSThisMess.SetScheduleMode`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 200.

```reaction
when TimeBudget.setMode (mode, road), asked by BFSThisMess.SetScheduleMode:editor
where
  earlier, RequestBoundary.request (mode, path: "/bfsthismess/setScheduleMode", requestId, road, session)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.SetScheduleMode:hidden-road

Authored path: `BFSThisMess.SetScheduleMode`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 200.

```reaction
when RequestBoundary.request (mode, path: "/bfsthismess/setScheduleMode", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.SetScheduleMode:no-session

Authored path: `BFSThisMess.SetScheduleMode`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 200.

```reaction
when RequestBoundary.request (mode, path: "/bfsthismess/setScheduleMode", requestId, road, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.SetScheduleMode:view-only

Authored path: `BFSThisMess.SetScheduleMode`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 200.

```reaction
when RequestBoundary.request (mode, path: "/bfsthismess/setScheduleMode", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._canEdit (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NOT_AN_EDITOR", requestId)
```

### BFSThisMess.SetStart:editor

Authored path: `BFSThisMess.SetStart`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 62.

```reaction
when RequestBoundary.request (path: "/bfsthismess/setStart", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canEdit (road, user) has (allowed: true)
then
  Constrain.setStart (road, term, year)
```

### BFSThisMess.SetStart:editor#2

Authored path: `BFSThisMess.SetStart`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 62.

```reaction
when Constrain.setStart (road, term, year), asked by BFSThisMess.SetStart:editor
where
  earlier, RequestBoundary.request (path: "/bfsthismess/setStart", requestId, road, session, term, year)
then
  RequestBoundary.respond (requestId)
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

### BFSThisMess.SetStart:view-only

Authored path: `BFSThisMess.SetStart`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 62.

```reaction
when RequestBoundary.request (path: "/bfsthismess/setStart", requestId, road, session, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._canEdit (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NOT_AN_EDITOR", requestId)
```

### BFSThisMess.SetStudyFactor:no-session

Authored path: `BFSThisMess.SetStudyFactor`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 157.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 162.

```reaction
when RequestBoundary.request (factor, path: "/bfsthismess/setStudyFactor", requestId, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.SetStudyFactor:signed-in

Authored path: `BFSThisMess.SetStudyFactor`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 157.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 162.

```reaction
when RequestBoundary.request (factor, path: "/bfsthismess/setStudyFactor", requestId, session)
where
  Authentication._authenticate (session) has (user)
then
  TimeBudget.setFactor (factor, user)
```

### BFSThisMess.SetStudyFactor:signed-in#2

Authored path: `BFSThisMess.SetStudyFactor`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 157.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 162.

```reaction
when TimeBudget.setFactor (factor, user), asked by BFSThisMess.SetStudyFactor:signed-in
where
  earlier, RequestBoundary.request (factor, path: "/bfsthismess/setStudyFactor", requestId, session)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.SetSubjectFactor:no-session

Authored path: `BFSThisMess.SetSubjectFactor`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 157.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 164.

```reaction
when RequestBoundary.request (factor, path: "/bfsthismess/setSubjectFactor", requestId, session, subject)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.SetSubjectFactor:signed-in

Authored path: `BFSThisMess.SetSubjectFactor`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 157.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 164.

```reaction
when RequestBoundary.request (factor, path: "/bfsthismess/setSubjectFactor", requestId, session, subject)
where
  Authentication._authenticate (session) has (user)
then
  TimeBudget.setSubjectFactor (factor, subject, user)
```

### BFSThisMess.SetSubjectFactor:signed-in#2

Authored path: `BFSThisMess.SetSubjectFactor`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 157.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 164.

```reaction
when TimeBudget.setSubjectFactor (factor, subject, user), asked by BFSThisMess.SetSubjectFactor:signed-in
where
  earlier, RequestBoundary.request (factor, path: "/bfsthismess/setSubjectFactor", requestId, session, subject)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.SetTimeBlock:no-session

Authored path: `BFSThisMess.SetTimeBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 172.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 180.

```reaction
when RequestBoundary.request (block, category, day, path: "/bfsthismess/setTimeBlock", requestId, session, slots, start)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.SetTimeBlock:signed-in

Authored path: `BFSThisMess.SetTimeBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 172.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 180.

```reaction
when RequestBoundary.request (block, category, day, path: "/bfsthismess/setTimeBlock", requestId, session, slots, start)
where
  Authentication._authenticate (session) has (user)
then
  TimeBudget.setBlock (block, category, day, slots, start, user)
```

### BFSThisMess.SetTimeBlock:signed-in#2

Authored path: `BFSThisMess.SetTimeBlock`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 172.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 180.

```reaction
when TimeBudget.setBlock (block, category, day, slots, start, user), asked by BFSThisMess.SetTimeBlock:signed-in
where
  earlier, RequestBoundary.request (block, category, day, path: "/bfsthismess/setTimeBlock", requestId, session, slots, start)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.ShareRoad:editor

Authored path: `BFSThisMess.ShareRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 99.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 114.

```reaction
when RequestBoundary.request (path: "/bfsthismess/shareRoad", requestId, road, role, session, username)
where
  Authentication._authenticate (session) has (user: requester)
  Share._canEdit (road, user: requester) has (allowed: true)
  Authentication._lookup (username) has (user)
then
  Share.share (requester, road, role, user)
```

### BFSThisMess.ShareRoad:editor#2

Authored path: `BFSThisMess.ShareRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 99.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 114.

```reaction
when Share.share (requester, road, role, user), asked by BFSThisMess.ShareRoad:editor
where
  earlier, RequestBoundary.request (path: "/bfsthismess/shareRoad", requestId, road, role, session, username)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.ShareRoad:hidden-road

Authored path: `BFSThisMess.ShareRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 99.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 114.

```reaction
when RequestBoundary.request (path: "/bfsthismess/shareRoad", requestId, road, role, session, username)
where
  Authentication._authenticate (session) has (user: requester)
  Share._canView (road, user: requester) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.ShareRoad:no-session

Authored path: `BFSThisMess.ShareRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 99.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 114.

```reaction
when RequestBoundary.request (path: "/bfsthismess/shareRoad", requestId, road, role, session, username)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.ShareRoad:no-such-user

Authored path: `BFSThisMess.ShareRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 99.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 114.

```reaction
when RequestBoundary.request (path: "/bfsthismess/shareRoad", requestId, road, role, session, username)
where
  Authentication._authenticate (session) has (user: requester)
  Share._canEdit (road, user: requester) has (allowed: true)
  no Authentication._lookup (username)
then
  RequestBoundary.respond (error: "NO_SUCH_USER", requestId)
```

### BFSThisMess.ShareRoad:view-only

Authored path: `BFSThisMess.ShareRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 99.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 114.

```reaction
when RequestBoundary.request (path: "/bfsthismess/shareRoad", requestId, road, role, session, username)
where
  Authentication._authenticate (session) has (user: requester)
  Share._canView (road, user: requester) has (allowed: true)
  Share._canEdit (road, user: requester) has (allowed: false)
then
  RequestBoundary.respond (error: "NOT_AN_EDITOR", requestId)
```

### BFSThisMess.UnPin:editor

Authored path: `BFSThisMess.UnPin`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 74.

```reaction
when RequestBoundary.request (path: "/bfsthismess/unPin", requestId, road, session, subject)
where
  Authentication._authenticate (session) has (user)
  Share._canEdit (road, user) has (allowed: true)
then
  Constrain.unPin (road, subject)
```

### BFSThisMess.UnPin:editor#2

Authored path: `BFSThisMess.UnPin`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 74.

```reaction
when Constrain.unPin (road, subject), asked by BFSThisMess.UnPin:editor
where
  earlier, RequestBoundary.request (path: "/bfsthismess/unPin", requestId, road, session, subject)
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

### BFSThisMess.UnPin:view-only

Authored path: `BFSThisMess.UnPin`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 48.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 74.

```reaction
when RequestBoundary.request (path: "/bfsthismess/unPin", requestId, road, session, subject)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._canEdit (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NOT_AN_EDITOR", requestId)
```

### BFSThisMess.UnlockSeason

Authored path: `BFSThisMess.UnlockSeason`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 132.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 151.

```reaction
when RequestBoundary.request (path: "/bfsthismess/unlockSeason", requestId, session, term, year)
where
  Authentication._authenticate (session) has (user)
then
  History.unlock (term, user, year)
```

### BFSThisMess.UnlockSeason#2

Authored path: `BFSThisMess.UnlockSeason`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 132.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 151.

```reaction
when History.unlock (term, user, year), asked by BFSThisMess.UnlockSeason
at the flow's settlement frontier
where
  earlier, RequestBoundary.request (path: "/bfsthismess/unlockSeason", requestId, session, term, year)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.UnlockSeasonRefused

Authored path: `BFSThisMess.UnlockSeasonRefused`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 132.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 152.

```reaction
when RequestBoundary.request (path: "/bfsthismess/unlockSeason", requestId, session, term, year)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.UnshareRoad:hidden-road

Authored path: `BFSThisMess.UnshareRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 103.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 117.

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
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 103.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 117.

```reaction
when RequestBoundary.request (path: "/bfsthismess/unshareRoad", requestId, road, session, username)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.UnshareRoad:no-such-user

Authored path: `BFSThisMess.UnshareRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 103.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 117.

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
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 103.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 117.

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
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 103.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 117.

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
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 103.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 117.

```reaction
when Share.unshare (requester, road, user), asked by BFSThisMess.UnshareRoad:owner
where
  earlier, RequestBoundary.request (path: "/bfsthismess/unshareRoad", requestId, road, session, username)
then
  RequestBoundary.respond (requestId)
```

### BFSThisMess.ViewClassHours:no-session

Authored path: `BFSThisMess.ViewClassHours`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 157.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 160.

```reaction
when RequestBoundary.request (path: "/bfsthismess/viewClassHours", requestId, session, subject, term, year)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.ViewClassHours:signed-in

Authored path: `BFSThisMess.ViewClassHours`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 157.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 160.

```reaction
when RequestBoundary.request (path: "/bfsthismess/viewClassHours", requestId, session, subject, term, year)
where
  Authentication._authenticate (session) has (user)
then
  RequestBoundary.respond (hours: former "the hours of a class" with (subject, term, user, year), requestId)
```

### BFSThisMess.ViewHistory:no-session

Authored path: `BFSThisMess.ViewHistory`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 130.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 137.

```reaction
when RequestBoundary.request (path: "/bfsthismess/viewHistory", requestId, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.ViewHistory:signed-in

Authored path: `BFSThisMess.ViewHistory`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 130.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 137.

```reaction
when RequestBoundary.request (path: "/bfsthismess/viewHistory", requestId, session)
where
  Authentication._authenticate (session) has (user)
then
  RequestBoundary.respond (history: former "the history of a user" with (user), requestId)
```

### BFSThisMess.ViewLinks:hidden-road

Authored path: `BFSThisMess.ViewLinks`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 107.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 119.

```reaction
when RequestBoundary.request (path: "/bfsthismess/viewLinks", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.ViewLinks:no-session

Authored path: `BFSThisMess.ViewLinks`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 107.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 119.

```reaction
when RequestBoundary.request (path: "/bfsthismess/viewLinks", requestId, road, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.ViewLinks:not-owner

Authored path: `BFSThisMess.ViewLinks`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 107.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 119.

```reaction
when RequestBoundary.request (path: "/bfsthismess/viewLinks", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._isOwner (road, user) has (owner: false)
then
  RequestBoundary.respond (error: "NOT_AN_OWNER", requestId)
```

### BFSThisMess.ViewLinks:owner

Authored path: `BFSThisMess.ViewLinks`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 107.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 119.

```reaction
when RequestBoundary.request (path: "/bfsthismess/viewLinks", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._isOwner (road, user) has (owner: true)
then
  RequestBoundary.respond (links: former "the links of a road" with (requester: user, road), requestId)
```

### BFSThisMess.ViewOptions:hidden-road

Authored path: `BFSThisMess.ViewOptions`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 215.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 223.

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
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 215.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 223.

```reaction
when RequestBoundary.request (includeIAPAndSummer, path: "/bfsthismess/viewOptions", requestId, road, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.ViewOptions:viewer

Authored path: `BFSThisMess.ViewOptions`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 215.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 223.

```reaction
when RequestBoundary.request (includeIAPAndSummer, path: "/bfsthismess/viewOptions", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
then
  RequestBoundary.respond (options: former "the options of a road" with (includeIAPAndSummer, road), requestId)
```

### BFSThisMess.ViewPlanMetrics:hidden-road

Authored path: `BFSThisMess.ViewPlanMetrics`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 190.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 197.

```reaction
when RequestBoundary.request (includeIAPAndSummer, limit, path: "/bfsthismess/viewPlanMetrics", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.ViewPlanMetrics:no-session

Authored path: `BFSThisMess.ViewPlanMetrics`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 190.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 197.

```reaction
when RequestBoundary.request (includeIAPAndSummer, limit, path: "/bfsthismess/viewPlanMetrics", requestId, road, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.ViewPlanMetrics:viewer

Authored path: `BFSThisMess.ViewPlanMetrics`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 190.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 197.

```reaction
when RequestBoundary.request (includeIAPAndSummer, limit, path: "/bfsthismess/viewPlanMetrics", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
then
  RequestBoundary.respond (metrics: former "the hours of the semesters of the paths of a road" with (includeIAPAndSummer, limit, road), requestId)
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
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 213.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 222.

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
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 213.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 222.

```reaction
when RequestBoundary.request (includeIAPAndSummer, limit, path: "/bfsthismess/viewRoad", requestId, road, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.ViewRoad:viewer

Authored path: `BFSThisMess.ViewRoad`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 213.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 222.

```reaction
when RequestBoundary.request (includeIAPAndSummer, limit, path: "/bfsthismess/viewRoad", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
then
  RequestBoundary.respond (access: former "their access to a road" with (road, user), constraints: former "the constraints of a road" with (road), paths: former "the paths of a road" with (includeIAPAndSummer, limit, road), requestId, requirements: former "the requirements of a road" with (road))
```

### BFSThisMess.ViewRoadTime:hidden-road

Authored path: `BFSThisMess.ViewRoadTime`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 199.

```reaction
when RequestBoundary.request (path: "/bfsthismess/viewRoadTime", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.ViewRoadTime:no-session

Authored path: `BFSThisMess.ViewRoadTime`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 199.

```reaction
when RequestBoundary.request (path: "/bfsthismess/viewRoadTime", requestId, road, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.ViewRoadTime:viewer

Authored path: `BFSThisMess.ViewRoadTime`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 192.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 199.

```reaction
when RequestBoundary.request (path: "/bfsthismess/viewRoadTime", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
then
  RequestBoundary.respond (requestId, time: former "the time settings of a road" with (road))
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

### BFSThisMess.ViewSemesterSchedule:hidden-road

Authored path: `BFSThisMess.ViewSemesterSchedule`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 190.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 198.

```reaction
when RequestBoundary.request (path: "/bfsthismess/viewSemesterSchedule", requestId, road, session, subjects, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.ViewSemesterSchedule:no-session

Authored path: `BFSThisMess.ViewSemesterSchedule`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 190.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 198.

```reaction
when RequestBoundary.request (path: "/bfsthismess/viewSemesterSchedule", requestId, road, session, subjects, term, year)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.ViewSemesterSchedule:viewer

Authored path: `BFSThisMess.ViewSemesterSchedule`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 190.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 198.

```reaction
when RequestBoundary.request (path: "/bfsthismess/viewSemesterSchedule", requestId, road, session, subjects, term, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
then
  RequestBoundary.respond (requestId, schedule: former "the schedule of a semester of a plan" with (road, subjects, term, year))
```

### BFSThisMess.ViewSemesterWeek:no-session

Authored path: `BFSThisMess.ViewSemesterWeek`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 170.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 176.

```reaction
when RequestBoundary.request (path: "/bfsthismess/viewSemesterWeek", requestId, session, term, year)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.ViewSemesterWeek:signed-in

Authored path: `BFSThisMess.ViewSemesterWeek`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 170.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 176.

```reaction
when RequestBoundary.request (path: "/bfsthismess/viewSemesterWeek", requestId, session, term, year)
where
  Authentication._authenticate (session) has (user)
then
  TimeBudget.ensureDefault (user)
```

### BFSThisMess.ViewSemesterWeek:signed-in#2

Authored path: `BFSThisMess.ViewSemesterWeek`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 170.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 176.

```reaction
when TimeBudget.ensureDefault (user), asked by BFSThisMess.ViewSemesterWeek:signed-in
where
  earlier, RequestBoundary.request (path: "/bfsthismess/viewSemesterWeek", requestId, session, term, year)
then
  RequestBoundary.respond (requestId, week: former "the week of a semester" with (term, user, year))
```

### BFSThisMess.ViewSharing:editor

Authored path: `BFSThisMess.ViewSharing`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 105.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 118.

```reaction
when RequestBoundary.request (path: "/bfsthismess/viewSharing", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canEdit (road, user) has (allowed: true)
then
  RequestBoundary.respond (people: former "the people a road is shared with" with (requester: user, road), requestId)
```

### BFSThisMess.ViewSharing:hidden-road

Authored path: `BFSThisMess.ViewSharing`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 105.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 118.

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
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 105.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 118.

```reaction
when RequestBoundary.request (path: "/bfsthismess/viewSharing", requestId, road, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.ViewSharing:view-only

Authored path: `BFSThisMess.ViewSharing`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 105.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 118.

```reaction
when RequestBoundary.request (path: "/bfsthismess/viewSharing", requestId, road, session)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
  Share._canEdit (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NOT_AN_EDITOR", requestId)
```

### BFSThisMess.ViewSlotOptions:hidden-road

Authored path: `BFSThisMess.ViewSlotOptions`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 217.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 227.

```reaction
when RequestBoundary.request (blocks, path: "/bfsthismess/viewSlotOptions", requestId, road, session, term, topic, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: false)
then
  RequestBoundary.respond (error: "NO_SUCH_ROAD", requestId)
```

### BFSThisMess.ViewSlotOptions:no-session

Authored path: `BFSThisMess.ViewSlotOptions`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 217.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 227.

```reaction
when RequestBoundary.request (blocks, path: "/bfsthismess/viewSlotOptions", requestId, road, session, term, topic, year)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.ViewSlotOptions:viewer

Authored path: `BFSThisMess.ViewSlotOptions`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 217.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 227.

```reaction
when RequestBoundary.request (blocks, path: "/bfsthismess/viewSlotOptions", requestId, road, session, term, topic, year)
where
  Authentication._authenticate (session) has (user)
  Share._canView (road, user) has (allowed: true)
then
  RequestBoundary.respond (requestId, subjects: former "the subjects for a slot" with (blocks, road, term, topic, year))
```

### BFSThisMess.ViewStudySettings:no-session

Authored path: `BFSThisMess.ViewStudySettings`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 157.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 161.

```reaction
when RequestBoundary.request (path: "/bfsthismess/viewStudySettings", requestId, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.ViewStudySettings:signed-in

Authored path: `BFSThisMess.ViewStudySettings`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 157.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 161.

```reaction
when RequestBoundary.request (path: "/bfsthismess/viewStudySettings", requestId, session)
where
  Authentication._authenticate (session) has (user)
then
  RequestBoundary.respond (requestId, settings: former "the study settings of a user" with (user))
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

### BFSThisMess.ViewWeek:no-session

Authored path: `BFSThisMess.ViewWeek`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 170.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 175.

```reaction
when RequestBoundary.request (path: "/bfsthismess/viewWeek", requestId, session)
where
  no Authentication._authenticate (session)
then
  RequestBoundary.respond (error: "NO_SUCH_SESSION", requestId)
```

### BFSThisMess.ViewWeek:signed-in

Authored path: `BFSThisMess.ViewWeek`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 170.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 175.

```reaction
when RequestBoundary.request (path: "/bfsthismess/viewWeek", requestId, session)
where
  Authentication._authenticate (session) has (user)
then
  TimeBudget.ensureDefault (user)
```

### BFSThisMess.ViewWeek:signed-in#2

Authored path: `BFSThisMess.ViewWeek`.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 170.
- Covered by [BFSThisMess](../design/compositions/BFSThisMess.md), line 175.

```reaction
when TimeBudget.ensureDefault (user, template), asked by BFSThisMess.ViewWeek:signed-in
where
  earlier, RequestBoundary.request (path: "/bfsthismess/viewWeek", requestId, session)
then
  RequestBoundary.respond (requestId, setup: former "the weeks of a user" with (user), week: former "a week of blocked time" with (template))
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
- `/bfsthismess/addCategory` — requires `color`, `name`, `session`
- `/bfsthismess/addOption` — requires `block`, `session`, `subject`
- `/bfsthismess/addPrior` — requires `road`, `session`, `subject`
- `/bfsthismess/addPriorCredit` — requires `session`, `subject`
- `/bfsthismess/addTaken` — requires `session`, `subject`, `term`, `year`
- `/bfsthismess/addTimeBlock` — requires `category`, `day`, `session`, `slots`, `start`, `template`
- `/bfsthismess/checkPlan` — requires `road`, `session`
- `/bfsthismess/chooseAlternative` — requires `alternative`, `choice`, `road`, `session`
- `/bfsthismess/chooseSection` — requires `kind`, `road`, `section`, `session`, `subject`, `term`, `year`
- `/bfsthismess/clearCap` — requires `capType`, `road`, `session`, `term`, `year`
- `/bfsthismess/clearRoadReserve` — requires `road`, `session`
- `/bfsthismess/clearSection` — requires `kind`, `road`, `session`, `subject`, `term`, `year`
- `/bfsthismess/clearSubjectFactor` — requires `session`, `subject`
- `/bfsthismess/copyRoad` — requires `name`, `road`, `session`
- `/bfsthismess/deleteCategory` — requires `category`, `session`
- `/bfsthismess/deleteRoad` — requires `road`, `session`
- `/bfsthismess/disableLink` — requires `road`, `role`, `session`
- `/bfsthismess/enableLink` — requires `road`, `role`, `session`
- `/bfsthismess/findPaths` — requires `includeIAPAndSummer`, `limit`, `road`, `session`
- `/bfsthismess/findUsers` — requires `prefix`, `road`, `session`
- `/bfsthismess/finishPriorCredit` — requires `session`
- `/bfsthismess/joinLink` — requires `session`, `token`
- `/bfsthismess/lockSeason` — requires `session`, `term`, `year`
- `/bfsthismess/logIn` — requires `password`, `username`
- `/bfsthismess/logOut` — requires `session`
- `/bfsthismess/myRoads` — requires `session`
- `/bfsthismess/newRoad` — requires `major`, `name`, `session`, `startTerm`, `startYear`
- `/bfsthismess/overrideWeek` — requires `session`, `term`, `year`
- `/bfsthismess/pin` — requires `road`, `session`, `subject`, `term`, `year`
- `/bfsthismess/previewEndChange` — requires `road`, `session`, `term`, `year`
- `/bfsthismess/previewStartChange` — requires `road`, `session`, `term`, `year`
- `/bfsthismess/recolorCategory` — requires `category`, `color`, `session`
- `/bfsthismess/refreshRequirements` — requires `road`, `session`
- `/bfsthismess/regenerateLink` — requires `road`, `role`, `session`
- `/bfsthismess/register` — requires `password`, `username`
- `/bfsthismess/removeBlock` — requires `block`, `session`
- `/bfsthismess/removeOption` — requires `block`, `session`, `subject`
- `/bfsthismess/removePrior` — requires `road`, `session`, `subject`
- `/bfsthismess/removePriorCredit` — requires `session`, `subject`
- `/bfsthismess/removeTaken` — requires `session`, `subject`, `term`, `year`
- `/bfsthismess/removeTimeBlock` — requires `block`, `session`
- `/bfsthismess/renameCategory` — requires `category`, `name`, `session`
- `/bfsthismess/renameRoad` — requires `name`, `road`, `session`
- `/bfsthismess/resetSemester` — requires `road`, `session`, `term`, `year`
- `/bfsthismess/resetWeek` — requires `session`, `term`, `year`
- `/bfsthismess/searchSubjects` — requires `level`, `query`, `term`
- `/bfsthismess/setCap` — requires `capType`, `limit`, `road`, `session`, `term`, `year`
- `/bfsthismess/setCount` — requires `block`, `count`, `session`
- `/bfsthismess/setEnd` — requires `road`, `session`, `term`, `year`
- `/bfsthismess/setHistoryStart` — requires `session`, `term`, `year`
- `/bfsthismess/setLocked` — requires `locked`, `road`, `session`, `term`, `year`
- `/bfsthismess/setMajor` — requires `major`, `road`, `session`
- `/bfsthismess/setReserve` — requires `buffer`, `session`
- `/bfsthismess/setRoadReserve` — requires `buffer`, `road`, `session`
- `/bfsthismess/setRole` — requires `road`, `role`, `session`, `username`
- `/bfsthismess/setScheduleMode` — requires `mode`, `road`, `session`
- `/bfsthismess/setStart` — requires `road`, `session`, `term`, `year`
- `/bfsthismess/setStudyFactor` — requires `factor`, `session`
- `/bfsthismess/setSubjectFactor` — requires `factor`, `session`, `subject`
- `/bfsthismess/setTimeBlock` — requires `block`, `category`, `day`, `session`, `slots`, `start`
- `/bfsthismess/shareRoad` — requires `road`, `role`, `session`, `username`
- `/bfsthismess/unPin` — requires `road`, `session`, `subject`
- `/bfsthismess/unlockSeason` — requires `session`, `term`, `year`
- `/bfsthismess/unshareRoad` — requires `road`, `session`, `username`
- `/bfsthismess/viewClassHours` — requires `session`, `subject`, `term`, `year`
- `/bfsthismess/viewHistory` — requires `session`
- `/bfsthismess/viewLinks` — requires `road`, `session`
- `/bfsthismess/viewOptions` — requires `includeIAPAndSummer`, `road`, `session`
- `/bfsthismess/viewPlanMetrics` — requires `includeIAPAndSummer`, `limit`, `road`, `session`
- `/bfsthismess/viewRatings` — requires `course`
- `/bfsthismess/viewRoad` — requires `includeIAPAndSummer`, `limit`, `road`, `session`
- `/bfsthismess/viewRoadTime` — requires `road`, `session`
- `/bfsthismess/viewSchedule` — requires `course`
- `/bfsthismess/viewSemesterSchedule` — requires `road`, `session`, `subjects`, `term`, `year`
- `/bfsthismess/viewSemesterWeek` — requires `session`, `term`, `year`
- `/bfsthismess/viewSharing` — requires `road`, `session`
- `/bfsthismess/viewSlotOptions` — requires `blocks`, `road`, `session`, `term`, `topic`, `year`
- `/bfsthismess/viewStudySettings` — requires `session`
- `/bfsthismess/viewSubject` — requires `course`
- `/bfsthismess/viewWeek` — requires `session`
