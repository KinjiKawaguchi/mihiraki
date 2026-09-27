import { describe, expect, it } from "vitest";
import { parseRouteData } from "./route-data";

const response = {
  payload: {
    pullRequestsChangesRoute: {
      comparison: { fullDiff: { baseOid: "b".repeat(40), headOid: "c".repeat(40) } },
      diffSummaries: [
        {
          path: "docs/design.md",
          changeType: "MODIFIED",
          markersMap: {
            R12: { threads: [{ id: 101 }], annotations: [] },
            R68: { threads: [{ id: 102, start: "R57" }] },
            L4: { threads: [{ id: 103 }] },
          },
        },
        { path: "src/app.ts", changeType: "MODIFIED", markersMap: {} },
        { path: "docs/new.markdown", changeType: "ADDED" },
        { path: "docs/moved.md", changeType: "RENAMED" },
      ],
      // Summaries carry no previous path; the diff entries do (observed on github.com, 2026-09).
      diffContents: [
        {
          path: "docs/moved.md",
          status: "RENAMED",
          oldTreeEntry: { mode: 100644, path: "old/moved.md", lineCount: 3 },
          newTreeEntry: { mode: 100644, path: "docs/moved.md", lineCount: 3, isGenerated: false },
        },
      ],
      markers: {
        threads: {
          "101": {
            id: 101,
            subjectType: "LINE",
            isResolved: false,
            commentsData: {
              comments: [
                {
                  databaseId: 9001,
                  author: { login: "alice", avatarUrl: "https://avatars.example/alice" },
                  bodyHTML: "<p>Why?</p>",
                  createdAt: "2026-09-01T00:00:00Z",
                  url: "https://github.com/acme/docs/pull/1#discussion_r9001",
                },
              ],
            },
          },
          "102": { id: 102, subjectType: "LINE", isResolved: true, commentsData: { comments: [] } },
          "103": {
            id: 103,
            subjectType: "LINE",
            isResolved: false,
            isOutdated: true,
            commentsData: {
              comments: [
                {
                  databaseId: 9003,
                  state: "pending",
                  author: { login: "me" },
                  bodyHTML: "<p>draft</p>",
                },
              ],
            },
          },
          "104": {
            id: 104,
            subjectType: "FILE",
            isResolved: false,
            commentsData: { comments: [] },
          },
        },
      },
    },
  },
};

describe("parseRouteData", () => {
  it("reads the commits being compared", () => {
    const route = parseRouteData(response);

    expect(route.revision).toEqual({ base: "b".repeat(40), head: "c".repeat(40) });
  });

  it("rejects commits that are not commit hashes", () => {
    const broken = structuredClone(response);
    broken.payload.pullRequestsChangesRoute.comparison.fullDiff.headOid = "main";

    expect(() => parseRouteData(broken)).toThrow(/pull request/);
  });

  it("lists changed files with their change type", () => {
    expect(parseRouteData(response).files).toEqual([
      { path: "docs/design.md", changeType: "MODIFIED" },
      { path: "src/app.ts", changeType: "MODIFIED" },
      { path: "docs/new.markdown", changeType: "ADDED" },
      { path: "docs/moved.md", previousPath: "old/moved.md", changeType: "RENAMED" },
    ]);
  });

  it("shows a rename without a diff entry as an added file, since its base cannot be found", () => {
    // Large pull requests load the diff entries of later files only as they are scrolled to.
    const route = parseRouteData({
      payload: {
        pullRequestsChangesRoute: {
          ...response.payload.pullRequestsChangesRoute,
          diffSummaries: [{ path: "docs/moved.md", changeType: "RENAMED" }],
          diffContents: [],
        },
      },
    });

    expect(route.files).toEqual([{ path: "docs/moved.md", changeType: "ADDED" }]);
  });

  it("locates line threads through the markers map", () => {
    const threads = parseRouteData(response).threads;

    expect(threads.map((t) => [t.id, t.path, t.side, t.lines, t.isResolved, t.isOutdated])).toEqual(
      [
        ["101", "docs/design.md", "head", { start: 12, end: 12 }, false, false],
        ["102", "docs/design.md", "head", { start: 57, end: 68 }, true, false],
        ["103", "docs/design.md", "base", { start: 4, end: 4 }, false, true],
      ],
    );
  });

  it("keeps only the last line when a range start does not fit the same side before it", () => {
    const route = parseRouteData({
      payload: {
        pullRequestsChangesRoute: {
          ...response.payload.pullRequestsChangesRoute,
          diffSummaries: [
            {
              path: "docs/design.md",
              markersMap: {
                R12: { threads: [{ id: 101, start: "L3" }] },
                R68: { threads: [{ id: 102, start: "R90" }] },
              },
            },
          ],
        },
      },
    });

    expect(route.threads.map((t) => t.lines)).toEqual([
      { start: 12, end: 12 },
      { start: 68, end: 68 },
    ]);
  });

  it("marks threads whose comments belong to an unsubmitted review as pending", () => {
    const threads = parseRouteData(response).threads;

    expect(threads.map((t) => [t.id, t.isPending])).toEqual([
      ["101", false],
      ["102", false],
      ["103", true],
    ]);
  });

  it("maps comment authors and rendered bodies", () => {
    const [first] = parseRouteData(response).threads;

    expect(first?.comments).toEqual([
      {
        id: "9001",
        author: "alice",
        avatarUrl: "https://avatars.example/alice",
        bodyHtml: "<p>Why?</p>",
        createdAt: "2026-09-01T00:00:00Z",
        url: "https://github.com/acme/docs/pull/1#discussion_r9001",
      },
    ]);
  });

  it("tells whether the viewer has an unsubmitted review", () => {
    const withPending = structuredClone(response);
    (withPending.payload.pullRequestsChangesRoute as Record<string, unknown>).viewerPendingReview =
      { id: 5, comments: [] };

    expect(parseRouteData(response).hasPendingReview).toBe(false);
    expect(parseRouteData(withPending).hasPendingReview).toBe(true);
  });

  it("rejects a response without the comparison commits", () => {
    expect(() => parseRouteData({ payload: {} })).toThrow(/pull request/);
  });
});
