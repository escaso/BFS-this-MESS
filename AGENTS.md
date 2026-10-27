## Running the app

- `bun run dev` starts MongoDB in a container, then the backend at http://127.0.0.1:3000 and the frontend at http://127.0.0.1:8080, both in watch mode.
- `bun run up` runs all three in containers. `bun run down` stops them, and `bun run db:reset` deletes the local data.
- Change `design/` before the code. Check it with `bun run check:design`, then run `bun run generate` and `bun run check`.- Once a semester, `bun run catalog:build` refreshes `catalog/snapshot.json` (subjects) and `catalog/requirements.json` (major and GIR requirements) from Fireroad. Review the diffs and commit them. The server loads new snapshots into CourseOffering, Constrain and Requirements when it starts (it takes a few seconds), and `bun run catalog:import [--force]` loads them into the database right away.
- `bun scripts/migrate-history.ts up` writes the defaults for account history and time budgets into existing data; `down [--drop]` reverses it (see `documentation/time-budget.md`).
