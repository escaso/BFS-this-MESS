# TimeBudget

## Purpose

Let a student see how many hours of their week are already spoken for (sleep, meals, work, practice) so that they can tell how much time is left to study, and plan semesters they can actually keep up with.

## Principle

A student starts with a default week, filled in the way a time-budgeting worksheet suggests: eight hours of sleep a night, an hour of personal care and three hours of eating a day. They paint the rest of their regular week in blocks of 15 minutes: practice on Tuesday and Thursday evenings, a job on Saturday mornings, and so on, each in a category such as Work or Exercise, or in a category of their own. A block may run past midnight, like sleep from 11 pm to 7 am. Every week has 168 hours; what is not blocked is free, and classes come out of the free time. For a semester that will be different, such as one with a summer job, the student overrides the default with a copy and changes the copy; resetting it goes back to the default. Each of their roads may treat the time budget as advice (soft) or as a rule (hard), and decides whether people the road is shared with see the categories of the blocked time or only how much of it there is.

## Types

```types
external User
  A user of the application.

external Road
  A road whose plans the time budget is applied to.

Term is IAP or SPRING or SUMMER or FALL
  The part of an academic year a semester falls in, as named in the subject listing.

Status is FEASIBLE or TIGHT or OVER
  Whether a semester's study fits its free time: with the reserve kept, only by using the reserve, or not at all.

Mode is SOFT or HARD
  SOFT: plans are shown with their hours and whether they fit. HARD: plans that do not fit are left out.

Kind is LECTURE or RECITATION or LAB or DESIGN
  A part of a class that meets: a student attends one section of each part.

ShareMode is METRICS or DETAILS
  METRICS: people a road is shared with see hours only, and blocked time as one anonymous total. DETAILS: they also see the categories and blocks.
```

## State

