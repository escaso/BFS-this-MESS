# BFS-this-MESS: Final Design

## Summary
BFS-this-MESS helps MIT students stop rebuilding the same road in CourseRoad. A student records what they have done, paints their weekly time budget, sets constraints on a road, and gets the shortest valid paths, each checked against their free hours, with ratings, and shareable with an advisor.

## Changes from the P1 concept design

**Concepts (P1 had CourseOffering, Constrain, Share, plus a planned SubjectSuggest)**
- **Added Authentication.** Roads and sharing needed real identities, so accounts, sessions and username lookup became a concept.
- **Added History.** P1 treated the past as pinned subjects in a locked semester. The journey showed that students need to enter it once per account, semester by semester, so every road starts from it. Locking and unlocking a semester became part of this concept.
- **Added TimeBudget.** P1 listed sleep and extracurriculars as constraints. They became a weekly grid painted in 15-minute blocks, with per-semester weeks, custom categories and a fits / tight / over verdict per semester. Estimated hours (class hours x 2) are always labelled as estimates.
- **Added Requirements.** Instead of typing requirements, a student picks a major and the GIRs from Fireroad data, and chooses among tracks.
- **Dropped SubjectSuggest.** Catalog search with ratings and schedules covers discovery for now; interest-based suggestion is future work.
- **Share is view-only.** An advisor sees plans and hours, but not what blocked time is for, unless the student chooses. Editing by others is future work.
- **Concept independence.** Constrain keeps its own copy of subject facts, copied from CourseOffering when the catalog loads, so no concept reads another's state. Reactions compose them and enforce access control.

**Access control**
- Every road request carries a session. Non-viewers get `NO_SUCH_ROAD`, so people cannot learn which roads exist. Viewers get `NOT_AN_OWNER` / `NOT_AN_EDITOR` for changes. A failed check changes nothing.

**Data**
- The catalog comes from a Fireroad snapshot committed to the repo, instead of live scraping.

## Changes from the P3 visual design
- Kept the rounded, bold typography and the contrasting subject palette.
- Added status language for time fit ("Fits", "Tight", "Over") and an access banner ("View only", "Shared by ...").
- Added modals for confirmations (unlocking a semester, resetting the week, deleting a category).
- Still to improve: distribute subject colors more evenly.

## Significant decisions
- **Locked history first:** paths only search after the locked semesters, which keeps the search small.
- **Hard mode:** only paths whose every semester fits the time budget are shown.
- **Known gap:** a prerequisite that is not prior credit, pinned, or in a block is never satisfied by the search.

## Links
Concept specs: `design/concepts/` at the final commit. Notebook: `documentation/notebook.md`.