import { httpPolicy } from "@mit-sdg/sync-engine-http/policy";

// Every refusal code a client may see must be listed here; an unlisted one reaches
// the client as INTERNAL_ERROR. The client only gets the category, so on any one
// endpoint two different refusals never share one (web/api.ts words each per endpoint):
// e.g. on shareRoad, NO_SUCH_USER is INVALID_REQUEST while NO_SUCH_ROAD is NOT_FOUND.
export const policy = httpPolicy({
  basePath: "/api",
  publicErrors: {
    // Composition checks
    NO_SUCH_SESSION: "UNAUTHORIZED",
    NO_SUCH_ROAD: "NOT_FOUND",
    NO_SUCH_BLOCK: "NOT_FOUND",
    NOT_AN_OWNER: "FORBIDDEN",
    NO_SUCH_USER: "INVALID_REQUEST",
    NO_SUCH_MAJOR: "INVALID_REQUEST",
    // Authentication
    EMPTY_CREDENTIALS: "INVALID_REQUEST",
    USERNAME_TAKEN: "CONFLICT",
    INVALID_CREDENTIALS: "UNAUTHORIZED",
    // Share
    ROAD_ALREADY_OWNED: "CONFLICT",
    SHARE_WITH_OWNER: "CONFLICT",
    NOT_SHARED: "CONFLICT",
    NOT_AN_EDITOR: "FORBIDDEN",
    EDITORS_ADD_VIEWERS: "FORBIDDEN",
    BAD_ROLE: "INVALID_REQUEST",
    INVALID_LINK: "NOT_FOUND",
    // CourseOffering and Requirements
    LOAD_FAILED: "INVALID_REQUEST",
    NO_SUCH_CHOICE: "NOT_FOUND",
    NOT_AN_ALTERNATIVE: "NOT_FOUND",
    // Constrain
    EMPTY_NAME: "INVALID_REQUEST",
    BAD_START: "INVALID_REQUEST",
    END_BEFORE_START: "INVALID_REQUEST",
    EMPTY_MAJOR: "INVALID_REQUEST",
    NOT_PRIOR: "NOT_FOUND",
    BAD_COUNT: "INVALID_REQUEST",
    NOT_AN_OPTION: "NOT_FOUND",
    NO_LISTING: "NOT_FOUND",
    ALREADY_PRIOR: "CONFLICT",
    OUT_OF_SPAN: "INVALID_REQUEST",
    LOCKED_SEASON: "CONFLICT",
    NOT_PINNED: "NOT_FOUND",
    BAD_CAP_TYPE: "INVALID_REQUEST",
    NEGATIVE_LIMIT: "INVALID_REQUEST",
    NO_SUCH_SEMESTER: "NOT_FOUND",
  },
});
