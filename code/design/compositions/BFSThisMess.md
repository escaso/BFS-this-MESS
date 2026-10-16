# BFSThisMess

BFSThisMess composes CourseOffering and Constrain. This MVP has no authentication and no sharing: anyone with a road id can read or edit that road.

## Catalog

Someone [loads the catalog](reaction:BFSThisMess.LoadCatalog) from the MIT Subject Listing and the Subject Evaluation Reports by giving both URLs (CourseOffering.load).

They can [search subjects](reaction:BFSThisMess.SearchSubjects) (CourseOffering._search), which answers [the matching courses](former:BFSThisMess.MatchingCourses). For a subject they can [see its ratings](reaction:BFSThisMess.ViewRatings) (CourseOffering._ratings), shown as [the ratings of a course](former:BFSThisMess.CourseRatings), and [its schedule](reaction:BFSThisMess.ViewSchedule) (CourseOffering._schedule), shown as [the schedule of a course](former:BFSThisMess.CourseSchedule).

```endpoints
BFSThisMess.LoadCatalog at /bfsthismess/loadCatalog
BFSThisMess.SearchSubjects at /bfsthismess/searchSubjects
BFSThisMess.ViewRatings at /bfsthismess/viewRatings
BFSThisMess.ViewSchedule at /bfsthismess/viewSchedule
```

## Roads

A student [creates a road](reaction:BFSThisMess.NewRoad) with a name and major (Constrain.newRoad).

They can [change its major](reaction:BFSThisMess.SetMajor), [add](reaction:BFSThisMess.AddRequirement) or [remove](reaction:BFSThisMess.RemoveRequirement) a required subject, [add](reaction:BFSThisMess.AddElectiveBlock) or [remove](reaction:BFSThisMess.RemoveElectiveBlock) an elective block, [pin](reaction:BFSThisMess.Pin) or [unpin](reaction:BFSThisMess.UnPin) a subject to a semester, [set a cap](reaction:BFSThisMess.SetCap) on subjects per semester, and [lock semesters](reaction:BFSThisMess.LockThroughSemester) so the past is recorded. These call the Constrain actions of the same names.

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

Someone can [find the shortest paths](reaction:BFSThisMess.FindPaths) for a road, giving a limit of at most that many plans. The catalog is taken from CourseOffering._catalog and [the paths of the road](former:BFSThisMess.RoadPaths) are found by passing it to Constrain._findPath together with the road and the limit, as [the paths of a road for a catalog](former:BFSThisMess.PathsForCatalog).

Someone can [view a road](reaction:BFSThisMess.ViewRoad) to see [its constraints](former:BFSThisMess.RoadConstraints) (Constrain._constraints) together with its paths, found the same way as in FindPaths.

```endpoints
BFSThisMess.FindPaths at /bfsthismess/findPaths
BFSThisMess.ViewRoad at /bfsthismess/viewRoad
```