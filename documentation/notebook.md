# TUE OCT 13
* Probably need to add a SEARCH concept or feature for users to add their classes.

* User journey: 

    1. Register:
        - Create username and password
        - Verify email
        - Fill in initial questionaire
    2. Set filters:
        - Fix subjects
        - Lock semesters
    3. Calculate paths:
        - Compute possible paths
        - Visualize paths and metrics
    4. Save path
    5. Share path
    6. Return to, copy and delete saved paths.
    7. Paths are a set of constraints
* Ratings mapping will need a url to the ratings for user accesibility and app credibility.
* Need REFRESH reaction to update app with MIT website info
* **Concept design review:**
    1. ****COURSE_OFFERING****
        
        1. Only show lecturer if the subject is offered this semester. Otherwise the website will say staff... Or just parse staff? 
            Parse Lecturer name or *Staff*. Handle each case in UI, not backend.
        2. For semesters offered, the MIT sbject listing website usially says fall or spring, and in the case that there is an exception like the subject not being offered in a specific semester, it will say this then... How do I represent that. Is that part of the state or do I check explicitly in IS_OFFERED() upon a call, or do I mirror their structure?
            * **MIT Subject Listing & Schedule Symbol Definitions:**
            ![MIT Subject Listing & Schedule Symbol Definitions](subject_listing_symbols.png)

            Update attributes to include this terminology

        3.  In ratings, we probably want to include a link to the ratings we are sourcing from, so maybe we want ratings to just be a link to the urls for that class and lecturer and a reaction will later handle info extraction?

            Include as an attribute

        4. I intended is_technical to represent subjects that are in you major, so this depends on the user and no longer feels like it belongs in course_offering... Technicals for theatre majors would be courses in 21T, where for a 6-3 major they would be hasses. I'm not sure how to define technical, and I think it should be called is_technical in the state, not just technical since it represents a boolean

            technical doesn't belong in course_offering because it is major specific.

        5. For search, do we need to know the data structure first or is the query not the concept's concern?

        6. Need to add schedule data


# WED OCT 14

* **Concept design review:**
    1. ****CONSTRAIN****
        1.  Should elective_blocks be inside of required?

            No because different types of objects and combining them would get messy.

        2. Should I add a major attribute, or a technicals, or is this all portrayed in required and elective_blocks?

            Major implies technicals (defined as requirements, or subjects within that course)

        3. How do we match future planning with course offerings that currently say “not offered THIS/NEXT year” and know what year we are talking about.

            Reaction's scope

        4. Dont like the name locked through number

            But useful to keep a Number instead of a Semester object

        5. Should cap and captechngical be the same action with an extra parameter?

            Yes

        6. When does automatic pinning come in? In a reaction? By taht I mean locking a semester when it is literally in the past date wise.

            Reaction

* Postponing hour block intake for now in MVP
* Semester 1 is not same for everyone, some students start in Spring, others take gaps, others are transfer students, etc.
* Where do we check if a major is valid?
* What about double-majors?
* What if you want to lock a random semester withoug locking every semester up to it?

# MON OCT 19