```state
Rule: A week has 7 days, numbered 0 (Monday) to 6 (Sunday), and each day has 96 slots of 15 minutes, numbered 0 (00:00 to 00:15) to 95 (23:45 to 24:00). A week therefore has 672 slots and 168 hours.

a set of Categories with
  an optional owner User
  a name String
  a color String
  a managed Flag
  Rule: A Category with no owner is a system category, which every user has: Sleep, Personal care, Eating (including preparation), Commute, Regularly scheduled activities, Watching TV, Video games, Surfing the net, Watching the kids, Volunteering, Exercise, Chores and errands, Work, Socializing, Other and In class. A user's own categories are theirs alone.
  Rule: A managed category is filled in by the application, not painted: In class is the only one, and its time comes from the classes of a plan.
  Rule: No two categories a user has (system or their own) have the same name, ignoring case. color is a CSS colour.

a set of Templates with
  an owner User
  an optional year Number
  an optional term Term
  a version Number
  unique owner and year and term
  Rule: version changes whenever the blocks of the Template do, so that what is worked out from a week can be kept until it changes. A Template made before version existed has version 0.
  Rule: A Template is a regular week. A user has at most one default Template, with no season, and at most one override per season. A season with no override uses the default.

a set of Blocks with
  a Template
  a Category
  a day Number
  a start Number
  a length Number
  Rule: A Block is blocked time that repeats every week of its Template. It covers length consecutive slots, starting at slot start of day day; past the end of a day it continues into the next one, and past the end of Sunday into Monday. length is from 1 to 671, so a block never covers the whole week.
  Rule: No two Blocks of a Template cover the same slot. A Block is never in a managed category.

a set of Settings with
  a unique User
  a buffer Number
  a factor Number
  Rule: buffer is the percentage of free time a student keeps in reserve for weeks that go wrong (midterms, illness); it is from 0 to 50 and is 10 for a user with no Settings. factor is how many hours of study outside class each hour in class takes when the catalog does not say; it is from 2 to 3 and is 2 for a user with no Settings.

a set of SubjectFactors with
  a User
  a subject String
  a factor Number
  unique user and subject
  Rule: A SubjectFactor replaces the factor of a user for one subject. It is from 2 to 3.

a set of RoadSettings with
  a unique Road
  a mode Mode
  an optional buffer Number
  a shareMode ShareMode
  Rule: A road with no RoadSettings is SOFT, uses the buffer of its owner, and is shared as METRICS. A buffer here replaces the owner's for this road only.

a set of Classes with
  a unique subject String
  an optional scheduleYear Number
  an optional scheduleTerm Term
  a parts set of Parts
  an optional inClassHours Number
  an optional outOfClassHours Number
  an optional contactUnits Number
  Rule: A Class is what the catalog says about the time a subject takes: its schedule, published for one season (scheduleYear and scheduleTerm), the hours a week in and out of class that students reported in subject evaluations, and its lecture plus lab and design units (the "contact hours" of a time-budgeting worksheet). Each is absent when the catalog does not say. It is copied from the catalog snapshot when it loads.

a set of Parts with
  a kind Kind
  an arranged Flag
  a sections set of Sections
  Rule: A Part is one kind of meeting of a class, such as its lecture. An arranged part has no time in the schedule (TBA), so it takes time but has no place in the week.

a set of Sections with
  a room String
  a meetings set of Meetings
  Rule: A Section is one choice for a Part: the meetings a student who picks it attends every week.

a set of Meetings with
  a day Number
  a start Number
  a length Number
  Rule: A Meeting is on day day from slot start for length slots, as for a Block; meetings do not run past midnight.

Rule: The schedule of a Class is exact for its schedule season and an estimate for a season of the same term in another year (classes usually meet at the same times each year); for a season of another term there is no schedule.
Rule: classHours(user, subject, season) is the time a subject takes in a season, each number with where it came from. inClass is the hours a week of the schedule, if there is one for that season and none of its parts is arranged: for each part, the length of its most common section (source SCHEDULE); otherwise inClassHours (source EVALUATIONS); otherwise contactUnits (source UNITS); otherwise 3, as for a typical 12-unit subject (source ASSUMED). outOfClass is outOfClassHours (source EVALUATIONS) if there is one, otherwise inClass × the factor of user for subject (source FORMULA): their SubjectFactor if they have one, otherwise the factor of their Settings. total is inClass + outOfClass.

a set of SectionChoices with
  a Road
  a year Number
  a term Term
  a subject String
  a kind Kind
  a section Number
  unique road and year and term and subject and kind
  Rule: A SectionChoice is a section a student picked by hand for one part of a class in one semester of a road, instead of the one picked for them.

Rule: placed(subject, season) are the parts of the schedule of subject that apply to the season, are not arranged and have sections, if the season is FALL or SPRING; IAP and SUMMER are never placed, since their classes are too irregular for a weekly grid, and are counted in hours only.
Rule: pick(user, road, season, subjects) is one section for each placed part of each of subjects: its SectionChoice if road has one that names an existing section, otherwise the section found by the search, so that the picked sections have as few conflicts as possible. A conflict is a meeting of a picked section together with a block it overlaps, of the week the season uses for user (templateFor), or a pair of overlapping meetings of two picked sections of different subjects or parts. The search goes through the parts not chosen by hand from the one with the fewest sections, then by subject and kind, and through each part's sections in order; it drops a partial pick as soon as it has as many conflicts as the best found, stops at a pick with no conflicts, and stops after 20000 steps with the best found. So it is deterministic, and finds a pick with no conflicts whenever one exists within its steps.
Rule: metrics(user, road, season, subjects, openSlots) are the numbers of a semester. inClass and outOfClass are the sums of classHours(user, subject, season) over subjects, plus, for each of openSlots (a subject still to be chosen), 3 hours in class and 3 × the factor of user outside it. blocked is blocked(templateFor(user, season)). free is 168 − blocked − inClass, so that blocked + inClass + free is 168. buffer is the buffer of the RoadSettings of road if it has one, otherwise the buffer of user. usable is free × (1 − buffer / 100) and capacity is free − outOfClass. status is feasibility(outOfClass, free, buffer): FEASIBLE when outOfClass ≤ usable, TIGHT when outOfClass ≤ free, and OVER otherwise. conflicts is the number of conflicts of pick(user, road, season, subjects).

Rule: covers(block) is the set of slots of the week that block covers: day × 96 + start, and the length − 1 slots after it, counted modulo 672.
Rule: hours(template, category, day) is a quarter of the number of slots of day covered by blocks of template in category. A block past midnight counts toward the day each of its slots is in, so sleep from 11 pm Monday to 7 am Tuesday is 1 hour on Monday and 7 on Tuesday. blocked(template) is a quarter of the number of slots covered by any block of template.
```

## Actions

