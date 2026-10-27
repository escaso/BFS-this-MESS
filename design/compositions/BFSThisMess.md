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

The catalog is loaded from a snapshot file, catalog/snapshot.json, that the maintainer builds once a semester from Fireroad and commits. When the server starts, it loads the snapshot (CourseOffering.load) unless Constrain._loadedCatalog already has its id together with a digest of the file (so an edited file is loaded again even under the same id), and copies each subject's facts into Constrain: its listing (Constrain.removeListing, setListing, setPopularity from the subject's usual enrollment, and addListingTerm), its prerequisites and corequisites (Constrain.addDependency and addDependencyOption, the same groups CourseOffering._prerequisites and _corequisites answer) and its cancellations (Constrain.markCancelled, from CourseOffering._cancellations). Once every subject is copied, it marks the snapshot, with that digest, in Constrain (Constrain.markCatalog), so a server stopped partway through the copy (a restart or a redeploy) loads and copies the whole snapshot again on its next start. It also copies into TimeBudget what the catalog says about the time each subject takes (TimeBudget.setClass): its schedule, read from Fireroad's schedule text into parts, sections and meetings and kept with the season the snapshot's schedules are for, the hours a week in and out of class from subject evaluations, and its lecture plus lab and design units. Units are the total units of the subject (e.g. 12 for "3-0-9"), and 12 is assumed when there is no numeric total. A subject is technical when it carries no HASS attribute, until technical subjects can be set per major. Nobody loads the catalog through a request, so loading has no endpoint.

Anyone can [search subjects](reaction:BFSThisMess.SearchSubjects) by text, level and term (CourseOffering._search), which answers [the matching courses](former:BFSThisMess.MatchingCourses). For a subject they can [view its details](reaction:BFSThisMess.ViewSubject) (CourseOffering._course, _terms, _prerequisites, _corequisites and _cancellations), shown as [the details of a course](former:BFSThisMess.CourseDetails), [see its ratings](reaction:BFSThisMess.ViewRatings) (CourseOffering._ratings), shown as [the ratings of a course](former:BFSThisMess.CourseRatings), and [its schedule](reaction:BFSThisMess.ViewSchedule) (CourseOffering._schedule), shown as [the schedule of a course](former:BFSThisMess.CourseSchedule).

```endpoints
BFSThisMess.SearchSubjects at /bfsthismess/searchSubjects
BFSThisMess.ViewSubject at /bfsthismess/viewSubject
BFSThisMess.ViewRatings at /bfsthismess/viewRatings
BFSThisMess.ViewSchedule at /bfsthismess/viewSchedule
```

## Roads

A signed-in student [creates a road](reaction:BFSThisMess.NewRoad) with a name, major and start (Constrain.newRoad), and in the same request becomes its owner (Share.claim). The major is picked from the [list of majors](reaction:BFSThisMess.ListMajors) (Requirements._lists, shown as [the majors](former:BFSThisMess.MajorList)), which anyone can see; a road's major is the id of a MAJOR list of Requirements, and a request naming anything else [creates no road](reaction:BFSThisMess.NewRoadUnknownMajor) and is refused with NO_SUCH_MAJOR "There is no such major." A request without a valid session [does not create a road](reaction:BFSThisMess.NewRoadWithoutSession) and is refused with NO_SUCH_SESSION. If the claim is refused, the request is refused with the reason of the claim and [the new road is deleted](reaction:BFSThisMess.DeleteUnclaimedRoad) (Constrain.deleteRoad), so a road never exists without an owner. Claiming and releasing are steps of NewRoad and DeleteRoad. They have no endpoints of their own, so nobody can claim or release a road directly.

