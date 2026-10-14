# Constrain

## Purpose

Maintain the set of constraints that a user wants their course plans to satisfy, including major requirements, elective blocks, credit/course caps, and historical timeline locks.

## Principle

A user creates a road and adds constraints to it, such as a specific subject in a specific semester, or capping every semester at 4 subjects. They can later relax or remove a constraint to widen the set of valid plans. Possible plans can be found by checking against the constraints of the road to determine whether it is valid. The student's past is expressed the same way: a subject already taken is pinned to the semester it was taken in, and those past semesters are locked so that nothing else can be added to them.

## Types

```types
external Subject
  The generic type for a course/subject.

opaque SubjectSet
  A set of subjects.

opaque SubjectSetSet
  A set of sets of subjects, such as the elective blocks of a road.

opaque PinSet
  A set of pins, each a subject together with the semester it is pinned to.

opaque Plan
  A list of sets of subjects, one per semester, where the k-th set (counting from 0) is semester k.

opaque Catalog
  The prerequisites, corequisites, semesters offered and technical flags of the subjects, as answered by CourseOffering._catalog.

Boolean is TRUE or FALSE
  Whether something is the case.
```

## State

```state
a set of Roads with
  a name String
  a major String
  a required set of Subject
  a maxPerSemester Number
  a maxTechnicalPerSemester Number
  a lockedThrough Number

a set of ElectiveBlocks with
  a Road
  an options set of Subject

a set of Pins with
  a Road
  a Subject
  a semester Number

Rule: major is e.g. "6-3" or "2-A". required subjects must be taken at some point. Each ElectiveBlock belongs to a road, and one subject must be taken from each block of that road. Each Pin belongs to a road.
Rule: maxPerSemester and maxTechnicalPerSemester: 0 means no cap.
Rule: lockedThrough: semesters 0 up to and including lockedThrough are locked; 0 means only the incoming-credit semester is locked.
Rule: A pin's semester is 0 for incoming credit, 1 for the first Fall, and so on. Semesters are numbered along the student's timeline: semester 1 is the first Fall at MIT, so odd numbers are Fall and even numbers are Spring.
Rule: A plan is a list of sets of subjects, one per semester, where the k-th set (counting from 0) is semester k.
Rule: A pinned subject must appear in every valid plan, whether or not it is also required. A locked semester contains exactly the subjects pinned to it, no more and no fewer; it is how history is recorded.
```

## Actions

```actions
newRoad(name: String, major: String) : returns (road: Road)
  where name is not empty
  then
    create a new road with this name, the specified major, no constraints, maxPerSemester set to 0, maxTechnicalPerSemester set to 0, and lockedThrough set to 0
    returns road

setMajor(road: Road, major: String) : returns ()
  where road exists and major is not empty
  then
    update the major attribute of road to reflect new degree requirements
    returns

addRequirement(road: Road, subject: Subject) : returns ()
  where road exists
  then
    add subject to the required subjects of road
    returns

removeRequirement(road: Road, subject: Subject) : returns ()
  where road exists and subject a requirement
  then
    remove subject from requirements
    returns

addElectiveBlock(road: Road, options: SubjectSet) : returns ()
  where road exists and options is not empty
  then
    add options to the elective blocks of road
    returns

removeElectiveBlock(road: Road, options: SubjectSet) : returns ()
  where road exists and options is an elective block of road
  then
    remove options from the elective blocks of road
    returns

pin(road: Road, subject: Subject, semester: Number) : returns ()
  where road exists and semester is at least 0
  then
    if a pin for subject exists in road, set its semester to the given semester, otherwise create a new pin for subject with this semester and add it to road
    returns

unPin(road: Road, subject: Subject) : returns ()
  where road exists and a pin for subject exists in road
  then
    remove the pin from road and delete it
    returns

setCap(road: Road, capType: String, limit: Number) : returns ()
  where road exists, limit is at least 0, and capType is either "total" or "technical"
  then
    if capType is "total", set maxPerSemester to limit; if capType is "technical", set maxTechnicalPerSemester to limit (0 removes the respective cap)
    returns

lockThroughSemester(road: Road, semester: Number) : returns ()
  where road exists and semester is at least 0
  then
    set the lockedThrough of road to semester
    semesters 0 through semester now contain exactly their pinned subjects (a locked semester with no pins is empty)
    returns
```

## Queries

```queries
_constraints(road: Road) : one (required: SubjectSet, elective_blocks: SubjectSetSet, pins: PinSet, maxPerSemester: Number, maxTechnicalPerSemester: Number, lockedThrough: Number)
  where road exists. Answers the constraints currently stored for road.

_satisfies(road: Road, plan: Plan, technical: SubjectSet) : one (satisfied: Boolean)
  where road exists. Answers true if (the k-th set of plan, counting from 0, is semester k): every required subject appears in some set of plan, at least one subject of every elective block appears in some set of plan, every pin in road has its subject in the set of plan at the pin's semester, every locked semester (0 through lockedThrough) contains exactly the subjects pinned to it, and, for the semesters after lockedThrough, if maxPerSemester is not 0, no set has more than maxPerSemester subjects, and if maxTechnicalPerSemester is not 0, no set has more than maxTechnicalPerSemester subjects that are in technical. Otherwise answers false. (Caps are not applied to locked semesters, since history is a fact and not a choice.)

_findPath(road: Road, catalog: Catalog, limit: Number) : many (plan: Plan)
  where road exists, limit is at least 1, and catalog holds the prerequisites, corequisites, semesters offered and technical flags of the subjects (as returned by CourseOffering._catalog). Answers the shortest possible plans that satisfy the constraints of road, at most limit of them, one row per plan. Each plan is a list of sets of subjects, one set per semester, starting at semester 0, so the locked semesters appear first exactly as pinned and only the semesters after lockedThrough are chosen by the search. If no valid plan exists, answers no rows.
```