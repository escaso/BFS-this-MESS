# User Testing: Task List

Participants role-play Omar, a student in 6-3 (Computer Science and Engineering), using the persona card below. It lists his credit prior to coming to mit, what he has taken in his previous semesters if any, general interests, and weekly commitments. Testers are read the task instructions below, and must attempt them on behalf of Omar's persona. They have access to the card the whole time

## Persona card

**Omar, sophomore in 6-3 (Computer Science and Engineering)**

| Fact | Omar's answer |
| --- | --- |
| Started at MIT | Fall 2025 |
| Credit from before MIT | 18.01 |
| Fall 2025 | 6.100A, 18.02, 8.01 |
| IAP 2026 | Nothing |
| Spring 2026 | 6.1200, 18.03, 8.02 |
| Summer 2026 | Nothing |
| Weekly commitments | Library job, Tuesday and Thursday, 1:00 to 5:00 pm. Band rehearsal, Saturday, 10:00 am to 12:00 pm (he wants a new category called "Band") |
| Interests | Music and economics |
| His goal | Plan his remaining semesters without overloading himself |

## Tasks

| # | Title | Instruction | Rationale |
| --- | --- | --- | --- |
| 1 | Create an account | You have heard about a new tool for planning your MIT classes. Create an account so you can start using it. | Can the user identify (find) that there is a register button, click it and proceed with registration?|
| 2 | Record your history | Tell the app what Omar has already done, before and during MIT. | The app should immediately tak them to this screen as they register, so there should be no confusion on getting to the right page. However, the screen does start introducing concepts like locking and unlocking of a semester that could be confusing. I also want to learn whether the option to return and correct a semester is understood, and whether people can stop partway and resume. It tests both the gulf of execution (finding how to add a class) and evaluation (knowing a semester is saved). |
| 3 | Describe your week | Show the app how Omar spends a typical week outside of class. | Are the users able to find all the information on the page? Will it be intuitive for the users to drag accross the grid to add constraints? Will they notice the default activities (sleep, shower and eating)? If so, will they like them? I am curious to see also if they are able to make sense of the hours table and study settings beside the grid. Watching where they click around shows which parts of this page are not self-explanatory.|
| 4 | Make a plan | Make a plan that gets Omar through his degree in his major. | The app calls a plan a "road", but users will say "plan". This tests whether the vocabulary and the form fields (name, major from a long list, first semester) are understood. It also shows whether users find the place to adjust requirements and whether the plan loads fast enough to feel responsive. |
| 5 | Compare plans | Look at the plans the app suggests. Decide which one Omar should follow, and tell me why. | The comparison table, the "Fits / Tight / Over" labels and the colour legend are all app-specific terms, so a walkthrough cannot tell me if they communicate. Having a user decide aloud tests the gulf of evaluation: do they read the table, understand "busiest week" and "least study time left", and notice that plans update when they change constraints? |
| 6 | Look up a class | Find out who teaches Introduction to Algorithms, 6.1210, and whether students rate it well. Then do the same for a class that is not in Omar's plan (evaluator can pick one from memory, for example 8.05 will likely not be in a 6-3 path). | We can access course evals from the Catalog tab or by clicking the class. I want to see what the students find more useful and whether it seems like too much information in the semester view vs. an appropriate amount in the Catalog section?|
| 7 | Find a HASS class | Omar likes music. Find a humanities, arts or social science class about music for him, and put it in his plan. | HASS (humanities, arts and social science) requirements are reached through open "+" cards in a plan, not through a catalog filter, a route I only know because I built it. This reveals whether users look in the catalog first, whether they notice the cards at all, and whether they understand that choosing a class there fixes it in place. Also curious to see if anyone tries to go through the "Edit constraints" tab.|
| 8 | Check fit with your week | Look at this semester's classes, Fall 2026. Do any clash with Omar's job or band? If so, fix it. | Showing classes over the student's own blocked time and letting them swap sections is the app's signature feature, and the one most dependent on being discovered. This tests whether users click a semester instead of a single class, notice a clash that is marked by hatching and a warning rather than colour alone, and find the control for swapping a section. |
| 9 | Keep a class in a semester | Omar wants 6.1210 in spring 2027. Make that happen. | Classes are added through the "Edit constraints" tab, unless the user is lucky and can pin it from the semester view. This shows which route users try first, whether they expect the pin icon on a class to move it or if they have intuition to go to the constrains tab. |
| 10 | Lock a semester | Omar is sure about one upcoming semester (examinator choose one) and does not want the app to change it. Keep it fixed. | Locking and pinning sound alike but behave differently, and a second kind of lock sits in the constraints settings. A walkthrough cannot tell me whether users separate the two ideas. I want to see which they reach for and whether the result matches what they expected. |
| 11 | Switch major | Omar decides to study mathematics instead. Change his plan to that. | Changing major replaces the plan's requirements, but I think it is placed in an unobvious spot. This tests findability, whether users look in a profile or settings first, and whether they understand what happens to the pins and locks from earlier tasks. |
| 12 | Log out and back in | Log out, then log back in. Is everything still there? | A persistence check needs data to potentially lose, which is why it comes late. Beyond confirming nothing is lost, it shows whether the log-out and log-in steps are easy to find and use. |
| 13 | Share with an advisor (if there is time) | Show Omar's plan to his advisor so they can see his hours but not what his blocked time is for. | Sharing is a privacy feature whose default (hours only) is set in a separate place from the share dialog. This tests whether users understand what an advisor will actually see, find the setting that controls it, and choose a username or a link. |