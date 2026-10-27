# Share

## Purpose

Allow students to share their course plans with advisors or other students, letting some of them only look and others help edit.

## Principle

A student who creates a road owns it. They share it with an advisor as a viewer, who can then view the road's constraints and the course plans generated from them, always as the road currently is, but cannot change anything. Later the student makes the advisor an editor, so the advisor can change the road too; as an editor the advisor may in turn share it with others, but only as viewers, and sees only the people they added. The student can instead turn on a link for viewers or for editors: anyone signed in who opens it gets that access. Regenerating the link makes the old one stop working. Finally the student stops sharing the road with someone, and that person can no longer see it.

## Types

```types
external Road
  The road we are referring to.

external User
  A user of the application.

Role is VIEW or EDIT
  VIEW: may look at the road and the plans found for it. EDIT: may also change the road's content and share it with viewers.

Access is OWNER or EDIT or VIEW or NONE
  How a user may use a road: as its owner, as an editor, as a viewer, or not at all.
```

## State

```state
a set of Accesses with
  a unique Road
  an owner User
  Rule: A road has at most one Access. A road with no Access has no owner, and nobody can view it.
  Rule: owner is the user who created the road. Ownership is never transferred, and the owner never has a Grant.

a set of Grants with
  a Road
  a User
  a role Role
  an addedBy User
  unique road and user
  Rule: A Grant lets its user use the road with its role. addedBy is who gave it: the owner, or an editor who added a viewer. Someone who joins through a link counts as added by the owner.
  Rule: An Access made before Grants existed has a plain list of users instead; each of them counts as a Grant with role VIEW added by the owner.

a set of Links with
  a Road
  a role Role
  a token String
  an enabled Flag
  unique road and role
  unique token
  Rule: A road has at most one link for each role. token is a random value of at least 128 bits that cannot be guessed. A link that is not enabled admits nobody. Disabling or regenerating a link does not remove anyone who already joined through it.

Rule: A road's Grants and Links exist only while it has an Access.
Rule: access(road, user) is OWNER if user is the owner of road, the role of user's Grant if there is one, and NONE otherwise (also for a road with no Access).
Rule: ownerVisible(road, user) holds when user is the owner, an editor, or a viewer added by the owner. A viewer added by an editor does not learn who owns the road.
```

## Actions