* **Concept design review:**
    1. ****CONSTRAIN****

        1. Semesters will be counted with a Season and Term instead of a plain number. Where do the changes go?

            Types, the Pin and Semester state, the semester-numbering rule, the pin and lock actions, and the text of newRoad, _satisfies and _findPath (they all said "k-th set is semester k").

                type Season = "IAP" | "Spring" | "Summer" | "Fall";
                type Term = { year: number; season: Season };   // e.g. { year: 2026, season: "Spring" }

            Order within a year is IAP < Spring < Summer < Fall. SSF has no records, so in the spec a Season becomes a year field plus a term field (an uppercase enum: IAP, SPRING, SUMMER, FALL). Roads get a start and an end in the same form.

        2. Incoming credit (semester 0)?

            Becomes a separate *prior* set on the road. A Plan is { prior, semesters: { season, subjects }[] }, so prior credit shows up as its own first block.

        3. Do we need lockedThrough?

            No. Each Semester record (road, season) carries its own *locked* flag, maxUnits and maxTechnicalUnits. This allows locking one semester even with a gap before it.
            No record means unlocked and uncapped. Summer and IAP can be locked to empty, and IAP has a default cap of 12 units.
            "Lock through" becomes a reaction that locks semesters individually, depending on which semester we are in.

        4. Caps in subjects or in units?

            Units, per semester. The 54/60 first-year limits are a flat cap set by the frontend, not the concept's concern.

        5. Where does the path search start?

            At the first unlocked semester with room (unpinned credits), so it works with no pins at all. The road stores a *start* (Fall by default, but it can be Spring) and an *end* (8 semesters after start by default). setStart moves end by the same amount. IAP and Summer are included optionally, if a flag is set.

        6. Is the state right, with sets of Pins, Semesters and Blocks that depend on Roads?

            Yes, that is idiomatic SSF. Fixes applied:
            - Boolean is redundant, so use Flag.
            - Pins get unique (road, subject) and Semesters unique (road, season).
            - pin and unPin refuse locked semesters. pin also refuses prior credit and seasons outside start to end.
            - Caps become optional numbers. A cap of 0 had meant "no cap" while the spec said it allows nothing.
            - Added deleteRoad, renameRoad and resetSemester.
            - _satisfies is made consistent with _options (offerings, prerequisites, corequisites, caps).

        7. Where does Road live and what does major do?

            Road lives in Constrain. Major generates requirements, sourced from the web per major and catalog year.
            setMajor only sets the label. A sync (a future MajorRequirements concept) replaces all of the road's blocks. If someone changes major they are refactoring a lot anyway, or should just create a new road.

        8. Required subjects vs elective blocks?

            One structure: a block with options and a count. A required subject is a block with one option and a count of 1. Prerequisites with "or" use the same shape in CourseOffering.

        9. Should history (prior credit, locked pins) be separate from what the student wants?

            No. For the algorithm there is no difference. Any distinction belongs in the UI.

        10. Can a subject count toward two blocks? Can a pin fall outside start to end?

            No to both, for now.

        11. Does BFS stay in Constrain, or do we split out a Planning concept?

            It stays in Constrain, since once the constraints are set, planning is just running BFS. I considered a Planning concept to avoid duplicated code, but chose to mirror the subject facts (Listings, Dependencies, Cancellations) so Constrain never reads another concept's state. A sync copies them whenever CourseOffering loads.

        12. Skeleton and options?

            _options and _placements list the seasons each unpinned required subject could go in. HASSes and electives are left for the user to choose. _findPath is built from them and stays a query, not a reaction.
            If a choice pushes a required subject past the end, it still shows up in the skeleton, flagged *requiresExtraSemester*, instead of being hidden. The competition between subjects shows up as the user pins, so no expensive search is needed.

        13. _satisfies, _options and _findPath are long and hard to read.

            Reorganized around named definitions (taken, canRun, dependenciesMet, room, canGoIn, covered), with each rule moved next to the state it governs. _findPath now says what a result is (the earliest finish) instead of prescribing the BFS steps.

        14. Consistency review of Constrain against CourseOffering:

            - Technical is orphaned. It becomes a set on the road, filled by the setMajor sync, and not a flag on Listings.
            - Half-year loading broke canRun. The listing is loaded once per MIT update and stored, and a load replaces only the terms it covers.
            - Prerequisites that are not in any block could never be scheduled. The solver now adds them itself (candidates are block options, pins, and their prerequisites transitively).
            - Locked pins are exempt from the offering, prerequisite and cap checks.
            - Actions that took flags were split: lock and unlock, pin and movePin, addListing and updateListing, one setter per cap.
            - fitsByEnd is made exact, and setStart and setEnd delete out-of-span semester settings.
            - Constrain stays one concept. Splitting Roads, Requirements and the solver would make queries cross concepts.

    2. ****COURSE_OFFERING**** (updated to match Constrain's mirror)

        1. Same state shape as Constrain's mirror?

            Yes. Term and DependencyKind types are added, terms becomes a set of Term, and Prerequisites and Corequisites merge into one Dependencies set (course, kind, options, count) so "or" works. A Cancellations set (subject, year, term) is derived from the offering text plus the listing's academic year. Boolean becomes Flag.

        2. Units: string or number?

            Stay a string ("3-0-9") and the sync does the summing. If units are missing or "Arrange", assume 12 with a disclaimer, surfaced to the UI through unitsKnown in _search.

        3. Technical flag?

            Dropped from CourseOffering, because it depends on the road's major (21M for Theatre, 18.700 or 6.120 for 6-3).

        4. Which academic year does a load refer to?

            The year of the listing being loaded, not the fetch date, since the listing comes out in halves (Fall now, IAP and Spring in late November).
            "Not offered THIS year" or "NEXT year" cancels every term of that year. "Not currently listed" cancels the current and next year. Everything must comply with the catalog: https://student.mit.edu/catalog/index.cgi

        5. Catalog?

            Removed, along with _catalog. _search(query?, level?, term?) returns everything when called with no parameters, including terms and units. Listing is part of search.

        6. Format fixes?

            load gets a LOAD_FAILED refusal, and the Principle becomes a short story like in Reserving.md.

    3. ****DATA SOURCING****

        1. How does CourseRoad handle sourcing? (https://github.com/dannybd/courseroad)

            It doesn't scrape. Subjects come from a SQL query against MIT's Data Warehouse (the Registrar's course catalog table), and the free-text prerequisites are parsed into a JSON tree. Fixes go in a second exceptions table that overrides imported rows, and major requirements are hand-written in js/majors.js. I found no ratings handling.

        2. Are our sources open to the public?

            Not sure (the evaluation reports probably need an MIT login). So the app should never fetch live. A script produces one normalized JSON catalog plus an overrides file for bad parses, and the app only loads that file. Re-run once per half-year listing (Fall, then IAP and Spring).
            Source options still open: FireRoad's catalog API (check usage terms first), a one-time hand scrape of the Subject Listing, or the Warehouse.
            User-driven catalog loading should be removed.
## Notes on Constrain design

Design notes (not part of the concept's behavior):

- Subject facts are mirrored here on purpose. Constrain keeps its own Listings, Dependencies and Cancellations so that it never reads another concept's state. CourseOffering stays the owner of subject information; a synchronization copies the facts across whenever CourseOffering loads. When CourseOffering is updated it should hold units as a number (summed from e.g. "3-0-9") and represent a subject's prerequisite "or" groups as blocks, as here.
- Requirements were previously a separate "required" set plus elective blocks. A required subject is now a block with a single option and a count of 1, which removes a special case from every query. The old _placements query (the required-only view) is dropped for now because that distinction no longer exists in the state.
- The requirements of a major are produced outside this concept (e.g. a MajorRequirements concept loaded from the web, versioned by catalog year). A synchronization on setMajor replaces all blocks of the road with the new major's: it removes every existing block and adds the new ones with addBlock and addOption.
- fitsByEnd now checks all blocks together: it asks whether the blocks can still be covered if every reachable subject were taken, so it accounts for a subject not counting toward two blocks. Previously each block was checked on its own.
- Known gap: _options and _findPath only consider subjects that appear in a block. A prerequisite that is not prior credit, not pinned and not in any block can never be satisfied by the search.
- _roadOfBlock exists for access control. setCount, addOption, removeOption and removeBlock take a block and not a road, so the application finds the road of the block with this query and asks Share whether the requester owns that road, without Constrain knowing anything about owners.

## Notes on CourseOffering design

Design notes (not part of the concept's behavior):

- Subject facts are mirrored by the Constrain concept, which keeps its own Listings, Dependencies and Cancellations so that it never reads another concept's state. CourseOffering stays the owner of subject information; a synchronization copies the facts across whenever CourseOffering loads, using _search, _prerequisites, _corequisites and _cancellations. That synchronization is also where units is translated into a number (summing e.g. "3-0-9" to 12).
- Disclaimer on units: when a subject has no units, or units with no numeric total such as "Arrange", the translation assumes 12 units. This is an assumption and not catalog data. unitsKnown in _search lets an interface say so.
- Whether a subject is technical is not stored here: it depends on the road's major (e.g. 21M subjects for Theatre Arts, 18.700 or 6.120 for 6-3) and so belongs with the road and its requirements.
- The subject listing is released ahead of time and in halves, so a load in the fall only knows about the Fall terms. Cancellations are therefore derived for whole academic years, and a later load of the IAP and Spring listing adds its terms without discarding the Fall ones.

## Notes on Share design

Design notes (not part of the concept's behavior):

- Share only records who owns a road and who may view it. It knows nothing about what a road contains and cannot stop anyone from calling another concept; the application's synchronizations ask Share before they let a request reach Constrain (see the composition).
- Sharing gives view access only, which is what the advisor in the user journey needs. An advisor who may edit or suggest changes would need an access level on each entry of accessList, which is left for later.
- Users are referred to by their User identity, not their username. The composition turns a username into a User with Authentication._lookup before calling share or unshare.
- Share does not know when a road is deleted. A synchronization calls release after Constrain.deleteRoad so that a deleted road does not keep an owner or viewers.

## Notes on Authentication design

Design notes (not part of the concept's behavior):

- Authentication only says who a person is. What that person may do is decided by Share (who owns and may view a road) and by the application's synchronizations, which pass the user found by _authenticate to Share.
- login refuses with the same message whether the username is unknown or the password is wrong, so a caller cannot use it to find out which usernames exist.
- _lookup lets someone share a road using a username while Share keeps working with User identities. It reveals whether a username exists, which is acceptable here because the composition only offers it to a signed-in user who is sharing a road.
- _username lets an interface show a person's name instead of their User identity.

## Today

Unless the user pins something, the rest should be options. I would like to have an option of "topics you are interested in" for the hass to skim through the descriptions of the classes and the titles (with an api call) OR simply leave blank blocks for the non technical classes that can be a button where the user clicks and goes through a list of classes that would feasibly fit that slot. If they select one, that gets added to the road. a user should also be able to pin subjects from the possible paths screen.

The way you construct tracks allows double counting as a cim and a track or AUS, but when they are explicit chooose from xy or z and they are not the extra requirements, usually people will not initially aim to choose more than they have to from that section.

eah I think that is making paths unfeasible because theres no reason why 2.UAR should appeat in 8 of the 10 paths we make... That is not a common subkecty to take. 8.01, and all the girs should be aimed to  be completed earlier if the pinned subjectys allow this. Also when we set a max subjects and technicals, this should show somewhere so that the user can tell it has been set.

next, I dont know why its trying to put elective subjects in the first semester. Also I would like to lock semesters, in which case you dont get pin and lock, just lock (in the ui, int he backend you only get pins for everything). Then I would like a color for GIRs (except the hasses), a color for hasses, a color for the other major requirements, and a color for non-technicals. and a legend of these colors at the top. Then when we get the subject summary at the bottom, I would like to click on subjects and read their description in the same way we can in the catalog section, as well as the unit breakdown and the requirement that subject is satisfying if any.
# MON OCT 26

* Sharing: roles (owner, editor, viewer), share links, username autocomplete, copy a road to my roads, and view-only mode. A viewer added by an editor never learns who owns the road.
* **Concept design review:**
    1. ****HISTORY**** (new)
        1. Should history live on each road, or once per account?

            Once per account. A new History concept keeps prior credit, the start semester and what was taken each past semester (IAP and summer too, "nothing this term" allowed). A sync places it in every road the user owns, as locked semesters marked fromHistory, which cannot be changed from the road. Roads shared with you don't get your history; a copy gets the copier's.

        2. Do we need CourseRoad's term numbers (0 = prior credit, 1 = freshman fall...)?

            No. Seasons and the prior set already cover it; "Sophomore fall" is computed for display only.

        3. What if real history breaks catalog rules (18.01A and 18.02A taken together)?

            Warn, don't block. Subjects in locked semesters are facts: the planner no longer checks their terms or prerequisites. This was the bug where roads with a history found no paths.

    2. ****TIME_BUDGET**** (new)
        1. How do we model the week?

            7 days x 96 slots of 15 minutes, blocks can cross midnight, no overlaps. Categories from the time budgeting worksheet plus your own; "In class" comes from the plan and is never painted. One regular week per account and a per-semester copy that can be reset.

        2. Where do class hours come from?

            FireRoad, through the committed snapshot. In class: schedule, else evaluations, else lecture + lab units. Out of class: evaluations, else contact hours x factor (2 to 3), always labelled as an estimate. FireRoad only publishes the current term's schedule, so the build infers which term it is (Fall 2026).

        3. When is a semester feasible?

            When study <= free x (1 - reserve), free = 168 - blocked - in class. Reserve defaults to 10%. One feasibility() function so we can add a midterms/finals crunch later.

        4. Section picking?

            Backtracking with pruning and a 20000 step cap: conflict-free if possible, otherwise fewest conflicts. Hand-picked sections are kept. Fall/Spring only, IAP and summer get hours only.

        5. Hard mode: prune inside BFS or after?

            After. Feasibility depends on the whole semester against a week the planner doesn't know, so a hard road builds 3x the paths and keeps the ones that fit, and says which semester doesn't fit when none do.

        6. What do advisors see?

            Hours only by default, enforced on the server: no blocks, category names or times. The owner can choose to share blocked time too.

* The sync engine never answers a request with a field named length, so blocks use slots.
* UI: subject dropdown when pinning in edit constraints, and clicking a subject in possible paths shows its catalog details.