The owner and the road's editors (Share._canEdit) can change its content; viewers can only look, and are refused with NOT_AN_EDITOR "You can only view this road.", while anyone who may not view the road is refused with NO_SUCH_ROAD, as if it did not exist. They can [rename it](reaction:BFSThisMess.RenameRoad), [move its start](reaction:BFSThisMess.SetStart) or [its end](reaction:BFSThisMess.SetEnd), [change its major](reaction:BFSThisMess.SetMajor) (to a MAJOR list, as above; the request is [refused](reaction:BFSThisMess.SetMajorRefused) with NO_SUCH_MAJOR otherwise, and by the usual checks), [add](reaction:BFSThisMess.AddPrior) or [remove](reaction:BFSThisMess.RemovePrior) prior credit, [pin](reaction:BFSThisMess.Pin) or [unpin](reaction:BFSThisMess.UnPin) a subject to a semester, [lock or unlock a semester](reaction:BFSThisMess.SetLocked) so the past is recorded, [set](reaction:BFSThisMess.SetCap) or [clear](reaction:BFSThisMess.ClearCap) a cap on units in a semester, and [reset a semester](reaction:BFSThisMess.ResetSemester). Each of these checks Share._canEdit for the road and then calls the Constrain action of the same name.

They can also add requirements of their own to the road: [add a block](reaction:BFSThisMess.AddBlock), saying whether its subjects are technical, and [set its count](reaction:BFSThisMess.SetCount), [add an option](reaction:BFSThisMess.AddOption) to it or [remove an option](reaction:BFSThisMess.RemoveOption) from it, or [remove the block](reaction:BFSThisMess.RemoveBlock). These requests name a block and not a road, so the road is found with Constrain._roadOfBlock and then checked in the same way (Share._canEdit). A block that does not exist is refused with NO_SUCH_BLOCK.

Only the owner can [delete the road](reaction:BFSThisMess.DeleteRoad) (Constrain.deleteRoad); an editor or a viewer is refused with NOT_AN_OWNER. Afterwards [the road is released](reaction:BFSThisMess.ReleaseRoad) (Share.release), so a deleted road keeps no owner and no viewers, and [its choices are forgotten](reaction:BFSThisMess.ForgetChoices) (Requirements.forget).

The Constrain actions that keep subject facts up to date (setListing, setPopularity, addListingTerm, removeListingTerm, removeListing, addDependency, addDependencyOption, removeDependency, markCancelled and unmarkCancelled) have no endpoints. They are driven by loading the catalog snapshot (see Catalog) and are not requested by users, so they need no check. Likewise Constrain.addListedBlock and removeListedBlocks, and Requirements.load and forget, have no endpoints: they are driven by the reactions of Degree requirements, by deleting a road, and by loading the catalog.

