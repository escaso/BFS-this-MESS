# Requirements

## Purpose

Hold the degree requirements of each major and of the General Institute Requirements (GIRs), so that a student can pick their major instead of typing its requirements, and choose between the alternatives a major offers (such as tracks).

## Principle

Once a semester, the maintainer builds a snapshot of the requirement lists (taken from [Fireroad](https://github.com/sipb/fireroad-server), which encodes MIT's degree charts) and loads it. A student who is planning a road picks the 6-3 major. The requirements of 6-3 and of the GIRs are then known as blocks, each asking for some number of subjects from a list of options. Where 6-3 offers a choice, such as which tracks to take subjects from, the first alternatives are assumed until the student chooses others for that road. Some subjects count toward several requirements: a GIR subject can also meet a requirement of the major, and so can a communication-intensive subject of the major, but two other requirements of the major ask for different subjects. What cannot be said as a block, such as "2 history subjects", is kept as a note that is shown but not planned.

## Types

```types
external Subject
  The generic type for a course/subject.

external Road
  The plan a student's choices belong to. Requirements only uses its identity.

ListKind is MAJOR or GIRS
  A list is the requirements of a major, or the General Institute Requirements that every bachelor's degree adds.

ItemKind is BLOCK or CHOICE or GROUP or NOTE
  BLOCK: at least count distinct subjects from options. CHOICE: the student takes count of its alternatives, each a GROUP. GROUP: items taken together (a heading, or an alternative of a CHOICE). NOTE: a requirement that is shown but not planned.
```

## State

```state
a set of Lists with
  a unique id String
  a title String
  a shortTitle String
  a mediumTitle String
  a kind ListKind

a set of Items with
  a unique key String
  a List
  an optional parent Item
  a kind ItemKind
  a title String
  a count Number
  an options set of Subject
  an approximate Flag
  a technical Flag
  an overlay Flag
  an order Number

a set of Selections with
  a Road
  a choice Item
  an alternatives seq of Item
  unique road and choice

a Catalog with
  an optional snapshot String

Rule: id is Fireroad's list id, e.g. "major6-3" or "girs". shortTitle is e.g. "6-3"; title is e.g. "Bachelor of Science in Computer Science and Engineering".
Rule: The items of a list form a tree through parent; order orders them depth first, so a parent comes before its children and siblings keep the order of the degree chart. A top-level item has no parent.
Rule: The children of a CHOICE are GROUPs (its alternatives). A GROUP has a CHOICE, a GROUP or nothing as its parent; any other item has a GROUP or nothing. Only BLOCKs and NOTEs have options. A BLOCK or a CHOICE has a count of at least 1, a BLOCK has at least count options, and a GROUP has a count of 0.
Rule: approximate means the block says less than the degree chart (e.g. "36 units" read as 3 subjects, or a pair of subjects that must be taken together read as two options). A NOTE with options is an optional requirement that only counts toward its parent; a NOTE without options is free text.
Rule: technical holds for the items of a major and not for those of the GIRs.
Rule: overlay holds for a top-level BLOCK of a major that a subject may meet while it also meets another requirement of the major: communication-intensive (CI-M) and independent inquiry requirements. It is false for every other item.
Rule: group(item) is the key of item when its list is the GIRs or item is an overlay, and the id of its list otherwise. Subjects counted toward the blocks of one group are distinct; a subject may count again in another group.
Rule: active(road, list) is every item of the list that is not inside an alternative the road has not taken. A CHOICE that has no Selection for road takes its first count alternatives in order.
Rule: alternatives holds at most count of the children of choice, in the order they were chosen.
Rule: snapshot is the id of the last snapshot loaded, so that the same snapshot is not loaded twice. Whoever loads a snapshot may make its id include a digest of its contents, so that a snapshot edited under the same id is loaded again.
```

## Actions

```actions
load(snapshot: String) : returns (count: Number)
  where snapshot can be parsed as a requirements snapshot: an id, a list of lists, and a list of items whose parents are items of the same list and whose kinds, counts and options satisfy the state rules
  then
    replace Lists and Items with those of the snapshot
    delete every Selection whose choice or one of whose alternatives is no longer an item, or no longer a CHOICE or its child
    set the snapshot of Catalog to the id of the snapshot
    count is the number of lists in the snapshot
    returns count
  where snapshot cannot be parsed as a requirements snapshot
  then
    refuses LOAD_FAILED "The requirements snapshot could not be parsed."

choose(road: Road, choice: Item, alternative: Item) : returns ()
  where choice is not a CHOICE
  then
    refuses NO_SUCH_CHOICE "There is no such choice."
  where choice is a CHOICE and alternative is not one of its children
  then
    refuses NOT_AN_ALTERNATIVE "That is not one of the alternatives of this choice."
  where choice is a CHOICE and alternative is one of its children
  then
    if road has no Selection for choice, create one whose alternatives are the first count children of choice
    if alternative is not in the alternatives of that Selection, append it, then remove the earliest alternatives until there are at most count
    returns

copyChoices(from: Road, to: Road) : returns ()
  where true
  then
    delete every Selection of to, then give to a copy of each Selection of from, with the same choice and alternatives
    returns

forget(road: Road) : returns ()
  where true
  then
    delete every Selection of road
    returns
```

## Queries

```queries
_loadedSnapshot() : one (found: Flag, id: String)
  If a snapshot has been loaded, answers found = true with the id of the last one; otherwise answers found = false and an empty id.

_lists() : many (list: String, title: String, shortTitle: String, mediumTitle: String, kind: ListKind)
  Answers every list, majors in order of their short title with numbers compared as numbers, then the GIRs; or no rows if none has been loaded.

_list(list: String) : one (found: Flag, title: String, shortTitle: String, mediumTitle: String, kind: ListKind)
  If list is the id of a List, answers found = true with its titles and kind; otherwise answers found = false, empty titles and kind MAJOR.

_activeBlocks(list: String, road: Road) : many (item: Item, title: String, count: Number, technical: Flag, group: String)
  Answers every BLOCK in active(road, list), in order, with group(item), or no rows if list is not a List.

_options(item: Item) : many (subject: Subject)
  Answers each option of item, in the order of the snapshot, or no rows if item is not an Item or has none.

_outline(list: String, road: Road) : many (item: Item, parent: String, depth: Number, kind: ItemKind, title: String, count: Number, approximate: Flag, active: Flag, chosen: Flag)
  Answers every item of list in order. parent is the key of its parent, or empty at the top level; depth is 0 at the top level. active says whether the item is in active(road, list); chosen says, for a child of a CHOICE, whether road takes it. Answers no rows if list is not a List.
```
