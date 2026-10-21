// Tests for the catalogSources computation of the BFSThisMess composition,
// written against design/compositions/BFSThisMess.md (Catalog section):
//
//   Answers trusted = true when subjectListingURL is an https URL on
//   student.mit.edu and ratingsURL is an https URL on eduapps.mit.edu, and
//   trusted = false otherwise, including when either is not a valid URL.
//
// Run with: bun test test/catalogSources.test.ts

import { describe, test, expect } from "bun:test";
import { catalogSources } from "../src/concepts.ts";

/*
 * Testing strategy
 *
 * partition on each URL: valid https on its own host, http on its own host,
 *   https on the other site's host, https on a look-alike host (suffix, subdomain,
 *   userinfo trick), not a valid URL, empty
 * partition on which URL is untrusted: neither, listing only, ratings only, both
 * partition on outcome: trusted, not trusted
 */

const LISTING = "https://student.mit.edu/catalog/m6a.html";
const RATINGS = "https://eduapps.mit.edu/ose-rpt/subjectEvaluationSearch.htm";

const trusted = (subjectListingURL: string, ratingsURL: string) =>
  catalogSources({ subjectListingURL, ratingsURL });

describe("catalogSources", () => {
  test("both https on their own sites -> trusted", () => {
    expect(trusted(LISTING, RATINGS)).toEqual({ trusted: true });
    expect(trusted("https://student.mit.edu/", "https://eduapps.mit.edu/")).toEqual({ trusted: true });
  });

  test("http instead of https -> not trusted", () => {
    expect(trusted("http://student.mit.edu/catalog/m6a.html", RATINGS)).toEqual({ trusted: false });
    expect(trusted(LISTING, "http://eduapps.mit.edu/ose-rpt/")).toEqual({ trusted: false });
  });

  test("URLs swapped between the two sites -> not trusted", () => {
    expect(trusted(RATINGS, LISTING)).toEqual({ trusted: false });
    expect(trusted(LISTING, LISTING)).toEqual({ trusted: false });
    expect(trusted(RATINGS, RATINGS)).toEqual({ trusted: false });
  });

  test("look-alike hosts -> not trusted", () => {
    for (const listing of [
      "https://student.mit.edu.evil.example/catalog",
      "https://evil.example/student.mit.edu",
      "https://student.mit.edu@evil.example/",
      "https://mit.edu/catalog",
    ]) {
      expect(trusted(listing, RATINGS)).toEqual({ trusted: false });
    }
    expect(trusted(LISTING, "https://eduapps.mit.edu.evil.example/")).toEqual({ trusted: false });
  });

  test("an invalid or empty URL -> not trusted", () => {
    expect(trusted("not a url", RATINGS)).toEqual({ trusted: false });
    expect(trusted(LISTING, "")).toEqual({ trusted: false });
    expect(trusted("", "")).toEqual({ trusted: false });
  });
});
