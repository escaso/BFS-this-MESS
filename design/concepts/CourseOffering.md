# CourseOffering

## Purpose

Store information about MIT subjects, including when subjects are offered, their metadata (level, terms, offering status, repeatability), prerequisites, corequisites, and evaluation ratings with source links.

## Principle

Once a semester, the maintainer builds a snapshot of the [MIT Subject Listing](https://student.mit.edu/catalog/index.cgi) (taken from [Fireroad](https://github.com/sipb/fireroad-server), which parses the listing and the subject evaluations) and loads it. The key properties of each course are extracted, such as its prerequisites, the semesters in which it is offered and its class rating. A subject that the listing says will not run this year or next year is recorded as cancelled in those semesters. A student can then search for a subject and see when it is offered, what it requires, and how it was rated.

## Types

```types
external Subject
  The generic type for a course/subject.

Term is IAP or SPRING or SUMMER or FALL
  The part of an academic year a semester falls in, as named in the subject listing.

DependencyKind is PREREQUISITE or COREQUISITE
  Whether a dependency must be satisfied in an earlier semester (PREREQUISITE) or in the same or an earlier one (COREQUISITE).
```

## State

```state
Rule: A season is a year together with a term, where year is the calendar year of the semester. Seasons are ordered by year, then by term (IAP < SPRING < SUMMER < FALL), so FALL 2026 comes before IAP 2027. An academic year is the FALL of year Y followed by the IAP, SPRING and SUMMER of year Y + 1.

a set of Courses with
  a unique Subject
  a name String
  a courseId String
  a description String
  a lecturer String
  a level String
  a terms set of Term
  an offering String
  a canBeRepeated Flag
  a prerequisitesText String
  a corequisitesText String
  an optional units String
  an optional meetingTimes String
  an optional location String

a set of Dependencies with
  a course Subject
  a kind DependencyKind
  an options set of Subject
  a count Number

a set of Cancellations with
  a Subject
  a year Number
  a term Term
  unique subject and year and term

a set of Ratings with
  a unique course Subject
  a classRating Number
  a url String

a Catalog with
  an optional snapshot String

Rule: level is e.g. "Undergraduate" vs "Graduate". terms holds e.g. FALL, IAP, SPRING, SUMMER. offering is e.g. "Offered normally", "Not offered THIS year", "Not offered NEXT year", "Not currently listed". units is e.g. "3-0-9" or "Arrange", meetingTimes is e.g. "TR2.30-4", and location is e.g. "36-153". Attributes are in accordance with the MIT Subject Listing & Schedule Symbol Definitions (https://student.mit.edu/catalog/symbols.html).
Rule: prerequisitesText and corequisitesText are the requirements as the listing words them (e.g. "6.100A, (6.1200/18.062)" or "''Permission of instructor''"), or empty if there are none. They are for reading; Dependencies holds what a plan must satisfy.
Rule: A snapshot covers every term of an academic year, so terms holds the terms of the last snapshot that listed the subject.
Rule: Dependencies is NOT recursive: if a prereq has a prereq, only the direct pre-reqs are listed. The prerequisite graph is derived from Dependencies.
Rule: A dependency says that course needs at least count of its options. count is at least 1. An "or" in a subject's prerequisites is a dependency with count 1 and several options; an "and" is several dependencies. A group of the listing that can be met without a subject (e.g. "18.03/''permission of instructor''") is not a dependency.
Rule: A cancellation says a subject is not offered in that season even though its terms allow it. A subject with no cancellation is assumed to be offered in the terms it lists. Cancellations are derived from offering by load (see load).
Rule: Courses without evaluation data have no entry in Ratings.
Rule: snapshot is the id of the last snapshot loaded, so that the same snapshot is not loaded twice.
```

## Actions

```actions
load(snapshot: String) : returns (count: Number)
  where snapshot can be parsed as a catalog snapshot: an id, the academic year it describes (the year Y of its FALL), and a list of courses with their attributes, prerequisites, corequisites and ratings
  then
    for each course in the snapshot, replace its entry in Courses, its Dependencies and its entry in Ratings with those of the snapshot
    for each course in the snapshot, replace its Cancellations in that academic year and the following one according to its offering:
      "Offered normally" adds none;
      "Not offered THIS year" adds one for each term of that academic year;
      "Not offered NEXT year" adds one for each term of the following academic year;
      "Not currently listed" adds one for each term of both academic years
    set the snapshot of Catalog to the id of the snapshot
    count is the number of courses in the snapshot
    returns count
  where snapshot cannot be parsed as a catalog snapshot
  then
    refuses LOAD_FAILED "The catalog snapshot could not be parsed."
```

## Queries

```queries
_loadedSnapshot() : one (found: Flag, id: String)
  If a snapshot has been loaded, answers found = true with the id of the last one; otherwise answers found = false and an empty id.

_course(course: Subject) : one (found: Flag, name: String, courseId: String, description: String, lecturer: String, level: String, units: String, offering: String, canBeRepeated: Flag, prerequisitesText: String, corequisitesText: String)
  If course is in Courses, answers found = true with its attributes (units is empty if it has none); otherwise answers found = false and empty attributes.

_prerequisites(course: Subject) : many (dependency: Dependency, count: Number, prerequisite: Subject)
  where course is in Courses. Answers one row for each option of each PREREQUISITE dependency of course, ordered by dependency, or no rows if it has none. A row's count is the number of options of its dependency that are needed, so an "or" group is not flattened.

_corequisites(course: Subject) : many (dependency: Dependency, count: Number, corequisite: Subject)
  where course is in Courses. Answers one row for each option of each COREQUISITE dependency of course, ordered by dependency, or no rows if it has none. A row's count is the number of options of its dependency that are needed.

_isOffered(course: Subject, year: Number, term: Term) : one (offered: Flag)
  where course is in Courses. Answers whether course is offered in the specified season: its terms include term and it has no Cancellation for that season.

_cancellations(course: Subject) : many (year: Number, term: Term)
  where course is in Courses. Answers every season in which course is cancelled, ordered by season, or no rows if there are none.

_ratings(course: Subject) : one (found: Flag, classRating: Number, url: String)
  where course is in Courses. If course is in Ratings, answers found = true with the class rating and source URL associated with course; otherwise answers found = false.

_search(query?: String, level?: String, term?: Term) : many (course: Subject, name: String, courseId: String, level: String, units: String, unitsKnown: Flag, terms: String)
  Answers every course that satisfies each filter that is given, or every course if none is given, ordered by course Id with numbers compared as numbers (so 6.1010 comes before 18.01). query matches courses whose name, description or course Id contains it, ignoring case (an empty query is treated as not given); level matches courses of that level, ignoring case; term matches courses whose terms include it. units is empty if the course has none. unitsKnown is false when units is absent or has no numeric total (e.g. "Arrange"); other concepts then assume 12 units, so an interface can show that these units are an assumption. terms is the terms of the course in season order, separated by spaces (e.g. "FALL SPRING"), or empty.

_terms(course: Subject) : many (term: Term)
  where course is in Courses. Answers each term in the terms of course, in season order, or no rows if there are none.

_schedule(course: Subject) : one (found: Flag, units: String, meetingTimes: String, location: String)
  where course is in Courses. If course has meetingTimes (is not empty/null), answers found = true with its units, meeting times, and location; otherwise answers found = false.
```
