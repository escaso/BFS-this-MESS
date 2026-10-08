# **BFS-this-MESS**

## **PROBLEM FRAMING AND STAKE HOLDERS**

### **Domain:**

At MIT, we get to choose when and what courses to take, roughly. Each declared major has a set of requirements that they must fulfill, these being specific subjects or subjects from a subgroup (electives), and some subjects have others as their **pre-requisite**. Within those constraints, we are free to organize our semesters as we please. 

Naturally, this makes it a common problem all students must engage with: what classes to take. However, in reality, students are really trying to optimize their career plan to finish as soon as possible while satisfying some conditions such as: 

* making each semester a
enjoyable as possible, by planning to take classes you are intersted in; making sure that there will be enough hours in the week to give the alloted time to your classes while accounting for 8h of sleep, time to eat, extracurriculars, etc.; or capping the amount of technical vs. humanities classes you take.

* Making each semester as easy as possible by ensuring no lecture/recitation conflicts and choosing classes with good lecturers.

One tool that students use is called CourseRoad, which displays a semester view, into which you can drag and drop subjects. The task is manual, but shows course pre-requisites as you add the classes, progress toward major completion and a projection of your schedule per planned semester.


### **Bad situations:** 

As I mentioned, there exists a website called CourseRoad which enables you to visualize your semesters and drag and drop classes to draft your plan. As a result, a large population of MIT students spend a lot of their time on said website, constantly composing a plan through trial and error. 

They test what would happen if they take subject x in their 4th semester; how would that move their other subjects? would it fit in their schedule? Is the professor good that year? Then they might try the same subject x in their 5th semester and repeat the process. Then test subject y: can they fit it in? If they can't, what could they switch out? Now that they have switched that subject out, how does that affect what came after it? And so on and so forth over the infinite permutations that result from such an extensive subject listing at MIT.

As a result, navigating CourseRoad alone is not enough. One still has to access other websites like Hydrant to check schedule conflicts and manually navigate the subject listing to find interesting courses. Sometimes, there will be classes one will be interested in that they didn't even know they could take or that were being offered if they are maybe not in one's major. 

For example, I remember wanting to take a class in Anthropology and took "How culture works"- a pretty standard name for lookup. But as I scrolled through the subject listing, I came accross a class called "Images of Asian Women: Dragon Ladies and Lotus Blossoms". There is no way that I would have found that class, which would have been interesing to me, through a word search without prior knowledge of its existance.

It becomes evident how the process of subject discovery reduces mostly to word of mouth or a time consuiming search. On top of it all, finding lecturer and class ratings is on an entirely different website...

Without necessarily being conscious of it, they are setting constraints on a directed graph and discovering possible solutions with those constraints but in an unorganized, spontaneous, non exhaustive and especially volatile way. Usually students will make all edits on one same "road", and therefore will lose previous progress, or they might add extra subjects in a semester as placeholders. It would be rare that they create one new "road" for every set of constraints that they are exploring, because that would be too time consuming, repetitive and prone to error. However, they end up spending an equally large amount of time on this trial and error system as it is.

Additionally, there is no easy way to share a specific "road" with an advisor (or another student). This forces the student to reiterate to their advisor every semester what their overall plan, share screen, etc.

### **Corroboration:** 

Most of the evidence supporting my claim is based on the behavior I have observed in the students around me. It is very common to find students in common areas on campus, such as Stata or the Stud, with their computers open either on CourseRoad or Google Calendar. It is almost like a pastime but obviously exaggerated around registration week. Even during class time you might see people reiterating on their CourseRoad. This only comes to show that students spend a lot of time planning ahead on this website.