```actions
claim(road: Road, user: User) : returns ()
  where road already has an owner
  then
    refuses ROAD_ALREADY_OWNED "This road already has an owner."
  where road has no owner
  then
    create an Access for road with user as its owner, no Grants and no Links
    returns

release(road: Road) : returns ()
  where road has no owner
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where road has an owner
  then
    delete the Access of road, with its Grants and Links, so that nobody owns it or can view it
    returns

share(road: Road, requester: User, user: User, role: Role) : returns ()
  where access(road, requester) is NONE
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where access(road, requester) is VIEW
  then
    refuses NOT_AN_EDITOR "You can only view this road."
  where access(road, requester) is OWNER or EDIT and role is not VIEW or EDIT
  then
    refuses BAD_ROLE "A role must be view or edit."
  where access(road, requester) is EDIT and role is EDIT
  then
    refuses EDITORS_ADD_VIEWERS "Editors can only add viewers."
  where access(road, requester) is OWNER and user is the owner
  then
    refuses SHARE_WITH_OWNER "The owner already has access to this road."
  where access(road, requester) is OWNER and user is not the owner
  then
    if user has a Grant, set its role to role (a change of role); otherwise create a Grant for user with this role, added by requester
    returns
  where access(road, requester) is EDIT and role is VIEW
  then
    if user is the owner or already has a Grant, change nothing, so that an editor does not learn who else has access; otherwise create a Grant for user with role VIEW, added by requester
    returns

setRole(road: Road, requester: User, user: User, role: Role) : returns ()
  where access(road, requester) is NONE
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where access(road, requester) is EDIT or VIEW
  then
    refuses NOT_AN_OWNER "Only the owner can change who a road is shared with."
  where access(road, requester) is OWNER and role is not VIEW or EDIT
  then
    refuses BAD_ROLE "A role must be view or edit."
  where access(road, requester) is OWNER and user has no Grant
  then
    refuses NOT_SHARED "That road is not shared with that user."
  where access(road, requester) is OWNER and user has a Grant
  then
    set the role of user's Grant to role
    returns

unshare(road: Road, requester: User, user: User) : returns ()
  where access(road, requester) is NONE
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where access(road, requester) is EDIT or VIEW
  then
    refuses NOT_AN_OWNER "Only the owner can change who a road is shared with."
  where access(road, requester) is OWNER and user has no Grant
  then
    refuses NOT_SHARED "That road is not shared with that user."
  where access(road, requester) is OWNER and user has a Grant
  then
    delete user's Grant
    returns

enableLink(road: Road, requester: User, role: Role) : returns ()
  where access(road, requester) is NONE
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where access(road, requester) is EDIT or VIEW
  then
    refuses NOT_AN_OWNER "Only the owner can manage this road's links."
  where access(road, requester) is OWNER and role is not VIEW or EDIT
  then
    refuses BAD_ROLE "A role must be view or edit."
  where access(road, requester) is OWNER and role is VIEW or EDIT
  then
    enable the link of road for role, creating it with a new token if there is none
    returns

disableLink(road: Road, requester: User, role: Role) : returns ()
  where access(road, requester) is NONE
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where access(road, requester) is EDIT or VIEW
  then
    refuses NOT_AN_OWNER "Only the owner can manage this road's links."
  where access(road, requester) is OWNER and role is not VIEW or EDIT
  then
    refuses BAD_ROLE "A role must be view or edit."
  where access(road, requester) is OWNER and role is VIEW or EDIT
  then
    disable the link of road for role if there is one
    returns

regenerateLink(road: Road, requester: User, role: Role) : returns ()
  where access(road, requester) is NONE
  then
    refuses NO_SUCH_ROAD "There is no such road."
  where access(road, requester) is EDIT or VIEW
  then
    refuses NOT_AN_OWNER "Only the owner can manage this road's links."
  where access(road, requester) is OWNER and role is not VIEW or EDIT
  then
    refuses BAD_ROLE "A role must be view or edit."
  where access(road, requester) is OWNER and role is VIEW or EDIT
  then
    give the link of road for role a new token, so that the old one admits nobody, keeping whether it is enabled; if there is no such link, create one, not enabled
    returns

join(token: String, user: User) : returns (road: Road)
  where no enabled link has token
  then
    refuses INVALID_LINK "This link is no longer valid."
  where an enabled link of road has token and user is the owner of road
  then
    returns road
  where an enabled link of road has token and user has a Grant for road
  then
    if the link's role is EDIT, set the Grant's role to EDIT (a link never lowers a role); set its addedBy to the owner
    returns road
  where an enabled link of road has token and user is neither the owner nor has a Grant
  then
    create a Grant for user with the link's role, added by the owner
    returns road
```

## Queries

```queries
_canView(road: Road, user: User) : one (allowed: Flag)
  Answers true if access(road, user) is not NONE, otherwise false. A road with no owner answers false for everyone.

_canEdit(road: Road, user: User) : one (allowed: Flag)
  Answers true if access(road, user) is OWNER or EDIT, otherwise false.

_isOwner(road: Road, user: User) : one (owner: Flag)
  Answers true if road has an owner and user is the owner of road, otherwise false.

_role(road: Road, user: User) : one (role: Access)
  Answers access(road, user).

_roadsOwnedBy(user: User) : many (road: Road)
  Answers every road that user owns, or no rows if there are none.

_roadsSharedWith(user: User) : many (road: Road, role: Role)
  Answers every road that user has a Grant for, with its role, or no rows if there are none.

_grantsVisibleTo(road: Road, requester: User) : many (user: User, role: Role, addedBy: User)
  Answers the Grants of road that requester may see: all of them if requester is the owner, the ones requester added if requester is an editor, and no rows otherwise.

_ownerVisibleTo(road: Road, user: User) : optional (owner: User)
  Answers the owner of road if ownerVisible(road, user) holds, or no row otherwise (also for a road with no owner).

_ownerOf(road: Road) : optional (owner: User)
  Answers the owner of road, or no row if it has none. It is for working things out on the owner's behalf, such as the hours of a plan against the owner's week; an application shows the owner only where _ownerVisibleTo answers.

_known(road: Road, requester: User, user: User) : one (known: Flag)
  Answers true if user is the owner of road or is requester, or if requester is the owner and user has a Grant, or if requester is an editor and user has a Grant added by requester; otherwise false. It says whether requester already knows that user has access, so that a list of people to add can leave them out without showing anyone else.

_links(road: Road, requester: User) : many (role: Role, token: String, enabled: Flag)
  Answers the links of road if requester is its owner, or no rows otherwise.
```
