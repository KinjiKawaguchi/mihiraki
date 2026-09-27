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

    await backend.postComment(
      { ...target, lines: { start: 1, end: 2 } },
      "Looks **good**",
      "single",
    );
    const [thread] = (await backend.loadThreads()).threads;

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

    expect((await backend.loadThreads()).threads[0]?.isPending).toBe(true);
  });

  it("reports the revision its versions and threads belong to", async () => {
    const backend = createMemoryBackend(files, [], { revision });

    expect((await backend.loadThreads()).revision).toEqual(revision);
    expect(
      (await backend.loadFileVersions({ path: "docs/a.md", changeType: "MODIFIED" })).revision,
    ).toEqual(revision);
  });
});
