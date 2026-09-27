import { commitId, type ReviewThread } from "@mihiraki/core";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/preact";
import { describe, expect, it, vi } from "vitest";
import { SplitReview } from "./SplitReview";

const revision = { base: commitId("b1b1b1b"), head: commitId("c1c1c1c") };

const base = "# Title\n\nThe cache expires after ten minutes.\n";
const head = "# Title\n\nThe cache expires after five minutes.\n";

function renderReview(overrides: Partial<Parameters<typeof SplitReview>[0]> = {}) {
  const onSubmitComment = vi.fn().mockResolvedValue(undefined);
  const view = render(
    <SplitReview
      path="doc.md"
      base={base}
      head={head}
      threads={[]}
      revision={revision}
      onSubmitComment={onSubmitComment}
      {...overrides}
    />,
  );
  const column = (side: "base" | "head") =>
    Array.from(view.container.querySelectorAll(`[data-side="${side}"]`))
      .map((cell) => cell.textContent)
      .join("\n");
  return { ...view, onSubmitComment, column };
}

function openCommentForm(element: Element) {
  fireEvent.mouseOver(element);
  fireEvent.click(screen.getByRole("button", { name: "コメントを追加" }));
}

const thread: ReviewThread = {
  id: "t1",
  path: "doc.md",
  side: "base",
  lines: { start: 3, end: 3 },
  isResolved: false,
  isOutdated: false,
  isPending: false,
  comments: [
    {
      id: "c1",
      author: "alice",
      avatarUrl: "",
      bodyHtml: "<p>Why ten?</p>",
      createdAt: "2026-09-01T00:00:00Z",
      url: "",
    },
  ],
};

describe("SplitReview", () => {
  it("renders the base version on the left and the head version on the right", () => {
    const { column } = renderReview();

    expect(column("base")).toContain("ten minutes");
    expect(column("head")).toContain("five minutes");
  });

  it("highlights changed words inside a modified block", () => {
    const { container } = renderReview();

    expect(container.querySelector('[data-side="head"] ins.mhr-ins')?.textContent).toBe("five");
    expect(container.querySelector('[data-side="base"] del.mhr-del')?.textContent).toBe("ten");
  });

  it("strips scripts and event handlers from rendered markdown", () => {
    const { container } = renderReview({
      head: 'hi <img src="x" onerror="alert(1)">\n\n<script>alert(2)</script>\n',
    });

    expect(container.innerHTML).not.toContain("onerror");
    expect(container.innerHTML).not.toContain("<script");
  });

  it("posts a comment on the hovered block with its source lines and side", async () => {
    const { container, onSubmitComment } = renderReview();
    const paragraph = container.querySelector('[data-side="head"] p[data-line-start="3"]');

    openCommentForm(paragraph as Element);
    fireEvent.input(screen.getByRole("textbox"), { target: { value: "Why five?" } });
    fireEvent.click(screen.getByRole("button", { name: "コメント" }));

    await waitFor(() =>
      expect(onSubmitComment).toHaveBeenCalledWith(
        { path: "doc.md", side: "head", lines: { start: 3, end: 3 }, revision },
        "Why five?",
        "single",
      ),
    );
  });

  it("closes the form after the comment is posted", async () => {
    const { container } = renderReview();

    openCommentForm(container.querySelector('[data-side="head"] p') as Element);
    fireEvent.input(screen.getByRole("textbox"), { target: { value: "ok" } });
    fireEvent.click(screen.getByRole("button", { name: "コメント" }));

    await waitFor(() => expect(screen.queryByRole("textbox")).toBeNull());
  });

  it("keeps the form open and shows the reason when posting fails", async () => {
    const onSubmitComment = vi.fn().mockRejectedValue(new Error("Line could not be resolved."));
    const { container } = renderReview({ onSubmitComment });

    openCommentForm(container.querySelector('[data-side="head"] p') as Element);
    fireEvent.input(screen.getByRole("textbox"), { target: { value: "ok" } });
    fireEvent.click(screen.getByRole("button", { name: "コメント" }));

    expect(await screen.findByText(/Line could not be resolved/)).toBeTruthy();
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  it("shows a single add button even when the pointer leaves a block without a mouseleave", () => {
    const { container } = renderReview();

    fireEvent.mouseOver(container.querySelector('[data-side="head"] p') as Element);
    fireEvent.mouseOver(container.querySelector('[data-side="base"] h1') as Element);

    expect(screen.getAllByRole("button", { name: "コメントを追加" })).toHaveLength(1);
  });

  it("starts a pending review from the form", async () => {
    const { container, onSubmitComment } = renderReview();

    openCommentForm(container.querySelector('[data-side="head"] p') as Element);
    fireEvent.input(screen.getByRole("textbox"), { target: { value: "later" } });
    fireEvent.click(screen.getByRole("button", { name: "レビューを開始" }));

    await waitFor(() =>
      expect(onSubmitComment).toHaveBeenCalledWith(expect.anything(), "later", "review"),
    );
  });

  it("only offers adding to the review once one is pending, as GitHub does", async () => {
    // GitHub publishes the whole pending review when a single comment is posted meanwhile.
    const { container, onSubmitComment } = renderReview({ hasPendingReview: true });

    openCommentForm(container.querySelector('[data-side="head"] p') as Element);
    fireEvent.input(screen.getByRole("textbox"), { target: { value: "more" } });

    expect(screen.queryByRole("button", { name: "単発でコメント" })).toBeNull();
    expect(screen.queryByRole("button", { name: "コメント" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "レビューに追加" }));
    await waitFor(() =>
      expect(onSubmitComment).toHaveBeenCalledWith(expect.anything(), "more", "review"),
    );
  });

  it("marks threads that belong to an unsubmitted review", () => {
    const { column } = renderReview({ threads: [{ ...thread, isPending: true }] });

    expect(column("base")).toContain("保留中");
  });

  it("shows existing threads beside the block on their own side", () => {
    const { column } = renderReview({ threads: [thread] });

    expect(column("base")).toContain("Why ten?");
    expect(column("head")).not.toContain("Why ten?");
  });

  it("shows threads that no block can hold above the rows, instead of dropping them", () => {
    // A base-side thread on a file that has no base version.
    renderReview({ base: null, threads: [thread] });

    const unplaced = screen.getByRole("region", { name: "本文の横に表示できないコメント" });
    expect(within(unplaced).getByText("Why ten?")).toBeTruthy();
  });
});
