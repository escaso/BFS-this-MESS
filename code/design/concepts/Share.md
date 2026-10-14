# Share

## Purpose

Allow students to share their course plans with advisors or other students.

## Principle

A student can share a road so that another person can view its constraints and the course plans generated from them. The viewer always sees the current state of the road.

## Types

```types
external Road
  The road we are referring to.

external User
  A user of the application.

Boolean is TRUE or FALSE
  Whether something is the case.
```

## State

```state
a set of Accesses with
  an owner String
  an accessList set of String
  a Road

Rule: owner is the user who owns the road. accessList is the set of users who can access it.
```

## Actions

```actions
claim(road: Road, user: User) : returns ()
  where road has no owner
  then
    set user as the owner of road
    returns

share(road: Road, requester: User, user: String) : returns ()
  where road exists, requester is the owner of road, and user is not empty
  then
    add user to the set of users who can access road and its associated course plans
    returns
```

## Queries

```queries
_canView(road: Road, user: User) : one (allowed: Boolean)
  Answers true if user is the owner of road or is in the accessList of road, otherwise false.

_isOwner(road: Road, user: User) : one (owner: Boolean)
  Answers true if user is the owner of road, otherwise false.
```