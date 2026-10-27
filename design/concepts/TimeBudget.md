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

Mode is SOFT or HARD
  SOFT: plans are shown with their hours and whether they fit. HARD: plans that do not fit are left out.

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
  unique owner and year and term
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

addBlock(user: User, template: Template, category: Category, day: Number, start: Number, length: Number) : returns (block: Block)
  where template does not exist or is not owned by user
  then
    refuses NO_SUCH_TEMPLATE "There is no such week."
  where category is neither a system category nor one of user's own
  then
    refuses NO_SUCH_CATEGORY "There is no such category."
  where category is managed
  then
    refuses MANAGED_CATEGORY "Class time comes from your classes; it cannot be painted."
  where day is not a whole number from 0 to 6, start is not one from 0 to 95, or length is not one from 1 to 671
  then
    refuses BAD_SLOT "A block must start on a 15-minute mark and last from 15 minutes to under a week."
  where the slots the block would cover meet the slots of another Block of template
  then
    refuses OVERLAP "That time is already blocked."
  where all of the above hold
  then
    create a Block of template in category covering those slots
    returns block

setBlock(user: User, block: Block, category: Category, day: Number, start: Number, length: Number) : returns ()
  where block does not exist or its Template is not owned by user
  then
    refuses NO_SUCH_BLOCK "There is no such block."
  where category is neither a system category nor one of user's own
  then
    refuses NO_SUCH_CATEGORY "There is no such category."
  where category is managed
  then
    refuses MANAGED_CATEGORY "Class time comes from your classes; it cannot be painted."
  where day, start or length is out of range as in addBlock
  then
    refuses BAD_SLOT "A block must start on a 15-minute mark and last from 15 minutes to under a week."
  where the slots the block would cover meet the slots of another Block of its Template
  then
    refuses OVERLAP "That time is already blocked."
  where all of the above hold
  then
    set the category, day, start and length of block (moving or resizing it)
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

forgetRoad(road: Road) : returns ()
  where true
  then
    delete the RoadSettings of road if there are any
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

_blocks(template: Template) : many (block: Block, category: Category, day: Number, start: Number, length: Number)
  Answers the Blocks of template ordered by day and start, or no rows if there are none or template does not exist.

_rollup(template: Template) : many (category: Category, day: Number, hours: Number)
  Answers hours(template, category, day) for each category and day where it is more than 0, ordered by category as in _categories and then by day.

_blocked(template: Template) : one (blocked: Number, free: Number)
  Answers blocked(template) and 168 minus it. A template that does not exist answers 0 and 168.

_settings(user: User) : one (buffer: Number, factor: Number)
  Answers the buffer and factor of user, or 10 and 2 if they have no Settings.

_subjectFactors(user: User) : many (subject: String, factor: Number)
  Answers the SubjectFactors of user in subject order.

_roadSettings(road: Road) : one (mode: Mode, hasBuffer: Flag, buffer: Number, shareMode: ShareMode)
  Answers the RoadSettings of road, or SOFT, no buffer (hasBuffer false, buffer 0) and METRICS if there are none.
```
