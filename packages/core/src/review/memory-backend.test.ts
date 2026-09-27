import { describe, expect, it } from "vitest";
import { createMemoryBackend } from "./memory-backend";

const revision = { base: "base-1", head: "head-1" };
const files = {
  "docs/a.md": { base: "old a\n", head: "new a\n" },
  "docs/b.md": { base: "", head: "b\n" },
};

describe("createMemoryBackend", () => {
  it("lists the given files with a change type derived from their contents", async () => {
    const backend = createMemoryBackend(files);

    expect(await backend.listChangedMarkdownFiles()).toEqual([
      { path: "docs/a.md", previousPath: null, changeType: "MODIFIED" },
      { path: "docs/b.md", previousPath: null, changeType: "ADDED" },
    ]);
  });

  it("returns both versions of a file", async () => {
    const backend = createMemoryBackend(files);

    expect(
      await backend.loadFileVersions({
        path: "docs/a.md",
        previousPath: null,
        changeType: "MODIFIED",
      }),
    ).toEqual({ ...files["docs/a.md"], revision: { base: "base", head: "head" } });
  });

  it("stores posted comments as new threads with rendered bodies", async () => {
    const backend = createMemoryBackend(files);

    await backend.postComment(
      { path: "docs/a.md", side: "RIGHT", line: 1, startLine: null, revision },
      "Looks **good**",
      "single",
    );
    const [thread] = (await backend.loadThreads()).threads;

    expect(thread).toMatchObject({
      path: "docs/a.md",
      side: "RIGHT",
      line: 1,
      startLine: null,
      isResolved: false,
      isPending: false,
    });
    expect(thread?.comments[0]?.bodyHtml).toContain("<strong>good</strong>");
  });

  it("keeps comments posted as part of a review pending", async () => {
    const backend = createMemoryBackend(files);

    await backend.postComment(
      { path: "docs/a.md", side: "RIGHT", line: 1, startLine: null, revision },
      "later",
      "review",
    );

    expect((await backend.loadThreads()).threads[0]?.isPending).toBe(true);
  });

  it("reports the revision its versions and threads belong to", async () => {
    const backend = createMemoryBackend(files, [], { revision });

    expect((await backend.loadThreads()).revision).toEqual(revision);
    expect(
      (
        await backend.loadFileVersions({
          path: "docs/a.md",
          previousPath: null,
          changeType: "MODIFIED",
        })
      ).revision,
    ).toEqual(revision);
  });
});
