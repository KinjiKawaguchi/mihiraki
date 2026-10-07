import { describe, expect, it } from "vitest";
import { err, ok } from "../result";
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
    expect(thread?.comments[0]?.bodyMarkdown).toBe("Looks **good**");
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
      canReply: true,
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

  it("adds a reply at the end of its thread", async () => {
    const backend = createMemoryBackend(files);
    await backend.postComment(target, "First", "single");
    const [thread] = (await loadSnapshot(backend)).threads;
    if (!thread) throw new Error("no thread");

    expect(await backend.replyToThread(thread, "**Agreed**", "single")).toEqual(ok(undefined));

    const [replied] = (await loadSnapshot(backend)).threads;
    expect(replied?.comments.map((comment) => comment.bodyMarkdown)).toEqual([
      "First",
      "**Agreed**",
    ]);
    expect(replied?.comments[1]?.bodyHtml).toContain("<strong>Agreed</strong>");
    expect(replied?.comments[1]?.isPending).toBe(false);
  });

  it("keeps a reply added to a review pending, and refuses a single one meanwhile", async () => {
    const backend = createMemoryBackend(files);
    await backend.postComment(target, "First", "single");
    const [thread] = (await loadSnapshot(backend)).threads;
    if (!thread) throw new Error("no thread");

    await backend.replyToThread(thread, "Pending reply", "review");

    const [replied] = (await loadSnapshot(backend)).threads;
    expect(replied?.comments[1]?.isPending).toBe(true);
    expect(await backend.replyToThread(thread, "Now", "single")).toEqual({
      ok: false,
      error: { kind: "pendingReviewConflict" },
    });
  });

  it("resolves a thread and opens it again", async () => {
    const backend = createMemoryBackend(files);
    await backend.postComment(target, "First", "single");
    const [thread] = (await loadSnapshot(backend)).threads;
    if (!thread) throw new Error("no thread");

    expect(await backend.setThreadResolved(thread, true)).toEqual(ok(undefined));
    expect((await loadSnapshot(backend)).threads[0]?.isResolved).toBe(true);

    await backend.setThreadResolved(thread, false);
    expect((await loadSnapshot(backend)).threads[0]?.isResolved).toBe(false);
  });

  it("lets the viewer reply to the threads it creates", async () => {
    const backend = createMemoryBackend(files);
    await backend.postComment(target, "First", "single");

    expect((await loadSnapshot(backend)).threads[0]?.canReply).toBe(true);
  });

  describe("changing a comment", () => {
    async function firstComment(backend: ReviewBackend) {
      const [thread] = (await loadSnapshot(backend)).threads;
      const comment = thread?.comments[0];
      if (!thread || !comment) throw new Error("no comment");
      return { thread, comment };
    }

    it("lets the viewer edit, delete and react to comments it writes", async () => {
      const backend = createMemoryBackend(files);
      await backend.postComment(target, "Mine", "single");

      const { comment } = await firstComment(backend);

      expect(comment).toMatchObject({ canEdit: true, canDelete: true, canReact: true });
    });

    it("replaces a comment's text and moves its version on", async () => {
      const backend = createMemoryBackend(files);
      await backend.postComment(target, "Frist", "single");
      const { thread, comment } = await firstComment(backend);

      expect(await backend.editComment(thread, comment, "First")).toEqual(ok(undefined));

      const edited = (await firstComment(backend)).comment;
      expect(edited.bodyMarkdown).toBe("First");
      expect(edited.bodyHtml).toContain("First");
      expect(edited.version).not.toBe(comment.version);
    });

    it("refuses an edit that started from an older version, so a newer text is not lost", async () => {
      const backend = createMemoryBackend(files);
      await backend.postComment(target, "v1", "single");
      const { thread, comment } = await firstComment(backend);
      await backend.editComment(thread, comment, "v2");

      expect(await backend.editComment(thread, comment, "v3")).toEqual(
        err({ kind: "editConflict" }),
      );
      expect((await firstComment(backend)).comment.bodyMarkdown).toBe("v2");
    });

    it("deletes a comment, and its thread with its last comment", async () => {
      const backend = createMemoryBackend(files);
      await backend.postComment(target, "Root", "single");
      const { thread } = await firstComment(backend);
      await backend.replyToThread(thread, "Reply", "single");
      const [root, reply] = (await firstComment(backend)).thread.comments;
      if (!root || !reply) throw new Error("no comments");

      expect(await backend.deleteComment(thread, reply)).toEqual(ok(undefined));
      expect((await firstComment(backend)).thread.comments.map((c) => c.bodyMarkdown)).toEqual([
        "Root",
      ]);

      await backend.deleteComment(thread, root);
      expect((await loadSnapshot(backend)).threads).toEqual([]);
    });

    it("adds and removes the viewer's reaction", async () => {
      const backend = createMemoryBackend(files);
      await backend.postComment(target, "Nice", "single");
      const { thread, comment } = await firstComment(backend);

      await backend.setReaction(thread, comment, "heart", true);
      expect((await firstComment(backend)).comment.reactions).toEqual([
        { kind: "heart", count: 1, isByViewer: true },
      ]);

      await backend.setReaction(thread, comment, "heart", false);
      expect((await firstComment(backend)).comment.reactions).toEqual([]);
    });
  });
});
