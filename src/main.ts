import { join } from "node:path";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "./assembly.ts";
import { policy } from "./http.ts";
import { db } from "./db.ts";

const dist = join(import.meta.dir, "..", "dist");

const application = assembleApplication();
const gateway = createGateway({ application });
const api = createHttpHandler({ application, gateway, policy });

const server = Bun.serve({
  hostname: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 3000),
  routes: {
    "/api/*": api,
    "/health": async () => {
      try {
        await db.collection("reserving.reservations").findOne({}, { maxTimeMS: 2000, timeoutMS: 3000 });
        return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
      } catch {
        return Response.json(
          { status: "unavailable" },
          { status: 503, headers: { "Cache-Control": "no-store" } },
        );
      }
    },
  },
  // Anything that is not an API or health route is the built frontend: serve the
  // file if it exists in dist/, otherwise index.html so the single-page app loads.
  async fetch(req) {
    const path = new URL(req.url).pathname;
    const file = Bun.file(join(dist, path));
    if (path !== "/" && file.name?.startsWith(dist) && (await file.exists())) return new Response(file);
    return new Response(Bun.file(join(dist, "index.html")));
  },
});

console.log(`Backend listening on ${server.url}`);