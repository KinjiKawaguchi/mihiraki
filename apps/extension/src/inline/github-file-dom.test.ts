import { afterEach, describe, expect, it } from "vitest";
import { appendFileBlock, showRichDiff } from "./fixture";
import {
  installPageStyle,
  isRenderedViewActive,
  isRichDiffShown,
  setRenderedViewActive,
} from "./github-file-dom";

afterEach(() => {
  document.head.innerHTML = "";
  document.body.innerHTML = "";
});

describe("github file DOM", () => {
  it("tells whether GitHub shows a file's rich diff", async () => {
    const container = await appendFileBlock(document, "a.md");

    expect(isRichDiffShown(container)).toBe(false);
    showRichDiff(container, true);
    expect(isRichDiffShown(container)).toBe(true);
  });

  it("marks a file as showing the rendered view without touching GitHub-managed children", async () => {
    const container = await appendFileBlock(document, "a.md");

    setRenderedViewActive(container, true);
    expect(isRenderedViewActive(container)).toBe(true);
    setRenderedViewActive(container, false);

    expect(isRenderedViewActive(container)).toBe(false);
    expect(container.querySelector(".diff-body")?.getAttribute("style")).toBeNull();
  });

  it("installs one page style that hides GitHub's own diff of those files", () => {
    installPageStyle(document);
    installPageStyle(document);

    const styles = document.head.querySelectorAll("style[data-mhr-page-style]");
    expect(styles).toHaveLength(1);
    expect(styles[0]?.textContent).toContain("[data-mhr-view]");
    expect(styles[0]?.textContent).toContain(":not([data-diff-header-wrapper])");
  });
});
