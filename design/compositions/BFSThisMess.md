# BFSThisMess

BFSThisMess composes Authentication, Share, CourseOffering and Constrain. Every request about a road carries the requester's session. The session is resolved to a user (Authentication._authenticate), and Share decides what that user may do with the road:

| Who | Can view the road and its paths | Can change the road | Can share or unshare it |
| --- | --- | --- | --- |
| The owner (Share._isOwner) | yes | yes | yes |
| Someone it is shared with (Share._canView) | yes | no | no |
| Anyone else | no | no | no |

A request that fails its check changes nothing and is refused. The checks run in this order, and the first to fail decides the refusal:

1. No valid session is refused with NO_SUCH_SESSION.
2. A road that does not exist, or that the requester may not view (not its owner and not someone it is shared with), is refused with NO_SUCH_ROAD, whatever the request was. The two cases are indistinguishable, so that a person cannot find out which roads other people have.
3. A change, share, unshare or sharing list requested by someone who may view the road but is not its owner is refused with NOT_AN_OWNER.

The same rule holds for blocks: a block that does not exist, or whose road the requester may not view, is refused with NO_SUCH_BLOCK.

The catalog is public MIT data. Searching it and looking up ratings and schedules need no session.

## Accounts

Someone [registers](reaction:BFSThisMess.Register) with a username and password (Authentication.register), then [logs in](reaction:BFSThisMess.LogIn) (Authentication.login), which answers a session that they send with every later request. They [log out](reaction:BFSThisMess.LogOut) with that session (Authentication.logout).

```endpoints
BFSThisMess.Register at /bfsthismess/register
BFSThisMess.LogIn at /bfsthismess/logIn
BFSThisMess.LogOut at /bfsthismess/logOut
```

## Catalog

A signed-in person [loads the catalog](reaction:BFSThisMess.LoadCatalog) from the MIT Subject Listing and the Subject Evaluation Reports by giving both URLs (CourseOffering.load). Any signed-in person may do this; an administrator role is left for later. Because the catalog is shared by everyone and the server fetches the URLs it is given, the listing URL must be on student.mit.edu and the ratings URL on eduapps.mit.edu, both over https. A request with any other URL is refused with BAD_SOURCE "Catalog sources must be the MIT Subject Listing and Subject Evaluation Reports sites." and nothing is loaded. The URLs are checked with [catalogSources](computation:catalogSources).

```computations
catalogSources(subjectListingURL: String, ratingsURL: String) : Record
  Answers trusted = true when subjectListingURL is an https URL on student.mit.edu and ratingsURL is an https URL on eduapps.mit.edu, and trusted = false otherwise, including when either is not a valid URL.
```

Anyone can [search subjects](reaction:BFSThisMess.SearchSubjects) (CourseOffering._search), which answers [the matching courses](former:BFSThisMess.MatchingCourses). For a subject they can [see its ratings](reaction:BFSThisMess.ViewRatings) (CourseOffering._ratings), shown as [the ratings of a course](former:BFSThisMess.CourseRatings), and [its schedule](reaction:BFSThisMess.ViewSchedule) (CourseOffering._schedule), shown as [the schedule of a course](former:BFSThisMess.CourseSchedule).

```endpoints
BFSThisMess.LoadCatalog at /bfsthismess/loadCatalog
BFSThisMess.SearchSubjects at /bfsthismess/searchSubjects
BFSThisMess.ViewRatings at /bfsthismess/viewRatings
BFSThisMess.ViewSchedule at /bfsthismess/viewSchedule
```

## Roads

A signed-in student [creates a road](reaction:BFSThisMess.NewRoad) with a name, major and start (Constrain.newRoad), and in the same request becomes its owner (Share.claim). A request without a valid session [does not create a road](reaction:BFSThisMess.NewRoadWithoutSession) and is refused with NO_SUCH_SESSION. If the claim is refused, the request is refused with the reason of the claim and [the new road is deleted](reaction:BFSThisMess.DeleteUnclaimedRoad) (Constrain.deleteRoad), so a road never exists without an owner. Claiming and releasing are steps of NewRoad and DeleteRoad. They have no endpoints of their own, so nobody can claim or release a road directly.

Only the owner can change a road. They can [rename it](reaction:BFSThisMess.RenameRoad), [move its start](reaction:BFSThisMess.SetStart) or [its end](reaction:BFSThisMess.SetEnd), [change its major](reaction:BFSThisMess.SetMajor), [add](reaction:BFSThisMess.AddPrior) or [remove](reaction:BFSThisMess.RemovePrior) prior credit, [pin](reaction:BFSThisMess.Pin) or [unpin](reaction:BFSThisMess.UnPin) a subject to a semester, [lock or unlock a semester](reaction:BFSThisMess.SetLocked) so the past is recorded, [set](reaction:BFSThisMess.SetCap) or [clear](reaction:BFSThisMess.ClearCap) a cap on units in a semester, and [reset a semester](reaction:BFSThisMess.ResetSemester). Each of these checks Share._isOwner for the road and then calls the Constrain action of the same name.

They can also change the requirements of the road: [add a block](reaction:BFSThisMess.AddBlock), and [set its count](reaction:BFSThisMess.SetCount), [add an option](reaction:BFSThisMess.AddOption) to it or [remove an option](reaction:BFSThisMess.RemoveOption) from it, or [remove the block](reaction:BFSThisMess.RemoveBlock). These requests name a block and not a road, so the road is found with Constrain._roadOfBlock and then checked in the same way. A block that does not exist is refused with NO_SUCH_BLOCK.

