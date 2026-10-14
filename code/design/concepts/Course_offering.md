# CourseOffering

## Purpose

Store information about MIT subjects, including when subjects are offered, their metadata (level, terms, offering status, repeatability), prerequisites, corequisites, and evaluation ratings with source links.

## Principle

A course offering can be loaded from the [MIT Subject Listing](https://student.mit.edu/catalog/index.cgi) extracting key properties, such as its pre-requisites and the semesters in which it is offered. Ratings associated with each class and lecturer should also be extracted from MIT's [Subject Evaluation Reports](https://eduapps.mit.edu/ose-rpt/?Search+Online+Reports=Search+Subject+Evaluation+Reports) site.

## Types

```types
external Subject
  The generic type for a course/subject.

opaque Catalog
  The prerequisites, corequisites, terms, offering status, and technical flags of all courses, so other concepts can use them without reading this concept's state.

Boolean is TRUE or FALSE
  Whether something is the case.
```

## State

```state
a set of Courses with
  a Subject
  a name String
  a courseId String
  a description String
  a lecturer String
  a level String
  a terms set of String
  an offering String
  a canBeRepeated Boolean
  an optional units String
  an optional meetingTimes String
  an optional location String

a set of Prerequisites with
  a course Subject
  a prerequisite Subject

a set of Corequisites with
  a course Subject
  a corequisite Subject

a set of Ratings with
  a unique course Subject
  a classRating Number
  a professorRating Number
  a url String

Rule: level is e.g. "Undergraduate" vs "Graduate". terms holds e.g. "Fall", "IAP", "Spring", "Summer". offering is e.g. "Offered normally", "Not offered THIS year", "Not offered NEXT year", "Not currently listed". units is e.g. "3-0-9", meetingTimes is e.g. "TR2.30-4", and location is e.g. "36-153". Attributes are in accordance with the MIT Subject Listing & Schedule Symbol Definitions (https://student.mit.edu/catalog/symbols.html).
Rule: Prerequisites is NOT recursive: if a prereq has a prereq, only the direct pre-reqs are listed. The prerequisite graph is derived from Prerequisites.
Rule: Courses without evaluation data have no entry in Ratings.
```

## Actions

```actions
load(subjectListingURL: String, ratingsURL: String) : returns (count: Number)
  where subjectListingURL and ratingsURL can be retrieved and parsed
  then
    extract the courses, course IDs, descriptions, lecturers, semesters offered, technical flags, prerequisites, corequisites, and ratings
    store them in Courses, Prerequisites, Corequisites and Ratings respectively
    returns count
```

## Queries

```queries
_prerequisites(course: Subject) : many (prerequisite: Subject)
  where course is in Courses. Answers the direct prerequisites of course, or no rows if it has none.

_corequisites(course: Subject) : many (corequisite: Subject)
  where course is in Courses. Answers the corequisites of course, or no rows if it has none.

_isOffered(course: Subject, semester: String) : one (offered: Boolean)
  where course is in Courses. Answers whether course is offered in the specified term and available according to its offering status.

_ratings(course: Subject) : one (found: Boolean, classRating: Number, professorRating: Number, url: String)
  where course is in Courses. If course is in Ratings, answers found = true with the class rating, professor rating, and source URL associated with course; otherwise answers found = false.

_search(query: String) : many (course: Subject)
  where query is not empty. Answers every course whose name, description or course Id contains query, ignoring case.

_catalog() : one (catalog: Catalog)
  Answers the prerequisites, corequisites, terms, offering status, and technical flags of all courses, so other concepts can use them without reading this concept's state.

_schedule(course: Subject) : one (found: Boolean, units: String, meetingTimes: String, location: String)
  where course is in Courses. If course has meetingTimes (is not empty/null), answers found = true with its units, meeting times, and location; otherwise answers found = false.
```