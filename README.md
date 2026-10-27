# **BFS-this-MESS**

## USER JOURNEY
Omar is a junior in 6-3 and it is the week before registration. Instead of editing the same road in CourseRoad again, he registers for BFS-this-MESS, and the app walks him through his history first: the credit he brought from high school (AP Calculus counts as 18.01), the semester he started (Fall 2024), and then, one past semester at a time, including IAP and the summer, what he took. "Nothing this term" is an answer too. He stops after his sophomore fall to go to class, and picks up where he left off that evening. Each answered semester is locked, and every road he makes starts from it. When he notices he put 18.03 in the wrong semester, he unlocks that semester, moves it, and locks it again; the app warns him that a subject planned for next spring needs 18.03 first.

He then paints his regular week: 8 hours of sleep, meals, crew practice at 5:30am, and a campus job on Tuesday and Thursday afternoons, each block 15 minutes at a time, with a category of his own for crew. The table under the grid adds it up like his old time-budgeting worksheet: 168 hours in a week, 97 of them spoken for, 71 left for classes and study. Next spring he will have an internship on Fridays, so he gives Spring 2027 a week of its own.

He creates a road and sets his constraints: the 6-3 requirements, at most 4 subjects per semester (3 of them technical), and 6.1220 pinned to the semester he wants it in. He then requests possible paths, and the application computes and displays the shortest valid plans for his road, with his locked semesters first and his pins marked. Each semester says whether its study fits his free time: "✓ Fits · 31 h free", "⚠ Tight" when it only fits by eating into the 10% he keeps in reserve for midterms, or "✕ Over". Hours come from the class schedule and from subject evaluations, and where neither says, from the worksheet's rule of thumb (class hours × 2), always labelled as an estimate.

Omar compares the paths side by side, by when they finish, units, their busiest week and the study time they leave, as well as class ratings. Clicking a fall semester shows its classes on his week, with sections picked to avoid his crew practice and each other; one recitation still clashes with his job, so he swaps it for another section. He switches the road to hard, so that only paths whose every semester fits are shown.

Finally he shares the road with his advisor. By default the advisor sees his plans and their hours, but not what his blocked time is for or when it is; he could choose to share that too.

## VISUAL DESIGN STUDY
* Use rounded edges to inspire mindfulness and relaxation.
* Use colors that are contrasting (although not painful to the eye) especially for subjects. This has to be improved in the next version, because right now I have selected a palette but colors could be distributed more evenly
* Use a typography that is rounded, bold, and looks natural. This app is not for creativity- it is a planner, and therefore should have a formal and deterministic feel.
![Colors](documentation/Colors.jpg)
![Typography](documentation/Typography.jpg)

## SCREEN RECORDING

https://youtu.be/ZT8TmaLoSi4