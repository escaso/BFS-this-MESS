# BFS-this-MESS

BFS-this-MESS is a course planner for MIT undergraduates. Instead of dragging subjects around by trial and error, a student records their history, paints their weekly time budget, sets constraints on a "road", and the app computes the shortest valid paths that fit, with class ratings, hours and sharing with an advisor. It is built with Bun, MongoDB, Vue.js and [sync-engine](https://github.com/mit-sdg/sync-engine) (concept design).

**Live app:** [https://bfs-this-mess.mit-sdg.dev](https://bfs-this-mess.mit-sdg.dev/)

**Final demo video (3 min):** [https://youtu.be/-OwBFTpCWnw](https://youtu.be/-OwBFTpCWnw)
## Project materials

- [Final design document](documentation/final-design.md): how the design changed from P1 and P3
- [Original concept design (P1)](documentation/design.md)
- [Design notebook](documentation/notebook.md) and [time budget notes](documentation/time-budget.md)
- Concept specifications: [design/concepts/](design/concepts/), [composition and reactions](design/compositions/BFSThisMess.md), [types](design/types.md)
- Tests: [test/](test/)

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

## Running locally

Requirements: [Bun](https://bun.sh) and Podman (or Docker) for MongoDB.

1. `bun install`
2. Copy `.env.example` to `.env` (it points at the local MongoDB).
3. `bun run dev` starts MongoDB in a container, then the backend at http://127.0.0.1:3000 and the frontend at http://127.0.0.1:8080. The catalog snapshot loads when the server starts (a few seconds).
4. Alternatively, `bun run up` runs everything in containers and `bun run down` stops it. `bun run db:reset` deletes local data.

## Testing

With MongoDB running (`bun run db:up`), run `bun test`. Tests cover each concept's operational principle, other scenarios and error cases, plus access control (`test/privacy.test.ts`, `test/sharing.test.ts`). `bun run check` runs the sync-engine, spec and type checks.

## Maintenance

- `bun run catalog:build` refreshes `catalog/snapshot.json` and `catalog/requirements.json` from Fireroad once a semester. Review the diffs and commit them.
- `bun run catalog:import [--force]` loads the catalog into the database right away.
- Change `design/` before the code, then run `bun run check:design` and `bun run generate`.

## Screen recording

[Final demo video](https://youtu.be/-OwBFTpCWnw)