import { describe, expect, it } from "vitest";
import { diffLineKeyOf, parseThreadCreatedMessage, threadSubjectOf } from "./protocol";

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
      target: { path: "a.md", side: "head", lines: { start: 3, end: 3 } },
      mode: "review",
      thread: { id: "42" },
    };

    expect(parseThreadCreatedMessage(JSON.stringify(message))).toEqual(message);
  });

  it("rejects anything else, since page scripts can dispatch the same events", () => {
    expect(parseThreadCreatedMessage('{"target":{"path":1}}')).toBeNull();
    expect(parseThreadCreatedMessage("not json")).toBeNull();
    expect(
      parseThreadCreatedMessage(
        JSON.stringify({
          target: { path: "a.md", side: "UP", lines: { start: 3, end: 3 } },
          mode: "review",
          thread: { id: "1" },
        }),
      ),
    ).toBeNull();
    expect(
      parseThreadCreatedMessage(
        JSON.stringify({
          target: { path: "a.md", side: "head", lines: { start: 9, end: 3 } },
          mode: "review",
          thread: { id: "1" },
        }),
      ),
    ).toBeNull();
  });
});
