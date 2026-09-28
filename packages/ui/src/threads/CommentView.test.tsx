import type { ReviewComment } from "@mihiraki/core";
import { fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n/i18n";
import { CommentView } from "./CommentView";

const comment: ReviewComment = {
  id: "c1",
  isPending: false,
  author: "alice",
  avatarUrl: "",
  isByChangeAuthor: false,
  bodyHtml: "<p>Why <strong>ten</strong>?</p>",
  bodyMarkdown: "Why **ten**?",
  createdAt: "2026-09-28T11:57:00Z",
  url: "https://github.com/acme/docs/pull/1#discussion_r1",
  reactions: [],
  newIssueUrl: "https://github.com/acme/docs/issues/new?body=quote",
};

const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-28T12:00:00Z"));
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  writeText.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

function renderComment(overrides: Partial<ReviewComment> = {}) {
  return render(
    <I18nProvider locale="en">
      <CommentView comment={{ ...comment, ...overrides }} />
    </I18nProvider>,
  );
}

function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: "More actions" }));
}

describe("CommentView", () => {
  it("says how long ago the comment was written, with the exact time on hover", () => {
    renderComment();

    const time = screen.getByText("3 minutes ago");
    expect(time.getAttribute("title")).toBe(new Date(comment.createdAt).toLocaleString("en"));
  });

  it("marks a comment by the author of the change", () => {
    renderComment({ isByChangeAuthor: true });

    expect(screen.getByText("Author")).toBeTruthy();
  });

  it("shows the reactions people gave, marking the viewer's own", () => {
    const { container } = renderComment({
      reactions: [
        { kind: "thumbsUp", count: 2, isByViewer: true },
        { kind: "rocket", count: 1, isByViewer: false },
      ],
    });

    const chips = Array.from(container.querySelectorAll(".mhr-reaction"));
    expect(chips.map((chip) => chip.textContent)).toEqual(["👍2", "🚀1"]);
    expect(chips.map((chip) => chip.classList.contains("mhr-reaction--mine"))).toEqual([
      true,
      false,
    ]);
  });

  it("copies the comment as it was written", () => {
    renderComment();
    openMenu();

    fireEvent.click(screen.getByRole("menuitem", { name: "Copy Markdown" }));

    expect(writeText).toHaveBeenCalledWith("Why **ten**?");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("copies a link to the comment", () => {
    renderComment();
    openMenu();

    fireEvent.click(screen.getByRole("menuitem", { name: "Copy link" }));

    expect(writeText).toHaveBeenCalledWith(comment.url);
  });

  it("offers a new issue quoting the comment, and the comment on GitHub", () => {
    renderComment();
    openMenu();

    expect(
      screen.getByRole("menuitem", { name: "Reference in a new issue" }).getAttribute("href"),
    ).toBe(comment.newIssueUrl);
    expect(screen.getByRole("menuitem", { name: "Open on GitHub" }).getAttribute("href")).toBe(
      comment.url,
    );
  });

  it("leaves out what the comment has no link for", () => {
    renderComment({ url: "", newIssueUrl: null });
    openMenu();

    expect(screen.getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
      "Copy Markdown",
    ]);
  });

  it("closes the menu with Escape", () => {
    renderComment();
    openMenu();

    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    expect(screen.queryByRole("menu")).toBeNull();
  });
});
