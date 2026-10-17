import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// The frontend lives in web/. In development and preview, Vite serves it and
// forwards API calls and health checks to the backend, so the browser only ever
// talks to one origin.
const backend = process.env.BACKEND_URL ?? "http://127.0.0.1:3000";
const proxy = { "/api": backend, "/health": backend };
const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 8080);

export default defineConfig({
  root: "web",
  plugins: [vue()],
  server: { host, port, strictPort: true, proxy },
  preview: { host, port, strictPort: true, proxy },
  build: { outDir: "../dist", emptyOutDir: true },
});