The owner can [delete the road](reaction:BFSThisMess.DeleteRoad) (Constrain.deleteRoad). Afterwards [the road is released](reaction:BFSThisMess.ReleaseRoad) (Share.release), so a deleted road keeps no owner and no viewers.

The Constrain actions that keep subject facts up to date (setListing, addListingTerm, removeListingTerm, removeListing, addDependency, addDependencyOption, removeDependency, markCancelled and unmarkCancelled) have no endpoints. They are driven by CourseOffering.load and are not requested by users, so they need no check.

```endpoints
BFSThisMess.NewRoad at /bfsthismess/newRoad
BFSThisMess.NewRoadWithoutSession at /bfsthismess/newRoad
BFSThisMess.RenameRoad at /bfsthismess/renameRoad
BFSThisMess.DeleteRoad at /bfsthismess/deleteRoad
BFSThisMess.SetStart at /bfsthismess/setStart
BFSThisMess.SetEnd at /bfsthismess/setEnd
BFSThisMess.SetMajor at /bfsthismess/setMajor
BFSThisMess.AddPrior at /bfsthismess/addPrior
BFSThisMess.RemovePrior at /bfsthismess/removePrior
BFSThisMess.AddBlock at /bfsthismess/addBlock
BFSThisMess.SetCount at /bfsthismess/setCount
BFSThisMess.AddOption at /bfsthismess/addOption
BFSThisMess.RemoveOption at /bfsthismess/removeOption
BFSThisMess.RemoveBlock at /bfsthismess/removeBlock
BFSThisMess.Pin at /bfsthismess/pin
BFSThisMess.UnPin at /bfsthismess/unPin
BFSThisMess.SetLocked at /bfsthismess/setLocked
BFSThisMess.SetCap at /bfsthismess/setCap
BFSThisMess.ClearCap at /bfsthismess/clearCap
BFSThisMess.ResetSemester at /bfsthismess/resetSemester
```

## Sharing

The owner can [share a road](reaction:BFSThisMess.ShareRoad) with another person by giving their username. The username is turned into a user with Authentication._lookup, and then Share.share is called with the requester as the one asking. If nobody has that username, the request is refused with NO_SUCH_USER and nothing is shared. The owner can later [stop sharing](reaction:BFSThisMess.UnshareRoad) with someone in the same way (Share.unshare).

The owner can [see who a road is shared with](reaction:BFSThisMess.ViewSharing) (Share._viewers), shown as [the people a road is shared with](former:BFSThisMess.RoadViewers), which gives each username (Authentication._username).

```endpoints
BFSThisMess.ShareRoad at /bfsthismess/shareRoad
BFSThisMess.UnshareRoad at /bfsthismess/unshareRoad
BFSThisMess.ViewSharing at /bfsthismess/viewSharing
```

## Paths and viewing

A signed-in person can [list their roads](reaction:BFSThisMess.MyRoads): the roads they own (Share._roadsOwnedBy) and the roads shared with them (Share._roadsSharedWith), each shown with its name and major (Constrain._road) as [the roads of a user](former:BFSThisMess.UserRoads), so that an advisor can find every road shared with them.

Someone who may view a road (Share._canView) can [find the shortest paths](reaction:BFSThisMess.FindPaths) for it, giving whether to use IAP and summer semesters and a limit of at most that many plans. [The paths of the road](former:BFSThisMess.RoadPaths) are found with Constrain._findPath, given the road, that choice and the limit.

They can [view a road](reaction:BFSThisMess.ViewRoad) to see [its constraints](former:BFSThisMess.RoadConstraints), put together from Constrain._road, _prior, _blocks, _pins and _semesters, together with its paths, found the same way as in FindPaths. A person it is shared with sees exactly what the owner sees, as the road is now, but none of the requests that change it are open to them.

Four more requests only read a road, and each passes the same Share._canView check: they [list the options that still fit](reaction:BFSThisMess.ViewOptions), giving whether to include IAP and summer semesters (Constrain._options, shown as [the options of a road](former:BFSThisMess.RoadOptions)); [check the plan chosen so far](reaction:BFSThisMess.CheckPlan) (Constrain._satisfies, shown as [the verdict on a plan](former:BFSThisMess.PlanVerdict)); and [preview the pins lost](reaction:BFSThisMess.PreviewStartChange) by moving the start, or [by moving the end](reaction:BFSThisMess.PreviewEndChange), so that the student can be warned before they change it (Constrain._pinsLostBySetStart and _pinsLostBySetEnd, shown as [the pins lost by moving the start](former:BFSThisMess.PinsLostByStart) and [the pins lost by moving the end](former:BFSThisMess.PinsLostByEnd)). Previews change nothing, so they are open to anyone who may view the road.

```endpoints
BFSThisMess.MyRoads at /bfsthismess/myRoads
BFSThisMess.FindPaths at /bfsthismess/findPaths
BFSThisMess.ViewRoad at /bfsthismess/viewRoad
BFSThisMess.ViewOptions at /bfsthismess/viewOptions
BFSThisMess.CheckPlan at /bfsthismess/checkPlan
BFSThisMess.PreviewStartChange at /bfsthismess/previewStartChange
BFSThisMess.PreviewEndChange at /bfsthismess/previewEndChange
```