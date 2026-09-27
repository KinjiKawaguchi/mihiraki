import { describe, expect, it } from "vitest";
import { ok } from "../result";
import type { ReviewBackend } from "../review/backend";
import { commitId } from "../review/commit-id";
import type { CommentTarget, ReviewThread } from "../review/types";
import { createMemoryBackend } from "./memory-backend";

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

async function loadSnapshot(backend: ReviewBackend) {
  const loaded = await backend.loadThreads();
  if (!loaded.ok) throw new Error(`Unexpected failure: ${loaded.error.kind}`);
  return loaded.value;
}

describe("createMemoryBackend", () => {
  it("lists the given files with a change type derived from which versions exist", async () => {
    const backend = createMemoryBackend(files);

    expect(await backend.listChangedMarkdownFiles()).toEqual(
      ok([
        { path: "docs/a.md", changeType: "MODIFIED" },
        { path: "docs/b.md", changeType: "ADDED" },
        { path: "docs/c.md", changeType: "REMOVED" },
      ]),
    );
  });

  it("returns both versions of a file, null where the file does not exist", async () => {
    const backend = createMemoryBackend(files, [], { revision });

    expect(await backend.loadFileVersions({ path: "docs/b.md", changeType: "ADDED" })).toEqual(
      ok({ revision, base: null, head: "b\n" }),
    );
  });

  it("stores posted comments as new threads with rendered bodies", async () => {
    const backend = createMemoryBackend(files);

    const result = await backend.postComment(
      { ...target, lines: { start: 1, end: 2 } },
      "Looks **good**",
      "single",
    );
    const [thread] = (await loadSnapshot(backend)).threads;

    expect(result).toEqual({ ok: true, value: undefined });
    expect(thread).toMatchObject({
      path: "docs/a.md",
      side: "head",
      lines: { start: 1, end: 2 },
      isResolved: false,
    });
    expect(thread?.comments[0]?.bodyHtml).toContain("<strong>good</strong>");
    expect(thread?.comments[0]?.isPending).toBe(false);
  });

  it("keeps comments posted as part of a review pending", async () => {
    const backend = createMemoryBackend(files);

    await backend.postComment(target, "later", "review");
    const snapshot = await loadSnapshot(backend);

    expect(snapshot.threads[0]?.comments[0]?.isPending).toBe(true);
    expect(snapshot.hasPendingReview).toBe(true);
  });

  it("refuses a single comment while a review is pending, as it would publish that review", async () => {
    const backend = createMemoryBackend(files);
    await backend.postComment(target, "later", "review");

    const result = await backend.postComment(target, "now", "single");

    expect(result).toEqual({ ok: false, error: { kind: "pendingReviewConflict" } });
    expect((await loadSnapshot(backend)).threads).toHaveLength(1);
  });

  it("gives new threads and comments ids that differ from every existing one", async () => {
    const existing: ReviewThread = {
      id: "2",
      path: "docs/a.md",
      side: "head",
      lines: { start: 1, end: 1 },
      isResolved: false,
      isOutdated: false,
      comments: [],
    };
    const backend = createMemoryBackend(files, [existing]);

    await backend.postComment(target, "one", "single");
    await backend.postComment(target, "two", "single");
    const ids = (await loadSnapshot(backend)).threads.map((thread) => thread.id);

    expect(new Set(ids).size).toBe(3);
  });

  it("has no pending review until a comment is added to one", async () => {
    expect((await loadSnapshot(createMemoryBackend(files))).hasPendingReview).toBe(false);
  });

  it("reports the revision its versions and threads belong to", async () => {
    const backend = createMemoryBackend(files, [], { revision });

    expect((await loadSnapshot(backend)).revision).toEqual(revision);
    expect(
      await backend.loadFileVersions({ path: "docs/a.md", changeType: "MODIFIED" }),
    ).toMatchObject(ok({ revision }));
  });
});