```endpoints
BFSThisMess.NewRoad at /bfsthismess/newRoad
BFSThisMess.NewRoadWithoutSession at /bfsthismess/newRoad
BFSThisMess.NewRoadUnknownMajor at /bfsthismess/newRoad
BFSThisMess.RenameRoad at /bfsthismess/renameRoad
BFSThisMess.DeleteRoad at /bfsthismess/deleteRoad
BFSThisMess.SetStart at /bfsthismess/setStart
BFSThisMess.SetEnd at /bfsthismess/setEnd
BFSThisMess.SetMajor at /bfsthismess/setMajor
BFSThisMess.SetMajorRefused at /bfsthismess/setMajor
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

## Degree requirements

Nobody types the requirements of a major. Whenever a road gets a new owner (Share.claim, in NewRoad), a new major (Constrain.setMajor, in SetMajor), a new choice (in ChooseAlternative) or a refresh (in RefreshRequirements), the same request removes its listed blocks (Constrain.removeListedBlocks), keeping the blocks the student added. Then [the major's blocks are listed](reaction:BFSThisMess.ListMajorBlocks) and [the GIRs' blocks are listed](reaction:BFSThisMess.ListGirBlocks): each block of Requirements._activeBlocks, for the road's major and for the list "girs", becomes a block of the road (Constrain.addListedBlock) with the same count, title, technical and group, and with the item as its origin. The GIRs' blocks are early, so that plans take them first when they can, and the major's are not. So the blocks of a major ask for distinct subjects, except that a communication-intensive or independent inquiry requirement may share a subject with the others, and a subject may meet a GIR and a requirement of the major at once. Last, [each listed block gets its options](reaction:BFSThisMess.ListBlockOptions) (Requirements._options of its origin, each added with Constrain.addOption). NewRoad, SetMajor, ChooseAlternative and RefreshRequirements answer only once the blocks are in place.

The owner or an editor can [choose an alternative](reaction:BFSThisMess.ChooseAlternative) of a choice in the road's requirements, such as a track (Requirements.choose). Anyone else is [refused](reaction:BFSThisMess.ChooseAlternativeRefused) by the same checks as the other changes. Anyone who may view the road sees its requirements when they view it (see ViewRoad below): the outline of its major and of the GIRs (Requirements._list and _outline), shown as [the requirements of a road](former:BFSThisMess.RoadRequirements), including the notes that are shown but not planned.

A road keeps the blocks it was listed with when the requirements are loaded again. The owner or an editor can [refresh its requirements](reaction:BFSThisMess.RefreshRequirements): the request removes its listed blocks (Constrain.removeListedBlocks), so they are listed again from the requirements as they are now, as for a new major, and answers once they are in place. Anyone else is [refused](reaction:BFSThisMess.RefreshRequirementsRefused) by the usual checks.

```endpoints
BFSThisMess.ListMajors at /bfsthismess/listMajors
BFSThisMess.ChooseAlternative at /bfsthismess/chooseAlternative
BFSThisMess.ChooseAlternativeRefused at /bfsthismess/chooseAlternative
BFSThisMess.RefreshRequirements at /bfsthismess/refreshRequirements
BFSThisMess.RefreshRequirementsRefused at /bfsthismess/refreshRequirements
```

## Sharing

Everyone on a road is its owner, an editor or a viewer (Share._role). The owner or an editor can [share a road](reaction:BFSThisMess.ShareRoad) with another person by giving their username and a role: the owner may add viewers or editors, an editor only viewers. The username is turned into a user with Authentication._lookup, and then Share.share is called with the requester as the one asking, which decides what the requester may do (an editor adding someone who already has access gets the same answer as for a new person, and nothing changes). If nobody has that username, the request is refused with NO_SUCH_USER "No user with that username." and nothing is shared. A viewer is refused with NOT_AN_EDITOR, and anyone who may not view the road with NO_SUCH_ROAD.

To find the username, the owner or an editor can [look up people to add](reaction:BFSThisMess.FindUsers) by the first letters of their username: the users of Authentication._matching for that prefix (at most 8, and only once 2 letters are typed), leaving out those Share._known says the requester already knows to have access, and the requester themself, shown as [the people who match](former:BFSThisMess.MatchingPeople) with their usernames only. A viewer is refused with NOT_AN_EDITOR, and anyone else with NO_SUCH_ROAD, so that nobody can use it to list users.

Only the owner can [change someone's role](reaction:BFSThisMess.SetRole) (Share.setRole) or [stop sharing](reaction:BFSThisMess.UnshareRoad) with them (Share.unshare), naming them by username as above; an editor or a viewer is refused with NOT_AN_OWNER.

The owner and the editors can [see who a road is shared with](reaction:BFSThisMess.ViewSharing) (Share._grantsVisibleTo): the owner sees everyone, an editor only the people they added. Each person is shown with their username, role and who added them (Authentication._username), as [the people a road is shared with](former:BFSThisMess.RoadPeople). A viewer is refused with NOT_AN_EDITOR.

The owner can manage two links to the road, one for viewers and one for editors: [see them](reaction:BFSThisMess.ViewLinks) (Share._links, shown as [the links of a road](former:BFSThisMess.RoadLinks)), and [turn one on](reaction:BFSThisMess.EnableLink), [turn it off](reaction:BFSThisMess.DisableLink) or [make a new one](reaction:BFSThisMess.RegenerateLink) (Share.enableLink, disableLink and regenerateLink); anyone else on the road is refused with NOT_AN_OWNER. A signed-in person who opens a link [joins the road](reaction:BFSThisMess.JoinLink) (Share.join) and is answered with the road; a link that is off, replaced or unknown is refused with INVALID_LINK "This link is no longer valid.", whichever it is. The token travels only in the request body.

Anyone who may view a road can [copy it to their own roads](reaction:BFSThisMess.CopyRoad) under a name they give: Constrain.copyRoad makes the copy (its major, start, end, blocks, pins and semesters, but not the prior credit, which is the owner's own record), the requester claims it (Share.claim), and its choices are copied (Requirements.copyChoices). The copy is the requester's own: nothing in it leads back to the original or to its owner. If the claim is refused, the copy is deleted as for a new road (DeleteUnclaimedRoad), so no half-made copy is left. A request without a valid session, or for a road the requester may not view, is [refused](reaction:BFSThisMess.CopyRoadRefused) with NO_SUCH_SESSION or NO_SUCH_ROAD, and nothing is copied.

Who owns a road is shown only to those Share._ownerVisibleTo answers for: its owner, its editors, and the viewers the owner added (directly or through a link). A viewer added by an editor is never told the owner's username: not when viewing the road, not in the list of their roads, and not in any other answer.

```endpoints
BFSThisMess.ShareRoad at /bfsthismess/shareRoad
BFSThisMess.FindUsers at /bfsthismess/findUsers
BFSThisMess.SetRole at /bfsthismess/setRole
BFSThisMess.UnshareRoad at /bfsthismess/unshareRoad
BFSThisMess.ViewSharing at /bfsthismess/viewSharing
BFSThisMess.ViewLinks at /bfsthismess/viewLinks
BFSThisMess.EnableLink at /bfsthismess/enableLink
BFSThisMess.DisableLink at /bfsthismess/disableLink
BFSThisMess.RegenerateLink at /bfsthismess/regenerateLink
BFSThisMess.JoinLink at /bfsthismess/joinLink
BFSThisMess.CopyRoad at /bfsthismess/copyRoad
BFSThisMess.CopyRoadRefused at /bfsthismess/copyRoad
```

## History

Each signed-in person has one history for their whole account (History), which only they can see or change: no request reads or changes anyone else's, so it needs no Share check. They [view it](reaction:BFSThisMess.ViewHistory), shown as [the history of a user](former:BFSThisMess.UserHistory): their start and the current season (History._profile), their prior credit (History._prior), each past season with whether it is answered and locked (History._seasons) and its subjects (History._allTaken), the first season still to be asked (History._pending), and two kinds of warning. The first is the prerequisites that the answered seasons of the history do not meet (Constrain._historyWarnings, given History._encoded), shown once a season is locked; real history may predate the catalog's rules, so these never refuse anything. The second is, for each road they own (Share._roadsOwnedBy), the planned subjects that their history leaves without what they need (Constrain._unmetDependencies), so that unlocking a semester and changing it shows what it breaks.

Onboarding is these requests, in order, and can be left and taken up again at any point, since everything answered so far is kept: [add](reaction:BFSThisMess.AddPriorCredit) or [remove](reaction:BFSThisMess.RemovePriorCredit) prior credit (History.addPrior and removePrior) and [finish it](reaction:BFSThisMess.FinishPriorCredit) (History.finishPrior); [set the semester they started](reaction:BFSThisMess.SetHistoryStart) (History.setStart); then for each past season, [add](reaction:BFSThisMess.AddTaken) or [remove](reaction:BFSThisMess.RemoveTaken) a subject (History.addTaken and removeTaken) and [lock it](reaction:BFSThisMess.LockSeason) (History.lock), which also answers "nothing this term" for a season with no subjects. To correct a mistake they [unlock a season](reaction:BFSThisMess.UnlockSeason) (History.unlock), change it, and lock it again. A subject added to the history must be in the catalog (CourseOffering._course); otherwise the request is [refused](reaction:BFSThisMess.AddPriorCreditRefused) [likewise](reaction:BFSThisMess.AddTakenRefused) with UNKNOWN_SUBJECT "That subject is not in the catalog." and nothing changes. A request without a valid session is refused with NO_SUCH_SESSION, by the same refusal endpoints and by those of the other changes ([removing prior credit](reaction:BFSThisMess.RemovePriorCreditRefused), [setting the start](reaction:BFSThisMess.SetHistoryStartRefused), [removing a subject](reaction:BFSThisMess.RemoveTakenRefused), [locking](reaction:BFSThisMess.LockSeasonRefused) and [unlocking](reaction:BFSThisMess.UnlockSeasonRefused)).

Every road a person owns starts from their history. After each change to it, the history (History._encoded) is placed again in each of their roads (Constrain.applyHistory): after [adding](reaction:BFSThisMess.PlaceHistoryAfterAddPrior) or [removing](reaction:BFSThisMess.PlaceHistoryAfterRemovePrior) prior credit, [setting the start](reaction:BFSThisMess.PlaceHistoryAfterSetStart), [adding](reaction:BFSThisMess.PlaceHistoryAfterAddTaken) or [removing](reaction:BFSThisMess.PlaceHistoryAfterRemoveTaken) a subject, and [locking](reaction:BFSThisMess.PlaceHistoryAfterLock) or [unlocking](reaction:BFSThisMess.PlaceHistoryAfterUnlock) a season. Each change answers only once its roads are up to date. A road gets its owner's history [when it is claimed](reaction:BFSThisMess.PlaceHistoryOnClaim) (Share.claim), so a new road and a copy start from the history of whoever made them, never from that of the copied road's owner. Roads shared with a person are not theirs, so their history does not reach them. In a road, the past seasons of the history are always locked, even while the season is unlocked in the history to be corrected: a correction reaches the road at once, and plans never add subjects to the past.

```endpoints
BFSThisMess.ViewHistory at /bfsthismess/viewHistory
BFSThisMess.AddPriorCredit at /bfsthismess/addPriorCredit
BFSThisMess.AddPriorCreditRefused at /bfsthismess/addPriorCredit
BFSThisMess.RemovePriorCredit at /bfsthismess/removePriorCredit
BFSThisMess.RemovePriorCreditRefused at /bfsthismess/removePriorCredit
BFSThisMess.FinishPriorCredit at /bfsthismess/finishPriorCredit
BFSThisMess.SetHistoryStart at /bfsthismess/setHistoryStart
BFSThisMess.SetHistoryStartRefused at /bfsthismess/setHistoryStart
BFSThisMess.AddTaken at /bfsthismess/addTaken
BFSThisMess.AddTakenRefused at /bfsthismess/addTaken
BFSThisMess.RemoveTaken at /bfsthismess/removeTaken
BFSThisMess.RemoveTakenRefused at /bfsthismess/removeTaken
BFSThisMess.LockSeason at /bfsthismess/lockSeason
BFSThisMess.LockSeasonRefused at /bfsthismess/lockSeason
BFSThisMess.UnlockSeason at /bfsthismess/unlockSeason
BFSThisMess.UnlockSeasonRefused at /bfsthismess/unlockSeason
```

## Class hours and study settings

A signed-in person can [see the hours a subject takes](reaction:BFSThisMess.ViewClassHours) in a given semester, shown as [the hours of a class](former:BFSThisMess.ClassHours): the hours a week in class and outside it and where each comes from (TimeBudget._classHours), and the sections of its schedule for that semester (TimeBudget._sections). Where the catalog has no hours outside class, they are an estimate: the hours in class times the person's study factor, as on a time-budgeting worksheet. So the answer depends on who asks, and needs a session. They can [see their study settings](reaction:BFSThisMess.ViewStudySettings), shown as [the study settings of a user](former:BFSThisMess.StudySettings) (TimeBudget._settings and _subjectFactors), [set their study factor](reaction:BFSThisMess.SetStudyFactor) (TimeBudget.setFactor), [set the reserve](reaction:BFSThisMess.SetReserve) they keep of their free time (TimeBudget.setBuffer), and [set](reaction:BFSThisMess.SetSubjectFactor) or [clear](reaction:BFSThisMess.ClearSubjectFactor) the factor of one subject (TimeBudget.setSubjectFactor and clearSubjectFactor). Settings are the person's own, so they need no Share check; a request without a valid session is refused with NO_SUCH_SESSION.

```endpoints
BFSThisMess.ViewClassHours at /bfsthismess/viewClassHours
BFSThisMess.ViewStudySettings at /bfsthismess/viewStudySettings
BFSThisMess.SetStudyFactor at /bfsthismess/setStudyFactor
BFSThisMess.SetReserve at /bfsthismess/setReserve
BFSThisMess.SetSubjectFactor at /bfsthismess/setSubjectFactor
BFSThisMess.ClearSubjectFactor at /bfsthismess/clearSubjectFactor
```

## Weekly time budget

Each signed-in person has their own weeks of blocked time (TimeBudget), which only they can see or change here; no request reads or changes another person's, so they need no Share check, and TimeBudget itself refuses a week, block or category that is not the requester's. They [view their regular week](reaction:BFSThisMess.ViewWeek), which is made with the worksheet's defaults the first time (TimeBudget.ensureDefault), shown as [a week of blocked time](former:BFSThisMess.Week) (TimeBudget._blocks, _rollup and _blocked) together with [the weeks of a user](former:BFSThisMess.WeekSetup): their categories (TimeBudget._categories), the semesters with a week of their own (TimeBudget._overrides) and the current season (History._profile), from which the semesters that may have one are reckoned. They [view the week of a semester](reaction:BFSThisMess.ViewSemesterWeek), shown as [the week of a semester](former:BFSThisMess.SemesterWeek) (TimeBudget._templateFor: its own week, or else the regular one); [give a semester a week of its own](reaction:BFSThisMess.OverrideWeek), a copy of the regular week (TimeBudget.override); and [reset it](reaction:BFSThisMess.ResetWeek) to the regular week (TimeBudget.resetToDefault).

They [paint a block](reaction:BFSThisMess.AddTimeBlock) of time in a category, [move or resize it](reaction:BFSThisMess.SetTimeBlock) and [remove it](reaction:BFSThisMess.RemoveTimeBlock) (TimeBudget.addBlock, setBlock and removeBlock), and [add](reaction:BFSThisMess.AddCategory), [rename](reaction:BFSThisMess.RenameCategory), [recolor](reaction:BFSThisMess.RecolorCategory) and [delete](reaction:BFSThisMess.DeleteCategory) categories of their own (TimeBudget.addCategory, renameCategory, recolorCategory and deleteCategory). In class is never painted: it comes from the classes of a plan. A request without a valid session is refused with NO_SUCH_SESSION.

```endpoints
BFSThisMess.ViewWeek at /bfsthismess/viewWeek
BFSThisMess.ViewSemesterWeek at /bfsthismess/viewSemesterWeek
BFSThisMess.OverrideWeek at /bfsthismess/overrideWeek
BFSThisMess.ResetWeek at /bfsthismess/resetWeek
BFSThisMess.AddTimeBlock at /bfsthismess/addTimeBlock
BFSThisMess.SetTimeBlock at /bfsthismess/setTimeBlock
BFSThisMess.RemoveTimeBlock at /bfsthismess/removeTimeBlock
BFSThisMess.AddCategory at /bfsthismess/addCategory
BFSThisMess.RenameCategory at /bfsthismess/renameCategory
BFSThisMess.RecolorCategory at /bfsthismess/recolorCategory
BFSThisMess.DeleteCategory at /bfsthismess/deleteCategory
```

## Plans against the time budget

Anyone who may view a road (Share._canView) can [see the hours of each semester of its paths](reaction:BFSThisMess.ViewPlanMetrics), shown as [the hours of the semesters of the paths of a road](former:BFSThisMess.PlanMetrics): for each semester of each plan (Constrain._planSeasons, which is Constrain._findPath grouped by season), its hours in and out of class, blocked and free time, the reserve, whether it is feasible, and its conflicts with blocked time (TimeBudget._semesterMetrics). They can also [see the schedule of one semester](reaction:BFSThisMess.ViewSemesterSchedule) of a plan, given its subjects, shown as [the schedule of a semester of a plan](former:BFSThisMess.SemesterSchedule): the sections picked for its classes (TimeBudget._placement), their conflicts (TimeBudget._conflicts), the classes with no place in the week (TimeBudget._unplaced), and the blocks and categories of the week the semester uses (TimeBudget._templateFor, _blocks and _categories). IAP and summer semesters are counted in hours only. Every number is worked out against the week and settings of the road's owner (Share._ownerOf), whoever asks, so that everyone on a road sees the same plan; the owner's username is never part of the answer.

The owner and editors can [pick a section by hand](reaction:BFSThisMess.ChooseSection) for a part of a class in a semester (TimeBudget.chooseSection), and [let it be picked for them again](reaction:BFSThisMess.ClearSection) (TimeBudget.clearSection); viewers are refused with NOT_AN_EDITOR, and anyone who may not view the road with NO_SUCH_ROAD. Each road treats its time budget as soft or hard. Anyone who may view it can [see its time settings](reaction:BFSThisMess.ViewRoadTime), shown as [the time settings of a road](former:BFSThisMess.RoadTime) (TimeBudget._roadSettings); the owner and editors can [make it soft or hard](reaction:BFSThisMess.SetScheduleMode) (TimeBudget.setMode), and [set](reaction:BFSThisMess.SetRoadReserve) or [clear](reaction:BFSThisMess.ClearRoadReserve) a reserve for this road alone (TimeBudget.setRoadBuffer and clearRoadBuffer); viewers are refused with NOT_AN_EDITOR. A soft road (the default) shows its paths as before, each semester with its hours and whether it fits. A hard road shows only paths whose unlocked semesters all fit. This is decided after the paths are built, not while they are: whether a semester fits depends on all of it at once, against a week the planner does not know, and the planner builds a few good plans rather than searching every one, so it cannot leave out a subject for its hours without changing which plans it finds. So the paths of a road (RoadPaths) and their hours (PlanMetrics) both first ask TimeBudget how many plans to build (TimeBudget._searchLimit: three times as many for a hard road), build them (Constrain._plansEncoded), let TimeBudget keep those that fit against the owner's week (TimeBudget._keptPlans), and answer only those (Constrain._findPath and _planSeasons given the kept plans, numbered again from 1). They also say the road's mode and how many paths were left out, and, when no path is left, which semester of each path does not fit and by how much (TimeBudget._binding), so the student knows what to change instead of seeing nothing. Locked semesters are never judged: they are history, or fixed by the student.

Everyone has a regular week to measure plans against: it is made with the worksheet's defaults (TimeBudget.ensureDefault) [when they register](reaction:BFSThisMess.MakeRegularWeek) and, for accounts made before weeks existed, [when they come to own a road](reaction:BFSThisMess.MakeRegularWeekForOwner) (Share.claim). When a road is deleted, [its time settings and section choices are forgotten](reaction:BFSThisMess.ForgetRoadTime) (TimeBudget.forgetRoad).

```endpoints
BFSThisMess.ViewPlanMetrics at /bfsthismess/viewPlanMetrics
BFSThisMess.ViewSemesterSchedule at /bfsthismess/viewSemesterSchedule
BFSThisMess.ViewRoadTime at /bfsthismess/viewRoadTime
BFSThisMess.SetScheduleMode at /bfsthismess/setScheduleMode
BFSThisMess.SetRoadReserve at /bfsthismess/setRoadReserve
BFSThisMess.ClearRoadReserve at /bfsthismess/clearRoadReserve
BFSThisMess.ChooseSection at /bfsthismess/chooseSection
BFSThisMess.ClearSection at /bfsthismess/clearSection
```

## Paths and viewing

A signed-in person can [list their roads](reaction:BFSThisMess.MyRoads): the roads they own (Share._roadsOwnedBy) and the roads shared with them (Share._roadsSharedWith), each shown with its name and major (Constrain._road) as [the roads of a user](former:BFSThisMess.UserRoads), so that an advisor can find every road shared with them. A shared road also shows the person's role and, where Share._ownerVisibleTo allows, the owner's username.

Someone who may view a road (Share._canView) can [find the shortest paths](reaction:BFSThisMess.FindPaths) for it, giving whether to use IAP and summer semesters and a limit of at most that many plans. [The paths of the road](former:BFSThisMess.RoadPaths) are found with Constrain._findPath, given the road, that choice and the limit.

They can [view a road](reaction:BFSThisMess.ViewRoad) to see [its constraints](former:BFSThisMess.RoadConstraints), put together from Constrain._road, _prior, _blocks, _pins and _semesters, its requirements, its paths, found the same way as in FindPaths, and [their access to it](former:BFSThisMess.RoadAccess): their role (Share._role) and, where Share._ownerVisibleTo allows, the owner's username. A person it is shared with sees the road as it is now; viewers cannot use any of the requests that change it.

Four more requests only read a road, and each passes the same Share._canView check: they [list the options that still fit](reaction:BFSThisMess.ViewOptions), giving whether to include IAP and summer semesters (Constrain._options, shown as [the options of a road](former:BFSThisMess.RoadOptions)); [check the plan chosen so far](reaction:BFSThisMess.CheckPlan) (Constrain._satisfies, shown as [the verdict on a plan](former:BFSThisMess.PlanVerdict)); and [preview the pins lost](reaction:BFSThisMess.PreviewStartChange) by moving the start, or [by moving the end](reaction:BFSThisMess.PreviewEndChange), so that the student can be warned before they change it (Constrain._pinsLostBySetStart and _pinsLostBySetEnd, shown as [the pins lost by moving the start](former:BFSThisMess.PinsLostByStart) and [the pins lost by moving the end](former:BFSThisMess.PinsLostByEnd)). Previews change nothing, so they are open to anyone who may view the road.

A path can hold open slots, such as one for a HASS subject, that the student fills. Anyone who may view the road can [list the subjects that fit a slot](reaction:BFSThisMess.ViewSlotOptions), giving the slot's blocks, its season and a topic: the subjects of Constrain._slotOptions whose name or description contains the topic (CourseOffering._matches; an empty topic matches every subject), each with its name and units (CourseOffering._course), shown as [the subjects for a slot](former:BFSThisMess.SlotSubjects). The owner fills a slot by pinning one of them to its season (Pin), and can pin any other subject of a path to its season in the same way.

```endpoints
BFSThisMess.MyRoads at /bfsthismess/myRoads
BFSThisMess.FindPaths at /bfsthismess/findPaths
BFSThisMess.ViewRoad at /bfsthismess/viewRoad
BFSThisMess.ViewOptions at /bfsthismess/viewOptions
BFSThisMess.CheckPlan at /bfsthismess/checkPlan
BFSThisMess.PreviewStartChange at /bfsthismess/previewStartChange
BFSThisMess.PreviewEndChange at /bfsthismess/previewEndChange
BFSThisMess.ViewSlotOptions at /bfsthismess/viewSlotOptions
```