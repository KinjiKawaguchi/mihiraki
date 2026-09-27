import { describe, expect, it } from "vitest";
import type { ChangedFile } from "./backend";
import { basePathOf, headPathOf } from "./changed-file";

describe("basePathOf / headPathOf", () => {
  it("reads both versions from the same path for a modified file", () => {
    const file: ChangedFile = { path: "a.md", changeType: "MODIFIED" };

    expect([basePathOf(file), headPathOf(file)]).toEqual(["a.md", "a.md"]);
  });

  it("reads the base version from the previous path of a renamed file", () => {
    const file: ChangedFile = { path: "new.md", previousPath: "old.md", changeType: "RENAMED" };

    expect([basePathOf(file), headPathOf(file)]).toEqual(["old.md", "new.md"]);
  });

  it("has no base version for an added file and no head version for a removed one", () => {
    expect(basePathOf({ path: "a.md", changeType: "ADDED" })).toBeNull();
    expect(headPathOf({ path: "a.md", changeType: "REMOVED" })).toBeNull();
  });

  it("cannot describe a rename without the previous path", () => {
    // @ts-expect-error a renamed file always says where it came from
    const file: ChangedFile = { path: "new.md", changeType: "RENAMED" };

    expect(file.changeType).toBe("RENAMED");
  });
});
