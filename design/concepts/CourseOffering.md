# CourseOffering

## Purpose

Store information about MIT subjects, including when subjects are offered, their metadata (level, terms, offering status, repeatability), prerequisites, corequisites, and evaluation ratings with source links.

## Principle

A student loads the [MIT Subject Listing](https://student.mit.edu/catalog/index.cgi), and the key properties of each course are extracted, such as its prerequisites and the semesters in which it is offered. Ratings associated with each class and lecturer are also extracted from MIT's [Subject Evaluation Reports](https://eduapps.mit.edu/ose-rpt/?Search+Online+Reports=Search+Subject+Evaluation+Reports) site. A subject that the listing says will not run this year or next year is recorded as cancelled in those semesters. The student can then search for a subject and see when it is offered, what it requires, and how it was rated.

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
  a professorRating Number
  a url String

Rule: level is e.g. "Undergraduate" vs "Graduate". terms holds e.g. FALL, IAP, SPRING, SUMMER. offering is e.g. "Offered normally", "Not offered THIS year", "Not offered NEXT year", "Not currently listed". units is e.g. "3-0-9" or "Arrange", meetingTimes is e.g. "TR2.30-4", and location is e.g. "36-153". Attributes are in accordance with the MIT Subject Listing & Schedule Symbol Definitions (https://student.mit.edu/catalog/symbols.html).
Rule: The subject listing is published one half of the year at a time (the Fall listing first, the IAP and Spring listing later). terms holds the terms of the listings that have been loaded: loading a listing replaces the terms that listing covers for each subject in it and keeps the others.
Rule: Dependencies is NOT recursive: if a prereq has a prereq, only the direct pre-reqs are listed. The prerequisite graph is derived from Dependencies.
Rule: A dependency says that course needs at least count of its options. count is at least 1. An "or" in a subject's prerequisites is a dependency with count 1 and several options; an "and" is several dependencies.
Rule: A cancellation says a subject is not offered in that season even though its terms allow it. A subject with no cancellation is assumed to be offered in the terms it lists. Cancellations are derived from offering by load (see load).
Rule: Courses without evaluation data have no entry in Ratings.
```

## Actions

```actions
load(subjectListingURL: String, ratingsURL: String) : returns (count: Number)
  where subjectListingURL and ratingsURL can be retrieved and parsed
  then
    extract the courses, course IDs, descriptions, lecturers, semesters offered, offering status, other attributes, prerequisites, corequisites, and ratings
    store them in Courses, Dependencies and Ratings respectively
    take the academic year of the listing from the listing itself (a Fall Y listing, or an IAP/Spring Y + 1 listing, is the academic year starting in FALL of Y)
    for each subject in the listing, replace its Cancellations in that academic year and the following one according to its offering:
      "Offered normally" adds none;
      "Not offered THIS year" adds one for each term of that academic year;
      "Not offered NEXT year" adds one for each term of the following academic year;
      "Not currently listed" adds one for each term of both academic years
    returns count
  where subjectListingURL or ratingsURL cannot be retrieved or parsed
  then
    refuses LOAD_FAILED "The subject listing or the ratings could not be retrieved."
```

## Queries

```queries
_prerequisites(course: Subject) : many (dependency: Dependency, count: Number, prerequisite: Subject)
  where course is in Courses. Answers one row for each option of each PREREQUISITE dependency of course, ordered by dependency, or no rows if it has none. A row's count is the number of options of its dependency that are needed, so an "or" group is not flattened.

_corequisites(course: Subject) : many (dependency: Dependency, count: Number, corequisite: Subject)
  where course is in Courses. Answers one row for each option of each COREQUISITE dependency of course, ordered by dependency, or no rows if it has none. A row's count is the number of options of its dependency that are needed.

_isOffered(course: Subject, year: Number, term: Term) : one (offered: Flag)
  where course is in Courses. Answers whether course is offered in the specified season: its terms include term and it has no Cancellation for that season.

_cancellations(course: Subject) : many (year: Number, term: Term)
  where course is in Courses. Answers every season in which course is cancelled, ordered by season, or no rows if there are none.

_ratings(course: Subject) : one (found: Flag, classRating: Number, professorRating: Number, url: String)
  where course is in Courses. If course is in Ratings, answers found = true with the class rating, professor rating, and source URL associated with course; otherwise answers found = false.

_search(query?: String, level?: String, term?: Term) : many (course: Subject, name: String, courseId: String, level: String, units: String, unitsKnown: Flag)
  Answers every course that satisfies each filter that is given, or every course if none is given. query matches courses whose name, description or course Id contains it, ignoring case (an empty query is treated as not given); level matches courses of that level, ignoring case; term matches courses whose terms include it. units is empty if the course has none. unitsKnown is false when units is absent or has no numeric total (e.g. "Arrange"); other concepts then assume 12 units, so an interface can show that these units are an assumption.

_terms(course: Subject) : many (term: Term)
  where course is in Courses. Answers each term in the terms of course, or no rows if there are none.

_schedule(course: Subject) : one (found: Flag, units: String, meetingTimes: String, location: String)
  where course is in Courses. If course has meetingTimes (is not empty/null), answers found = true with its units, meeting times, and location; otherwise answers found = false.
```