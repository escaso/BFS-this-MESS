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