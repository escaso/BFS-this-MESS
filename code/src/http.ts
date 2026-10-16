import { httpPolicy } from "@mit-sdg/sync-engine-http/policy";

export const policy = httpPolicy({
  basePath: "/api",
  publicErrors: {
    // Constrain
    // NO_SUCH_ROAD: "NOT_FOUND",
    // REQUIREMENT_NOT_MET: "CONFLICT",
    // ELECTIVE_BLOCK_NOT_FOUND: "NOT_FOUND",
    // PIN_NOT_FOUND: "NOT_FOUND",
    // // Share (registered, but not used by the MVP composition yet)
    // ROAD_ALREADY_OWNED: "CONFLICT",
    // NOT_AN_OWNER: "FORBIDDEN",
    // // Authentication (same)
    // USERNAME_TAKEN: "CONFLICT",
    // INVALID_CREDENTIALS: "UNAUTHORIZED",
    // NO_SUCH_SESSION: "UNAUTHORIZED",
  },
});