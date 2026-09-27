import { describe, expect, it } from "vitest";
import { commitId } from "./commit-id";
import { createMemoryBackend } from "./memory-backend";
import type { CommentTarget } from "./types";

const revision = { base: commitId("b1b1b1b"), head: commitId("c1c1c1c") };
const files = {
  "docs/a.md": { base: "old a\n", head: "new a\n" },
  "docs/b.md": { base: null, head: "b\n" },
  "docs/c.md": { base: "c\n", head: null },
};
const target: CommentTarget = {
  path: "docs/a.md",
  side: "head",
  lines: { start: 1, end: 1 },
  revision,
};

describe("createMemoryBackend", () => {
  it("lists the given files with a change type derived from which versions exist", async () => {
    const backend = createMemoryBackend(files);

    expect(await backend.listChangedMarkdownFiles()).toEqual([
      { path: "docs/a.md", changeType: "MODIFIED" },
      { path: "docs/b.md", changeType: "ADDED" },
      { path: "docs/c.md", changeType: "REMOVED" },
    ]);
  });

  it("returns both versions of a file, null where the file does not exist", async () => {
    const backend = createMemoryBackend(files, [], { revision });

    expect(await backend.loadFileVersions({ path: "docs/b.md", changeType: "ADDED" })).toEqual({
      revision,
      base: null,
      head: "b\n",
    });
  });

  it("stores posted comments as new threads with rendered bodies", async () => {
    const backend = createMemoryBackend(files);

    const result = await backend.postComment(
      { ...target, lines: { start: 1, end: 2 } },
      "Looks **good**",
      "single",
    );
    const [thread] = (await backend.loadThreads()).threads;

    expect(result).toEqual({ ok: true, value: undefined });
    expect(thread).toMatchObject({
      path: "docs/a.md",
      side: "head",
      lines: { start: 1, end: 2 },
      isResolved: false,
      isPending: false,
    });
    expect(thread?.comments[0]?.bodyHtml).toContain("<strong>good</strong>");
  });

  it("keeps comments posted as part of a review pending", async () => {
    const backend = createMemoryBackend(files);

    await backend.postComment(target, "later", "review");
    const snapshot = await backend.loadThreads();

    expect(snapshot.threads[0]?.isPending).toBe(true);
    expect(snapshot.hasPendingReview).toBe(true);
  });

  it("refuses a single comment while a review is pending, as it would publish that review", async () => {
    const backend = createMemoryBackend(files);
    await backend.postComment(target, "later", "review");

    const result = await backend.postComment(target, "now", "single");

    expect(result).toEqual({ ok: false, error: { kind: "pendingReviewConflict" } });
    expect((await backend.loadThreads()).threads).toHaveLength(1);
  });

  it("has no pending review until a comment is added to one", async () => {
    expect((await createMemoryBackend(files).loadThreads()).hasPendingReview).toBe(false);
  });

  it("reports the revision its versions and threads belong to", async () => {
    const backend = createMemoryBackend(files, [], { revision });

    expect((await backend.loadThreads()).revision).toEqual(revision);
    expect(
      (await backend.loadFileVersions({ path: "docs/a.md", changeType: "MODIFIED" })).revision,
    ).toEqual(revision);
  });
});
