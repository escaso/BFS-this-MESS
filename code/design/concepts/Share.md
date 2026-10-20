# Share

## Purpose

Allow students to share their course plans with advisors or other students.

## Principle

A student who creates a road owns it. They share it with an advisor, who can then view the road's constraints and the course plans generated from them, and who always sees the road as it currently is. The advisor can look but not change anything. Later the student stops sharing the road, and the advisor can no longer see it.

## Types

```types
external Road
  The road we are referring to.

external User
  A user of the application.
```

## State

```state
a set of Accesses with
  a unique Road
  an owner User
  an accessList set of User
  Rule: A road has at most one Access. A road with no Access has no owner, and nobody can view it.
  Rule: owner is the user who created the road. Ownership is never transferred.
  Rule: accessList is the set of users, other than the owner, who may view the road and the plans found for it. Being in accessList allows viewing only: it never allows changing the road or changing who it is shared with.
```

## Actions

```actions
claim(road: Road, user: User) : returns ()
  where road already has an owner
  then
    refuses ROAD_ALREADY_OWNED "This road already has an owner."
  where road has no owner
  then
    create an Access for road with user as its owner and an empty accessList
    returns

release(road: Road) : returns ()
  where road has no owner
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where road has an owner
  then
    delete the Access of road, so that nobody owns it or can view it
    returns

share(road: Road, requester: User, user: User) : returns ()
  where road has no owner
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where road has an owner and requester is not the owner of road
  then
    refuses NOT_AN_OWNER "Only the owner can share this road."
  where requester is the owner of road and user is the owner of road
  then
    refuses SHARE_WITH_OWNER "The owner already has access to this road."
  where requester is the owner of road and user is not the owner of road
  then
    add user to the accessList of road if it is not already there
    returns

unshare(road: Road, requester: User, user: User) : returns ()
  where road has no owner
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where road has an owner and requester is not the owner of road
  then
    refuses NOT_AN_OWNER "Only the owner can change who a road is shared with."
  where requester is the owner of road and user is not in the accessList of road
  then
    refuses NOT_SHARED "That road is not shared with that user."
  where requester is the owner of road and user is in the accessList of road
  then
    remove user from the accessList of road
    returns
```

## Queries

```queries
_canView(road: Road, user: User) : one (allowed: Flag)
  Answers true if road has an owner and user is the owner of road or is in the accessList of road, otherwise false. A road with no owner answers false for everyone.

_isOwner(road: Road, user: User) : one (owner: Flag)
  Answers true if road has an owner and user is the owner of road, otherwise false.

_roadsOwnedBy(user: User) : many (road: Road)
  Answers every road that user owns, or no rows if there are none.

_roadsSharedWith(user: User) : many (road: Road)
  Answers every road that has user in its accessList, or no rows if there are none.

_viewers(road: Road) : many (user: User)
  where road has an owner. Answers every user in the accessList of road, or no rows if there are none.
```