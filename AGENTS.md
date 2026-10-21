## Running the app

- `bun run dev` starts MongoDB in a container, then the backend at http://127.0.0.1:3000 and the frontend at http://127.0.0.1:8080, both in watch mode.
- `bun run up` runs all three in containers. `bun run down` stops them, and `bun run db:reset` deletes the local data.
- Change `design/` before the code. Check it with `bun run check:design`, then run `bun run generate` and `bun run check`.- Once a semester, `bun run catalog:build` refreshes `catalog/snapshot.json` from Fireroad. Review the diff and commit it. The server loads a new snapshot into CourseOffering and Constrain when it starts (it takes a few seconds), and `bun run catalog:import [--force]` loads it into the database right away.
