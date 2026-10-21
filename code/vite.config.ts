import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// The frontend lives in web/. In development and preview, Vite serves it and
// forwards API calls and health checks to the backend, so the browser only ever
// talks to one origin.
const backend = process.env.BACKEND_URL ?? "http://127.0.0.1:3000";
// Note the trailing slash on "/api/": Vite matches proxy keys by prefix, so a
// bare "/api" would also swallow the frontend module "/api.ts" (web/api.ts) and
// send it to the backend, which answers 404 with no Content-Type.
const proxy = { "/api/": backend, "/health": backend };
const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 8080);

// The client's import chain reaches engine code that imports Node built-ins
// (node:crypto, node:util) for server-side hashing and logging. Vite's dev server
// tolerates that, but a production build fails. The browser never calls these
// paths, so give it small stand-ins (randomUUID is the only one that works).
const nodeStubs: Record<string, string> = {
  "node:crypto": `export const randomUUID = () => globalThis.crypto.randomUUID();
export const createHash = () => { throw new Error("createHash is not available in the browser"); };`,
  "node:util": `export const inspect = (value) => String(value);`,
};
const browserNodeStubs = {
  name: "browser-node-stubs",
  enforce: "pre" as const,
  resolveId: (id: string) => (id in nodeStubs ? `\0${id}` : null),
  load: (id: string) => (id.startsWith("\0node:") ? nodeStubs[id.slice(1)] : null),
};

export default defineConfig({
  root: "web",
  plugins: [browserNodeStubs, vue()],
  // The sync-engine client pulls in the engine's logger, which reads
  // `process.env` (a Node/Bun global the browser lacks). Give the browser an
  // empty one so the logger falls back to its defaults.
  define: { "process.env": {} },
  server: { host, port, strictPort: true, proxy },
  preview: { host, port, strictPort: true, proxy },
  build: { outDir: "../dist", emptyOutDir: true },
});