import { commitId, ok, type ReviewThread } from "@mihiraki/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/preact";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/i18n";
import { UnifiedReview, type UnifiedReviewProps } from "./UnifiedReview";

const revision = { base: commitId("b1b1b1b"), head: commitId("c1c1c1c") };
const base = "# Title\n\nThe cache expires after ten minutes.\n\nDropped paragraph.\n";
const head = "# Title\n\nThe cache expires after five minutes.\n";

function renderUnified(overrides: Partial<UnifiedReviewProps> = {}) {
  const onSubmitComment = vi.fn().mockResolvedValue(ok(undefined));
  const view = render(
    <I18nProvider locale="en">
      <UnifiedReview
        path="doc.md"
        base={base}
        head={head}
        threads={[]}
        revision={revision}
        onSubmitComment={onSubmitComment}
        {...overrides}
      />
    </I18nProvider>,
  );
  return { ...view, onSubmitComment };
}

async function commentOn(element: Element, body: string) {
  fireEvent.mouseOver(element);
  fireEvent.click(screen.getByRole("button", { name: "Add a comment" }));
  fireEvent.input(screen.getByRole("textbox"), { target: { value: body } });
  fireEvent.click(screen.getByRole("button", { name: "Comment" }));
}

function thread(side: "base" | "head", line: number, text: string): ReviewThread {
  return {
    id: `${side}${line}`,
    path: "doc.md",
    side,
    lines: { start: line, end: line },
    isResolved: false,
    isOutdated: false,
    comments: [
      {
        id: `${side}${line}c`,
        isPending: false,
        author: "alice",
        avatarUrl: "",
        bodyHtml: `<p>${text}</p>`,
        createdAt: "",
        url: "",
      },
    ],
  };
}

describe("UnifiedReview", () => {
  it("shows each block once, a changed one with the removed words in place", () => {
    const { container } = renderUnified();

    expect(container.querySelectorAll(".mhr-row .mhr-cell")).toHaveLength(3);
    expect(container.querySelector("del.mhr-del")?.textContent).toBe("ten");
    expect(container.querySelector("ins.mhr-ins")?.textContent).toBe("five");
  });

  it("shows a removed block from the base version", () => {
    const { container } = renderUnified();

    expect(container.querySelector('[data-side="base"]')?.textContent).toContain(
      "Dropped paragraph.",
    );
  });

  it("comments on a changed block with its head lines", async () => {
    const { container, onSubmitComment } = renderUnified();

    await commentOn(container.querySelector('[data-side="head"] p') as Element, "why five?");

    await waitFor(() =>
      expect(onSubmitComment).toHaveBeenCalledWith(
        { path: "doc.md", side: "head", lines: { start: 3, end: 3 }, revision },
        "why five?",
        "single",
      ),
    );
  });

  it("comments on a removed block with its base lines", async () => {
    const { container, onSubmitComment } = renderUnified();

    await commentOn(container.querySelector('[data-side="base"] p') as Element, "keep it?");

    await waitFor(() =>
      expect(onSubmitComment).toHaveBeenCalledWith(
        { path: "doc.md", side: "base", lines: { start: 5, end: 5 }, revision },
        "keep it?",
        "single",
      ),
    );
  });

  it("shows the threads of both versions beside the block they belong to", () => {
    renderUnified({ threads: [thread("base", 3, "was ten"), thread("head", 3, "now five")] });

    expect(screen.getByText("was ten")).toBeTruthy();
    expect(screen.getByText("now five")).toBeTruthy();
  });
});
