# History, the weekly time budget, and plans that fit

This note explains how the parts added after sharing work together: the account history, the weekly time budget, class hours, and judging plans against free time. The specs in `design/` are the source of truth. This note gives the reasons behind them and the limits.

## What the student sees

1. **History** (`#history`). A new account goes through four steps, and can stop and resume at any point:
   - credit from before MIT;
   - the first semester (Fall or Spring);
   - every past semester, IAP and summer included;
   - a review.

   An answered semester is locked. Unlocking one (with a confirmation) allows corrections. Warnings, which never block, point out prerequisites that the history doesn't meet, and planned subjects that a correction breaks. Accounts made before this part existed are nudged on the start page to finish it.
2. **Week** (`#week`). A 7 × 24-hour grid stored in 15-minute slots, viewable in 15-, 30- or 60-minute rows. The student paints blocked time in categories:
   - the time-budgeting worksheet's own categories;
   - categories of their own;
   - "In class", which comes from the classes of a plan and is never painted.

   Blocks may run past midnight. Under the grid, a table adds up hours per category per day, with blocked + free = 168 a week. A semester can get a week of its own, which starts as a copy of the regular one and can be reset to it. The same page holds the study settings: the reserve (default 10%) and the study factor (default 2, from 2 to 3).
3. **Paths.** Every semester of every path shows:
   - hours in class and outside it;
   - blocked time;
   - free time: 168 − blocked − in class;
   - study time left: free − outside class;
   - a status.

   The status is ✓ Fits when study ≤ free × (1 − reserve), ⚠ Tight when it fits only by using the reserve, and ✕ Over otherwise.

   Clicking a Fall or Spring semester shows its classes on the week, with sections picked automatically. Owners and editors can swap any of them. IAP and summer are counted in hours only. A table compares the paths.
4. **Soft or hard.** Each road is soft by default: every path is shown with its hours. A hard road shows only paths whose unlocked semesters all fit. If none fits, it says which semester of each path doesn't fit, and by how much.
5. **Sharing.** By default, people a road is shared with see hours only: the classes, their sections and the totals, but no blocked time, category or time of day. The owner can choose to share their blocked time as well.

## Where the numbers come from

**Class schedules and hours.** These come from FireRoad, through the committed catalog snapshot (`bun run catalog:build`), not through calls from the browser. The snapshot keeps three things per subject:
- its raw schedule string;
- the hours students reported in subject evaluations (`in_class_hours`, `out_of_class_hours`);
- its lecture + lab + design units.

`src/catalog/schedule.ts` parses the schedule string into parts (lecture, recitation, lab, design), section options and meetings when the catalog loads. It is tested on real FireRoad strings, and it skips and reports the handful of free-text oddities FireRoad has, such as `"wed,"` and `"Recit,"`.

**FireRoad publishes the schedule of the current term only, and doesn't say which term that is.** The build infers it: it picks the term whose single-term subjects most often have a schedule. In October 2026 that was Fall 2026, with schedules for 1,249 of 2,432 fall-only subjects but only 50 of 2,932 spring-only ones. A schedule then counts as:
- **exact** for that season;
- **an estimate** for the same term in another year, labelled as such;
- **absent** for other terms, which show hours but no placement.

The MIT Data Warehouse (used by the original CourseRoad) needs MIT credentials, so it isn't used.

**In-class hours** come from the first of these that is known:
1. the schedule, using each part's most common section length;
2. subject evaluations;
3. lecture + lab units;
4. 3 hours, as for a typical 12-unit subject.

**Out-of-class hours** come from subject evaluations when known. Otherwise they come from the worksheet's formula: contact hours × the study factor. The factor can be set per subject or for all subjects. The source of every number is shown next to it.

## Decisions, and why

- **No CourseRoad term numbers.** Seasons (year + Fall/IAP/Spring/Summer) and prior credit already model every term. Labels like "Sophomore fall" are worked out for display only.
- **History is per account; locks are per road.** History is a concept of its own, and the composition copies it into every road the student owns (`Constrain.applyHistory`) after each change. Semesters placed from history are marked `fromHistory`, and can't be changed on the road itself. Roads shared with the student are not theirs, so their history doesn't reach them. A copied road gets the copier's history. While a past semester is unlocked in the history to be corrected, it stays locked in the roads, so path generation never plans into the past.
- **Migrations.** There is no migration framework. New fields that are absent read as their defaults. `bun scripts/migrate-history.ts up` writes those defaults explicitly. `down` removes them; with `--drop` it also deletes the History and TimeBudget collections.
- **Feasibility is one function**, `feasibility()` in `src/concepts/TimeBudget.ts`, so that a heavier load around midterms and finals can be added in one place.
- **The section picker** (`src/concepts/sections.ts`) is a backtracking search:
  - It starts with the class part that has the fewest sections.
  - It abandons a partial pick as soon as it can't beat the best so far.
  - It stops at zero conflicts, or after 20,000 steps with the best pick found.

  A conflict is a meeting together with each block it overlaps, or two overlapping meetings of different classes. The search is deterministic, and sections picked by hand are kept. Picks are cached by week version, subjects, semester and hand picks.
- **Hard mode filters after the search, not inside it.** Whether a semester fits depends on all of its subjects together, against a week the planner doesn't know about. The planner builds a few good plans rather than searching all of them, so it can't drop a subject for its hours without changing which plans it finds. Instead, a hard road builds 3× as many candidates, and TimeBudget keeps the first ones that fit. Locked semesters are never judged.
- **Plans are measured against the owner's week**, whoever looks at them, so everyone on a road sees the same numbers. The owner's username is still never shown to someone who may not know it.
- **Privacy is enforced on the server.** In hours-only mode, the semester schedule sent to anyone but the owner has no blocks and no categories. Its conflicts include only class-against-class ones, with just a count of conflicts with blocked time. `test/privacy.test.ts` searches every answer an advisor can get about the road for the owner's category name, id and colour.

## Limits

- Section times exist only for the term FireRoad publishes. Spring semesters show hours but no grid until the spring schedule is published and the snapshot is rebuilt.
- Joint subjects carry the same schedule under each number. Half-term subjects (171 of them) are counted as full-term.
- Subjects must be in the current catalog to be added to the history, so old numbers (6.006 for 6.1210) are refused. FireRoad has an `old_id` field that could map them in a later change.
- The automatic section picker avoids blocked time, so in hours-only mode, which sections it picks can hint at when the owner is busy. Hand-picked sections avoid that.
- The `.vue` templates aren't type-checked: `vue-tsc` doesn't support the TypeScript version used here.
- A request or action field named `length` makes the sync engine leave the request unanswered. TimeBudget's API calls a block's length `slots` for that reason.
