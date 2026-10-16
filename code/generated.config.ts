import { httpWire } from "@mit-sdg/sync-engine-http/tooling";
import { assembleApplication } from "./src/assembly.ts";
import { policy } from "./src/http.ts";

export default {
  assemble: assembleApplication,
  title: "BFSThisMess",
  wireName: "BFSThisMessWire",
  design: {
    version: 1,
    documents: [
      new URL("./design/types.md", import.meta.url),
      new URL("./design/compositions/BFSThisMess.md", import.meta.url),
    ],
  },
  projections: [httpWire({ policy, name: "BFSThisMessWireHttp" })],
};