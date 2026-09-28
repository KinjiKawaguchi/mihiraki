import { describe, expect, it } from "vitest";
import { diffLineKeyOf, parseHostChange, threadSubjectOf } from "./protocol";

describe("host sync protocol", () => {
  it("describes where a thread sits the way GitHub stores it", () => {
    expect(threadSubjectOf({ path: "a.md", side: "head", lines: { start: 18, end: 20 } })).toEqual({
      path: "a.md",
      startLine: 18,
      startDiffSide: "RIGHT",
      endLine: 20,
      endDiffSide: "RIGHT",
      isOutdated: false,
    });
  });

  it("keys a thread by its side and last line", () => {
    expect(diffLineKeyOf({ path: "a.md", side: "base", lines: { start: 5, end: 5 } })).toBe("L5");
    expect(diffLineKeyOf({ path: "a.md", side: "head", lines: { start: 18, end: 20 } })).toBe(
      "R20",
    );
  });

  it("accepts a well-formed thread-created message", () => {
    const message = {
      kind: "threadCreated",
      target: { path: "a.md", side: "head", lines: { start: 3, end: 3 } },
      mode: "review",
      thread: { id: "42" },
    };

    expect(parseHostChange(JSON.stringify(message))).toEqual({
      ...message,
      threadId: 42,
    });
  });

  it("rejects a thread id GitHub's stores could not use, such as a node id", () => {
    const message = (id: unknown) =>
      JSON.stringify({
        kind: "threadCreated",
        target: { path: "a.md", side: "head", lines: { start: 3, end: 3 } },
        mode: "review",
        thread: { id },
      });

    expect(parseHostChange(message("PRRT_kwDOABC"))).toBeNull();
    expect(parseHostChange(message(0))).toBeNull();
    expect(parseHostChange(message(42))).not.toBeNull();
  });

  it("accepts replies and resolutions", () => {
    const target = { path: "a.md", side: "head", lines: { start: 3, end: 3 } };
    const reply = { kind: "threadReplied", target, mode: "single", thread: { id: "7", body: 1 } };
    const resolution = { kind: "threadResolved", target, thread: { id: "7" }, isResolved: false };

    expect(parseHostChange(JSON.stringify(reply))).toEqual({ ...reply, threadId: 7 });
    expect(parseHostChange(JSON.stringify(resolution))).toEqual({ ...resolution, threadId: 7 });
  });

  it("rejects a resolution that does not say which way, and unknown kinds", () => {
    const target = { path: "a.md", side: "head", lines: { start: 3, end: 3 } };
    const change = (extra: Record<string, unknown>) =>
      JSON.stringify({ kind: "threadResolved", target, thread: { id: "7" }, ...extra });

    expect(parseHostChange(change({ isResolved: "yes" }))).toBeNull();
    expect(parseHostChange(change({ kind: "threadDeleted", isResolved: true }))).toBeNull();
  });

  it("rejects anything else, since page scripts can dispatch the same events", () => {
    expect(parseHostChange('{"target":{"path":1}}')).toBeNull();
    expect(parseHostChange("not json")).toBeNull();
    expect(
      parseHostChange(
        JSON.stringify({
          kind: "threadCreated",
          target: { path: "a.md", side: "UP", lines: { start: 3, end: 3 } },
          mode: "review",
          thread: { id: "1" },
        }),
      ),
    ).toBeNull();
    expect(
      parseHostChange(
        JSON.stringify({
          kind: "threadCreated",
          target: { path: "a.md", side: "head", lines: { start: 9, end: 3 } },
          mode: "review",
          thread: { id: "1" },
        }),
      ),
    ).toBeNull();
  });
});