```actions
ensureDefault(user: User) : returns (template: Template)
  where user has a default Template
  then
    template is that default Template
    returns template
  where user has no default Template
  then
    create the default Template of user with these blocks, every day: Sleep from 23:00 to 07:00 (32 slots), Personal care from 07:00 to 08:00, Eating from 08:00 to 08:30, from 12:00 to 13:00 and from 18:00 to 19:30 (3 hours in all)
    returns template

override(user: User, year: Number, term: Term) : returns (template: Template)
  where user has no default Template
  then
    refuses NO_DEFAULT "Set up your regular week first."
  where user already has an override for this season
  then
    template is that override
    returns template
  where user has a default Template and no override for this season
  then
    create a Template of user for this season with a copy of every Block of the default
    returns template

resetToDefault(user: User, year: Number, term: Term) : returns ()
  where user has no override for this season
  then
    refuses NOT_OVERRIDDEN "That semester already uses your regular week."
  where user has an override for this season
  then
    delete it with its Blocks, so that the season uses the default again
    returns

addBlock(user: User, template: Template, category: Category, day: Number, start: Number, slots: Number) : returns (block: Block)
  where template does not exist or is not owned by user
  then
    refuses NO_SUCH_TEMPLATE "There is no such week."
  where category is neither a system category nor one of user's own
  then
    refuses NO_SUCH_CATEGORY "There is no such category."
  where category is managed
  then
    refuses MANAGED_CATEGORY "Class time comes from your classes; it cannot be painted."
  where day is not a whole number from 0 to 6, start is not one from 0 to 95, or slots is not one from 1 to 671
  then
    refuses BAD_SLOT "A block must start on a 15-minute mark and last from 15 minutes to under a week."
  where the slots the block would cover meet the slots of another Block of template
  then
    refuses OVERLAP "That time is already blocked."
  where all of the above hold
  then
    create a Block of template in category from slot start of day day, with length slots
    returns block

setBlock(user: User, block: Block, category: Category, day: Number, start: Number, slots: Number) : returns ()
  where block does not exist or its Template is not owned by user
  then
    refuses NO_SUCH_BLOCK "There is no such block."
  where category is neither a system category nor one of user's own
  then
    refuses NO_SUCH_CATEGORY "There is no such category."
  where category is managed
  then
    refuses MANAGED_CATEGORY "Class time comes from your classes; it cannot be painted."
  where day, start or slots is out of range as in addBlock
  then
    refuses BAD_SLOT "A block must start on a 15-minute mark and last from 15 minutes to under a week."
  where the slots the block would cover meet the slots of another Block of its Template
  then
    refuses OVERLAP "That time is already blocked."
  where all of the above hold
  then
    set the category, day and start of block, and its length to slots (moving or resizing it)
    returns

removeBlock(user: User, block: Block) : returns ()
  where block does not exist or its Template is not owned by user
  then
    refuses NO_SUCH_BLOCK "There is no such block."
  where block exists and its Template is owned by user
  then
    delete block
    returns

addCategory(user: User, name: String, color: String) : returns (category: Category)
  where name is empty
  then
    refuses EMPTY_NAME "A category needs a name."
  where user already has a category with this name, ignoring case
  then
    refuses NAME_TAKEN "You already have a category with that name."
  where name is not empty and is not taken
  then
    create a Category owned by user with this name and color, not managed
    returns category

renameCategory(user: User, category: Category, name: String) : returns ()
  where category is not owned by user (including a system category)
  then
    refuses NOT_YOUR_CATEGORY "Only your own categories can be changed."
  where name is empty
  then
    refuses EMPTY_NAME "A category needs a name."
  where another category user has has this name, ignoring case
  then
    refuses NAME_TAKEN "You already have a category with that name."
  where category is owned by user and name is not empty and not taken
  then
    set the name of category to name
    returns

recolorCategory(user: User, category: Category, color: String) : returns ()
  where category is not owned by user
  then
    refuses NOT_YOUR_CATEGORY "Only your own categories can be changed."
  where category is owned by user
  then
    set the color of category to color
    returns

deleteCategory(user: User, category: Category) : returns ()
  where category is not owned by user
  then
    refuses NOT_YOUR_CATEGORY "Only your own categories can be changed."
  where category is owned by user
  then
    delete category and every Block in it
    returns

setBuffer(user: User, buffer: Number) : returns ()
  where buffer is less than 0 or more than 50
  then
    refuses BAD_BUFFER "The reserve must be from 0% to 50% of your free time."
  where buffer is from 0 to 50
  then
    set the buffer of user's Settings to buffer, creating them with factor 2 if there are none
    returns

setFactor(user: User, factor: Number) : returns ()
  where factor is less than 2 or more than 3
  then
    refuses BAD_FACTOR "Study hours per class hour must be from 2 to 3."
  where factor is from 2 to 3
  then
    set the factor of user's Settings to factor, creating them with buffer 10 if there are none
    returns

setSubjectFactor(user: User, subject: String, factor: Number) : returns ()
  where factor is less than 2 or more than 3
  then
    refuses BAD_FACTOR "Study hours per class hour must be from 2 to 3."
  where factor is from 2 to 3
  then
    set the SubjectFactor of user for subject to factor, creating it if there is none
    returns

clearSubjectFactor(user: User, subject: String) : returns ()
  where user has no SubjectFactor for subject
  then
    refuses NO_SUBJECT_FACTOR "That subject uses your usual factor."
  where user has a SubjectFactor for subject
  then
    delete it
    returns

setMode(road: Road, mode: Mode) : returns ()
  where mode is not SOFT or HARD
  then
    refuses BAD_MODE "The time budget is either soft or hard."
  where mode is SOFT or HARD
  then
    set the mode of the RoadSettings of road, creating them (SOFT, no buffer, METRICS) if there are none
    returns

setRoadBuffer(road: Road, buffer: Number) : returns ()
  where buffer is less than 0 or more than 50
  then
    refuses BAD_BUFFER "The reserve must be from 0% to 50% of your free time."
  where buffer is from 0 to 50
  then
    set the buffer of the RoadSettings of road, creating them as in setMode
    returns

clearRoadBuffer(road: Road) : returns ()
  where true
  then
    remove the buffer of the RoadSettings of road if there are any, so that it uses its owner's
    returns

setShareMode(road: Road, shareMode: ShareMode) : returns ()
  where shareMode is not METRICS or DETAILS
  then
    refuses BAD_SHARE_MODE "Share either hours only or your blocked time too."
  where shareMode is METRICS or DETAILS
  then
    set the shareMode of the RoadSettings of road, creating them as in setMode
    returns

setClass(subject: String, scheduleYear?: Number, scheduleTerm?: Term, parts: String, inClassHours?: Number, outOfClassHours?: Number, contactUnits?: Number) : returns ()
  where parts is not JSON of the form [{"kind": Kind, "arranged": Flag, "sections": [{"room": String, "meetings": [{"day", "start", "length"}]}]}] with each meeting inside one day, or only one of scheduleYear and scheduleTerm is given
  then
    refuses BAD_CLASS "That class could not be read."
  where parts can be read
  then
    replace the Class of subject with one with these facts (its parts read from parts)
    returns

removeClass(subject: String) : returns ()
  where true
  then
    delete the Class of subject if there is one
    returns

chooseSection(road: Road, year: Number, term: Term, subject: String, kind: Kind, section: Number) : returns ()
  where subject has no section numbered section in a placed part of kind in this season (see placed)
  then
    refuses NO_SUCH_SECTION "That class has no such section that semester."
  where it has
  then
    set the SectionChoice of road for this season, subject and kind to section, creating it if there is none
    returns

clearSection(road: Road, year: Number, term: Term, subject: String, kind: Kind) : returns ()
  where road has no SectionChoice for this season, subject and kind
  then
    refuses NOT_CHOSEN "That section was picked for you already."
  where road has one
  then
    delete it, so that the section is picked for the student again
    returns

forgetRoad(road: Road) : returns ()
  where true
  then
    delete the RoadSettings and the SectionChoices of road, if there are any
    returns
```

