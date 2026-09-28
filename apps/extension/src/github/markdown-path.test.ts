import { describe, expect, it } from "vitest";
import { isMarkdownPath } from "./markdown-path";

describe("isMarkdownPath", () => {
  // The extensions GitHub offers a rich diff for as Markdown, checked on a sandbox pull request.
  it.each([
    "md",
    "markdown",
    "mdown",
    "mkdn",
    "mkd",
    "mdwn",
    "mkdown",
    "livemd",
    "ronn",
    "scd",
    "workbook",
    "mdx",
    "litcoffee",
  ])("takes .%s files, as GitHub renders them", (extension) => {
    expect(isMarkdownPath(`docs/guide.${extension}`)).toBe(true);
  });

  it("ignores the case of the extension", () => {
    expect(isMarkdownPath("README.MD")).toBe(true);
  });

  it.each(["notes.mdtxt", "notes.mdtext", "notes.text", "src/main.ts", "docs/md", "notes.md.bak"])(
    "leaves %s alone, as GitHub has no rich diff for it",
    (path) => {
      expect(isMarkdownPath(path)).toBe(false);
    },
  );
});