Moreover, I found [this MIT admissions article](https://mitadmissions.org/blogs/entry/a-walk-down-courseroad-lane/) from when CourseRoad first came out and, even though the website has been hugely improved since 2015, it is able to represent the sentiment I am trying to encapsulate. At some point Joel says, "*I’ve probably spent more time planning my courses at MIT than I have on all of my biology classes I’ve ever taken*", and this is exactly the bad situation that I think still exists today. Throughout the article, he also describes the thought process of a student using CourseRoad, in case the reader needed more clarification.

Lastly, I have personally asked some of my friends for features that they wish were available on CourseRoad, apart from the solution I describe in the section below, and they suggest professor ratings and on-site (without having to access Hydrant) approximations of when each class meets based on previous offerings to see if the classes they are combining would be compatible. These would be features I would like to incorporate in my solution although they are not the main drive of it.

### **Workarounds and comparables:** 

Hydrant is one small addition that allows you to check whether a set of classes would be compatible schedule-wise in a fast manner. Otherwise, the workaround is to add many different "roads", to modify one "road" and lose the current progress, or to add placeholders in each semester's slot, but then it loses organization.

In terms of subject listing, one either knows what class they want to take or in what department and skims their offerings, or bases their search on word of mouth. 

### **Solution sketch:** 

The idea is to be able to set certain constraints on our graph, e.g.: being a 6-3 major and therefore having to take all the 6-3 requirements at some point, in an allowed order, or knowing that at some point in your time at MIT you want to take 2.004, or that you want to take 2.004 specifically in your 5th semester.

The subjects can be represented as a directed acyclic graph, where each subject is a node and an edge from subject A to subject B represents that A is a pre-requisite for B. A student's plan can then be represented as a sequence of sets of subjects, where each set corresponds to a semester. For a subject to be included in a semester, all of its pre-requisites must have been taken in one of the previous semesters. Therefore, if the set of subjects already completed is the current state, the subjects that can be taken in the next semester are the ones whose pre-requisites are all contained in that state.

The first state would depend on the student. When creating a plan, the student could specify whether they already have credit for any subjects or requirements. These would make up the initial state. For a freshman with no previous credit, the initial state would simply be empty, and the system would determine which subjects can be taken in the first semester based on the student's requirements and the other constraints. For a sophomore in their Spring semester, the initial state would be the 3 sets of subjects they took in their first 3 semesters.

Other mandatory constraints will be the number of hours you would like to sleep per night, how many hours a day you spend on extracurriculars, taking care of yourself, etc.

Once all the constraints that the user desires have been configured, there will be a subset of plausible paths available to them for each configuration. An idea is to filter what paths to show by user's interest. Say they have decided on what technical classes to take and they know they want to take a HASS that semester but dont know which one yet, so they have left that slot blank. In that case, they could select what department to explore, or what topic, to shrink the number of possible "shortest paths".

Then, each road could be a specific locked constraint set, like when one saves the configuration of a filtered search. Hopefully this will help students save manual labor of trial and error and substitute with a direct visualization of the options available with each set of constraints.

### **Stakeholders:**

1. Student: Wants to optimize their schedule
2. Advisor: Gains access to the shared plans of all their advisees so they can easily review them and suggest changes.
3. Professors: Small courses benefit from a borader spectrum of students learning about their class.
4. Registrar: Website will serve as an incentive for the students to rate their classes, since the ratings become more accessible.

## **APPLICATION PITCH**

- **Name:** BFS this mess (bfsthismess.mit.edu)
- **Motivation:** Find list of possible shortest cours3e paths given a set of constraints.
- **Key features:**
    - FindPaths: Return a list of possible shortest paths fiven some constraints.
    - SubjectSuggest: Based on interests, suggest classes to fill requirements.
    - Shareability: Share your paths with your advisor for them to approve.

## **CONCEPT SPECIFICATIONS AND ESSENTIAL REACTIONS**
### **CONCEPTS**

1. **COURSE_OFFERING** 

    - **Purpose:** Store information about MIT subjects, including when subjects are offered and what pre-requisites/co-requisites they have, as well as any other information that could be useful when constructing a plan.

    - **Principle:** A course offering can be loaded from the [MIT Subject Listing](https://student.mit.edu/catalog/index.cgi) extracting key properties, such as its pre-requisites and the semesters in which it is offered. Ratings associated with each class and lecturer should also be extracted from MIT's [Subject Evaluation Reports](https://eduapps.mit.edu/ose-rpt/?Search+Online+Reports=Search+Subject+Evaluation+Reports) site.

    - **State:**
        * *courses*: a set of courses with
            * a name String
            * a course Id String
            * a description String
            * a lecturer String
            * semesters offered: a set of Strings

        * *prerequisites*: mapping from a course to its set of prerequisite courses (NOT recursive, if a prereq has a prereq, only list the direct pre-reqs)

        * *corequisites*: mapping from a course to its set of corequisite courses

        * *ratings*: mapping from a course to its class and professor ratings

    - **Actions:**
        * *load* (subjectListingURL: String, ratingsURL: String) : return (count: Number)
            * **where** subjectListingURL and ratingsURL can be retrieved and parsed
            * **then** extract the courses, course IDs, descriptions, lecturers, semesters offered, prerequisites, corequisites, and ratings. Store them in courses, corequisites and ratings respectively, and construct the prerequisite graph by adding an edge from each direct prerequisite to its course. Return the number of courses stored.

        * *prerequisites* (course: Course) : return (prerequisites: set of Course)
            * **where** course is in courses
            * **then** return the set of direct prerequisites of course if course in prerequisites, else return empty set.

        * *corequisites* (course: Course) : return (corequisites: set of Course)
            * **where** course is in courses
            * **then** return the set of corequisites of course if course in corequisites, else return empty set.

        * *isOffered* (course: Course, semester: String) : return (offered: Boolean)
            * **where** course is in courses
            * **then** return whether course is offered in semester.

        * *ratings* (course: Course) : return (classRating: Number, professorRating: Number)
            * **where** course is in courses and in ratings
            * **then** return the class and professor ratings associated with course.

        * *search* (query: String) : return (courses: set of Course)
            * **then** return every course whose name, description or course Id contains query.

### 2. **CONSTRAIN** [Subject]

- **Purpose:** Maintain the set of constraints that a user wants their course plans to satisfy.

- **Principle:** A user creates a road and adds constraints to it, such as a specific subject in a specific semester, or capping every semester at 4 subjects. They can later relax or remove a constraint to widen the set of valid plans. Possible plans can be found by checking against the constraints of the road to determine whether it is valid.

- **State:**
    * *roads*: a set of roads with
        * a name String
        * required: a set of Subjects (must be taken at some point)
        * elective_blocks: a set of sets of Subjects (one   subject must be taken from each block)
        * pins: a set of pins
        * a maxPerSemester Number (0 means no cap)
        * a maxTechnicalPerSemester Number (0 means no cap)

    * *pins*: a set of pins with
        * a Subject
        * a semester Number

- **Actions:**
    * *newRoad* (name: String) : return (road: Road)
        * **where** name is not empty
        * **then** create a new road with this name, no constraints and maxPerSemester set to 0, and return it.

    * *addRequirement* (road: Road, subject: Subject)
        * **where** road exists and subject is not excluded or credited in road
        * **then** add subject to the required subjects of road.

    * *removeRequirement* (road: Road, subject: Subject)
        * **where** road exists and subject a requirement
        * **then** remove subject from requirements

    * *addElectiveBlock* (road: Road, options: set of Subject)
        * **where** road exists and options is not empty
        * **then** add options to the elective blocks of road.

    * *removeElectiveBlock* (road: Road, options: set of Subject)
        * **where** road exists and options is an elective block of road
        * **then** remove options from the elective blocks of road.

    * *pin* (road: Road, subject: Subject, semester: Number)
        * **where** road exists and semester is at least 0
        * **then** If a pin for subject exists in road, set its semester to the given semester, otherwise create a new pin for subject with this semester and add it to road.

    * *cap* (road: Road, limit: Number)
        * **where** road exists and limit is at least 0
        * **then** set the maxPerSemester of road to limit (0 removes the cap).

    * *capTechnical* (road: Road, limit: Number)
        * **where** road exists and limit is at least 0
        * **then** set the maxTechnicalPerSemester of road to limit (0 removes the cap).

    * *unPin* (road: Road, subject: Subject)
        * **where** road exists and a pin for subject exists in road
        * **then** remove the pin from road and delete it

    * *satisfies* (road: Road, plan: list of set of Subject) : return (satisfied: Boolean)
        * **where** road exists
        * **then** return true if every required subject appears in some set of plan, every pin in road has its subject in the set of plan at the pin's semester, and, if maxPerSemester is not 0, no set of plan has more than maxPerSemester subjects. Otherwise return false.



### **REACTIONS**



## UI SKETCHES

## USER JOURNEY