# BFSThisMess

BFSThisMess composes Authentication, CourseOffering, Constrain and Share. Every request except registering and logging in carries a session; the session is resolved to a user with Authentication._authenticate, and a request whose session is not valid is rejected.

## Accounts

A person [registers](reaction:BFSThisMess.Register) with a username and password (Authentication.register), then [logs in](reaction:BFSThisMess.Login) to get a session (Authentication.login). They can later [log out](reaction:BFSThisMess.Logout) to end it (Authentication.logout).

```endpoints
BFSThisMess.Register at /bfsthismess/register
BFSThisMess.Login at /bfsthismess/login
BFSThisMess.Logout at /bfsthismess/logout
```

## Catalog

A logged-in user [loads the catalog](reaction:BFSThisMess.LoadCatalog) from the MIT Subject Listing and the Subject Evaluation Reports by giving both URLs (CourseOffering.load).

A logged-in user can [search subjects](reaction:BFSThisMess.SearchSubjects) (CourseOffering._search), and for a subject they can [see its ratings](reaction:BFSThisMess.ViewRatings) (CourseOffering._ratings) and [its schedule](reaction:BFSThisMess.ViewSchedule) (CourseOffering._schedule).

```endpoints
BFSThisMess.LoadCatalog at /bfsthismess/loadCatalog
BFSThisMess.SearchSubjects at /bfsthismess/searchSubjects
BFSThisMess.ViewRatings at /bfsthismess/viewRatings
BFSThisMess.ViewSchedule at /bfsthismess/viewSchedule
```

## Roads

A student [creates a road](reaction:BFSThisMess.NewRoad) with a name and major (Constrain.newRoad) and becomes its owner (Share.claim with the new road and the authenticated user).

The owner of a road can [change its major](reaction:BFSThisMess.SetMajor), [add](reaction:BFSThisMess.AddRequirement) or [remove](reaction:BFSThisMess.RemoveRequirement) a required subject, [add](reaction:BFSThisMess.AddElectiveBlock) or [remove](reaction:BFSThisMess.RemoveElectiveBlock) an elective block, [pin](reaction:BFSThisMess.Pin) or [unpin](reaction:BFSThisMess.UnPin) a subject to a semester, [set a cap](reaction:BFSThisMess.SetCap) on subjects per semester, and [lock semesters](reaction:BFSThisMess.LockThroughSemester) so the past is recorded. These call the Constrain actions of the same names, and are only allowed when Share._isOwner answers true for the authenticated user and the road.

```endpoints
BFSThisMess.NewRoad at /bfsthismess/newRoad
BFSThisMess.SetMajor at /bfsthismess/setMajor
BFSThisMess.AddRequirement at /bfsthismess/addRequirement
BFSThisMess.RemoveRequirement at /bfsthismess/removeRequirement
BFSThisMess.AddElectiveBlock at /bfsthismess/addElectiveBlock
BFSThisMess.RemoveElectiveBlock at /bfsthismess/removeElectiveBlock
BFSThisMess.Pin at /bfsthismess/pin
BFSThisMess.UnPin at /bfsthismess/unPin
BFSThisMess.SetCap at /bfsthismess/setCap
BFSThisMess.LockThroughSemester at /bfsthismess/lockThroughSemester
```

## Paths and viewing

A user can [find the shortest paths](reaction:BFSThisMess.FindPaths) for a road they can view (Share._canView), giving a limit of at most that many plans. The catalog is taken from CourseOffering._catalog and passed to Constrain._findPath together with the road and the limit, and each plan found is returned.

A user can [view a road](reaction:BFSThisMess.ViewRoad) they can view (Share._canView) to see its constraints (Constrain._constraints) together with its paths, found the same way as in FindPaths.

```endpoints
BFSThisMess.FindPaths at /bfsthismess/findPaths
BFSThisMess.ViewRoad at /bfsthismess/viewRoad
```

## Sharing

The owner of a road can [share it](reaction:BFSThisMess.ShareRoad) with an advisor or another student by their username (Share.share, with the authenticated user as requester). The person it is shared with can then find paths for it and view it, but cannot change its constraints.

```endpoints
BFSThisMess.ShareRoad at /bfsthismess/shareRoad
```