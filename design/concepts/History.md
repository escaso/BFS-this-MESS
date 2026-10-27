# History

## Purpose

Keep what a student has already done at MIT, once for their whole account: the credit they brought in, the semester they started, and what they took in each semester since, so that every plan they make starts from the same facts.

## Principle

A student who signs up first records the credit they had before MIT (AP, transfer, placement and so on), then the semester they started, say Fall 2024. If that is before the current semester, they are asked, one past semester at a time and including IAP and summer, what they took; "nothing this term" is an answer too. Each answered semester is locked: it is history, and nothing can change it. They may stop half way and come back later to the first semester not yet answered. When they find a mistake, they unlock that semester, correct it and lock it again.

## Types

```types
external User
  A user of the application.

external Subject
  The generic type for a course/subject.

Term is IAP or SPRING or SUMMER or FALL
  The part of an academic year a semester falls in, as named in the subject listing.
```

## State

```state
Rule: A season is a year together with a term. Seasons are ordered by year, then by term (IAP < SPRING < SUMMER < FALL), so FALL 2026 comes before IAP 2027.
Rule: The current season is the season that contains today's date: January is IAP, February to May is SPRING, June to August is SUMMER, and September to December is FALL, all of that calendar year.

a set of Profiles with
  a unique User
  an optional startYear Number
  an optional startTerm Term
  a priorDone Flag
  a prior set of Subject
  Rule: prior is the credit the student brought in before their first semester. priorDone says they have finished listing it, which may be with none.
  Rule: The start is the student's first semester at MIT and is a FALL or SPRING season.

a set of Records with
  a User
  a year Number
  a term Term
  a subjects set of Subject
  an answered Flag
  a locked Flag
  unique user and year and term
  Rule: A Record is what the student took in one past season. It exists only for a season from their start up to, and not including, the current season.
  Rule: answered says the student has finished the season at least once, which may be with no subjects; a season with no Record, or with a Record not yet answered, is still to be asked. A locked Record cannot be changed. Answering a season locks it.
  Rule: A subject is in at most one place in a student's history: their prior credit or one Record.

Rule: pending(user) is the seasons from the start of user up to, and not including, the current season, in season order, that have no answered Record. The history is complete when priorDone holds, the start is set, and pending(user) is empty.
```

## Actions

```actions
addPrior(user: User, subject: Subject) : returns ()
  where subject is in the history of user (their prior credit or a Record)
  then
    refuses ALREADY_TAKEN "That subject is already in your history."
  where subject is not in the history of user
  then
    create a Profile for user if there is none, with no start, priorDone false and no prior credit
    add subject to the prior credit of user
    returns

removePrior(user: User, subject: Subject) : returns ()
  where user has no Profile or subject is not in its prior credit
  then
    refuses NOT_PRIOR "That subject is not in your prior credit."
  where subject is in the prior credit of user
  then
    remove subject from the prior credit of user
    returns

finishPrior(user: User) : returns ()
  where true
  then
    create a Profile for user if there is none, as in addPrior
    set priorDone of user to true
    returns

setStart(user: User, year: Number, term: Term) : returns ()
  where term is not FALL or SPRING
  then
    refuses BAD_START "You must have started in a Fall or Spring semester."
  where term is FALL or SPRING
  then
    create a Profile for user if there is none, as in addPrior
    set the start of user to this season
    delete every Record of user for a season before the new start, or at or after the current season
    returns

addTaken(user: User, year: Number, term: Term, subject: Subject) : returns ()
  where user has no start, or the season is before the start of user or is not before the current season
  then
    refuses NOT_PAST "That semester is not one of your past semesters."
  where the season is past and the Record of user for it is locked
  then
    refuses LOCKED "That semester is locked. Unlock it to change it."
  where the season is past, its Record is absent or unlocked, and subject is in the history of user
  then
    refuses ALREADY_TAKEN "That subject is already in your history."
  where the season is past, its Record is absent or unlocked, and subject is not in the history of user
  then
    create a Record of user for the season if there is none, not answered and unlocked, with no subjects
    add subject to its subjects
    returns

removeTaken(user: User, year: Number, term: Term, subject: Subject) : returns ()
  where user has no Record for the season, or subject is not in its subjects
  then
    refuses NOT_TAKEN "That subject is not in that semester."
  where the Record of user for the season is locked
  then
    refuses LOCKED "That semester is locked. Unlock it to change it."
  where the Record is unlocked and subject is in its subjects
  then
    remove subject from its subjects
    returns

lock(user: User, year: Number, term: Term) : returns ()
  where user has no start, or the season is before the start of user or is not before the current season
  then
    refuses NOT_PAST "That semester is not one of your past semesters."
  where the season is past
  then
    create a Record of user for the season if there is none, with no subjects (the student took nothing that term)
    set answered and locked of that Record to true
    returns

unlock(user: User, year: Number, term: Term) : returns ()
  where user has no locked Record for the season
  then
    refuses NOT_LOCKED "That semester is not locked."
  where user has a locked Record for the season
  then
    set locked of that Record to false (it stays answered, so it is not asked again)
    returns
```

## Queries

```queries
_profile(user: User) : one (started: Flag, startYear: Number, startTerm: Term, priorDone: Flag, currentYear: Number, currentTerm: Term, complete: Flag)
  Answers the start of user (started is false, with year 0 and term FALL, when none is set), whether they have finished their prior credit, the current season, and whether their history is complete. A user with no Profile answers started false, priorDone false and complete false.

_prior(user: User) : many (subject: Subject)
  Answers the prior credit of user, in subject order, or no rows if there is none.

_seasons(user: User) : many (year: Number, term: Term, answered: Flag, locked: Flag, count: Number)
  Answers one row for each season from the start of user up to, and not including, the current season, in season order, with whether it has been answered, whether it is locked, and how many subjects its Record has (0 if it has none). Answers no rows if user has no start.

_taken(user: User, year: Number, term: Term) : many (subject: Subject)
  Answers the subjects of the Record of user for the season, in subject order, or no rows if there is none.

_pending(user: User) : optional (year: Number, term: Term)
  Answers the first season of pending(user), or no row if there is none (also when user has no start).

_encoded(user: User) : one (history: String)
  Answers the part of the history of user that plans start from, as JSON: {"prior": [subjects], "seasons": [{"year": Number, "term": Term, "subjects": [subjects]}]}, where seasons are the answered Records in season order and subjects are in subject order. A user with no Profile answers {"prior": [], "seasons": []}.
```