## Queries

```queries
_default(user: User) : optional (template: Template)
  Answers the default Template of user, or no row if there is none.

_templateFor(user: User, year: Number, term: Term) : optional (template: Template, overridden: Flag)
  Answers the override of user for this season with overridden true, or else their default Template with overridden false, or no row if they have neither.

_overrides(user: User) : many (year: Number, term: Term, template: Template)
  Answers the overrides of user in season order, or no rows if there are none.

_categories(user: User) : many (category: Category, name: String, color: String, own: Flag, managed: Flag)
  Answers the system categories in the order listed in the state rules, then the categories user owns in order of name.

_blocks(template: Template) : many (block: Block, category: Category, day: Number, start: Number, slots: Number)
  Answers the Blocks of template, with slots their length, ordered by day and start, or no rows if there are none or template does not exist.

_rollup(template: Template) : many (category: Category, day: Number, hours: Number)
  Answers hours(template, category, day) for each category and day where it is more than 0, ordered by category as in _categories and then by day.

_blocked(template: Template) : one (blocked: Number, free: Number)
  Answers blocked(template) and 168 minus it. A template that does not exist answers 0 and 168.

_settings(user: User) : one (buffer: Number, factor: Number)
  Answers the buffer and factor of user, or 10 and 2 if they have no Settings.

_subjectFactors(user: User) : many (subject: String, factor: Number)
  Answers the SubjectFactors of user in subject order.

_classHours(user: User, subject: String, year: Number, term: Term) : one (known: Flag, inClass: Number, inClassSource: String, outOfClass: Number, outOfClassSource: String, factor: Number, total: Number, schedule: String)
  Answers classHours(user, subject, season) with known true, or, for a subject with no Class, the ASSUMED hours with known false. factor is the one that applies to the subject (used only when outOfClassSource is FORMULA). schedule says what the schedule is for that season: EXACT, ESTIMATE (from another year), ARRANGED (one of its parts is TBA), or NONE.

_sections(subject: String, year: Number, term: Term) : many (kind: Kind, section: Number, room: String, day: Number, start: Number, slots: Number)
  Answers one row for each meeting of each section of each part of the schedule of subject that applies to the season (see the rules above), with section the number of the section in its part, from 1, and slots the length of the meeting, ordered by part, section and meeting. Arranged parts and seasons with no schedule have no rows.

_semesterMetrics(user: User, road: Road, year: Number, term: Term, subjects: String, openSlots: Number) : one (inClass: Number, outOfClass: Number, total: Number, blocked: Number, free: Number, buffer: Number, usable: Number, capacity: Number, status: Status, conflicts: Number, estimated: Flag)
  Answers metrics(user, road, season, subjects, openSlots), where subjects are joined by commas (empty for none). Hours are rounded to hundredths. estimated is true if any hours come from anything but the schedule and subject evaluations (units, an assumption, the factor, or an open slot).

_placement(user: User, road: Road, year: Number, term: Term, subjects: String) : many (subject: String, kind: Kind, section: Number, options: Number, chosen: Flag, room: String, day: Number, start: Number, slots: Number, conflicted: Flag)
  Answers one row for each meeting of each section of pick(user, road, season, subjects), ordered by subject, kind and meeting: options is how many sections its part has, chosen whether the student picked it by hand, and conflicted whether the meeting is in a conflict. Answers no rows for IAP and SUMMER.

_conflicts(user: User, road: Road, year: Number, term: Term, subjects: String) : many (subject: String, kind: Kind, day: Number, start: Number, slots: Number, withBlock: Flag, with: String)
  Answers one row for each conflict of pick(user, road, season, subjects): the meeting (day, start, slots) of subject and kind, and what it overlaps: a block (withBlock true, with its category) or the meeting of another class (withBlock false, with that subject). Rows are ordered by day and start.

_unplaced(year: Number, term: Term, subjects: String) : many (subject: String, reason: String)
  Answers, in subject order, each of subjects that counts toward the hours of the season but has a part with no place in the week: reason is TERM for IAP and SUMMER, ARRANGED when a part is TBA, and NONE when no schedule is published for the season.

_searchLimit(road: Road, limit: Number) : one (candidates: Number)
  Answers how many plans to search for to show up to limit of them: limit for a SOFT road, and 3 × limit for a HARD one, since some of them are left out.

_keptPlans(user: User, road: Road, plans: String, limit: Number) : one (mode: Mode, kept: String, dropped: Number)
  plans is a set of plans in the form of Constrain._plansEncoded. For a SOFT road, kept is the first limit of them. For a HARD road it is the first limit of those all of whose unlocked semesters are FEASIBLE by metrics(user, road, season, subjects, slots); locked semesters are history or fixed by the student, and are never judged. kept is the plan numbers joined by commas; dropped is how many were left out for not fitting.

_binding(user: User, road: Road, plans: String, kept: String) : many (plan: Number, year: Number, term: Term, inClass: Number, outOfClass: Number, free: Number, usable: Number, status: Status)
  For a HARD road where kept (as answered by _keptPlans) is empty, answers, for each of plans, its first unlocked semester that is not FEASIBLE, with its numbers, so that a student whose every plan is left out is told which semesters do not fit and by how much. A SOFT road, or one with a plan kept, answers no rows.

_roadSettings(road: Road) : one (mode: Mode, hasBuffer: Flag, buffer: Number, shareMode: ShareMode)
  Answers the RoadSettings of road, or SOFT, no buffer (hasBuffer false, buffer 0) and METRICS if there are none.
```
