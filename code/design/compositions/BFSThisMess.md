# BFSThisMess

Someone [loads the catalog](reaction:BFSThisMess.LoadCatalog) from the MIT Subject Listing and the Subject Evaluation Reports.

```endpoints
BFSThisMess.LoadCatalog at /bfsthismess/loadCatalog
```

A student [creates a road](reaction:BFSThisMess.NewRoad) and becomes its owner. They can [find the shortest paths](reaction:BFSThisMess.FindPaths) for a road they can view, and [view a road](reaction:BFSThisMess.ViewRoad) to see its constraints together with its paths.

```endpoints
BFSThisMess.NewRoad at /bfsthismess/newRoad
BFSThisMess.FindPaths at /bfsthismess/findPaths
BFSThisMess.ViewRoad at /bfsthismess/viewRoad
```

The owner of a road can [share it](reaction:BFSThisMess.ShareRoad) with an advisor.

```endpoints
BFSThisMess.ShareRoad at /bfsthismess/shareRoad
```