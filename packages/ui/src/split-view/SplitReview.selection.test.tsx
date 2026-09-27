import { commitId, ok } from "@mihiraki/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/preact";
import { describe, expect, it, vi } from "vitest";
import { SplitReview } from "./SplitReview";

const revision = { base: commitId("b1b1b1b"), head: commitId("c1c1c1c") };

const common = "First paragraph.\n\nSecond paragraph.\n\n";
const base = `${common}Third paragraph.\n\n- item one\n- item two\n- item three\n`;
const head = `${common}Third paragraph changed.\n\n- item one\n- item two\n- item three\n`;

function setup() {
  const onSubmitComment = vi.fn().mockResolvedValue(ok(undefined));
  const view = render(
    <SplitReview
      path="doc.md"
      base={base}
      head={head}
      threads={[]}
      revision={revision}
      onSubmitComment={onSubmitComment}
    />,
  );
  const at = (side: "base" | "head", selector: string) =>
    view.container.querySelector(`[data-side="${side}"] ${selector}`) as Element;
  return { ...view, onSubmitComment, at };
}

function addButton() {
  return screen.getByRole("button", { name: "コメントを追加" });
}

describe("SplitReview block selection", () => {
  it("selects consecutive blocks by dragging from the add button", async () => {
    const { at, onSubmitComment } = setup();

    fireEvent.mouseOver(at("head", 'p[data-line-start="1"]'));
    fireEvent.mouseDown(addButton());
    fireEvent.mouseMove(at("head", 'p[data-line-start="5"]'));
    fireEvent.mouseUp(at("head", 'p[data-line-start="5"]'));

    expect(screen.getByText("R1〜R5 にコメント")).toBeTruthy();
    fireEvent.input(screen.getByRole("textbox"), { target: { value: "range" } });
    fireEvent.click(screen.getByRole("button", { name: "コメント" }));
    await waitFor(() =>
      expect(onSubmitComment).toHaveBeenCalledWith(
        { path: "doc.md", side: "head", lines: { start: 1, end: 5 }, revision },
        "range",
        "single",
      ),
    );
  });

  it("highlights the selected blocks while dragging", () => {
    const { at } = setup();

    fireEvent.mouseOver(at("head", 'p[data-line-start="1"]'));
    fireEvent.mouseDown(addButton());
    fireEvent.mouseMove(at("head", 'p[data-line-start="3"]'));

    expect(at("head", 'p[data-line-start="1"]').classList.contains("mhr-selected")).toBe(true);
    expect(at("head", 'p[data-line-start="3"]').classList.contains("mhr-selected")).toBe(true);
    expect(at("head", 'p[data-line-start="5"]').classList.contains("mhr-selected")).toBe(false);
    expect(at("base", 'p[data-line-start="1"]').classList.contains("mhr-selected")).toBe(false);
  });

  it("keeps the selection on the side where it started", () => {
    const { at } = setup();

    fireEvent.mouseOver(at("head", 'p[data-line-start="1"]'));
    fireEvent.mouseDown(addButton());
    fireEvent.mouseMove(at("base", 'p[data-line-start="5"]'));
    fireEvent.mouseUp(at("base", 'p[data-line-start="5"]'));

    expect(screen.getByText("R1 にコメント")).toBeTruthy();
  });

  it("opens the form directly below the chosen list item", () => {
    const { at } = setup();
    const item = at("head", 'li[data-line-start="8"]');

    fireEvent.mouseOver(item);
    fireEvent.mouseDown(addButton());
    fireEvent.mouseUp(item);

    expect(item.querySelector("form")).not.toBeNull();
    expect(at("head", 'li[data-line-start="9"]').querySelector("form")).toBeNull();
  });

  it("opens the form right after the chosen paragraph", () => {
    const { at, container } = setup();

    fireEvent.mouseOver(at("head", 'p[data-line-start="3"]'));
    fireEvent.click(addButton());

    const form = container.querySelector("form");
    expect(form?.parentElement?.previousElementSibling).toBe(at("head", 'p[data-line-start="3"]'));
  });

  it("keeps a form opened while an earlier comment was still being posted", async () => {
    let finishFirstPost: () => void = () => undefined;
    const onSubmitComment = vi.fn().mockReturnValueOnce(
      new Promise((resolve) => {
        finishFirstPost = () => resolve(ok(undefined));
      }),
    );
    const view = render(
      <SplitReview
        path="doc.md"
        base={base}
        head={head}
        threads={[]}
        revision={revision}
        onSubmitComment={onSubmitComment}
      />,
    );
    const paragraph = (line: number) =>
      view.container.querySelector(`[data-side="head"] p[data-line-start="${line}"]`) as Element;
    fireEvent.mouseOver(paragraph(1));
    fireEvent.click(addButton());
    fireEvent.input(screen.getByRole("textbox"), { target: { value: "first" } });
    fireEvent.click(screen.getByRole("button", { name: "コメント" }));

    fireEvent.mouseOver(paragraph(3));
    fireEvent.click(addButton());
    fireEvent.input(screen.getByRole("textbox"), { target: { value: "second draft" } });
    finishFirstPost();

    await waitFor(() => expect(onSubmitComment).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("second draft");
  });

  it("does not offer cancelling while the comment is being posted", () => {
    const { at } = setup();
    fireEvent.mouseOver(at("head", 'p[data-line-start="1"]'));
    fireEvent.click(addButton());
    fireEvent.input(screen.getByRole("textbox"), { target: { value: "x" } });

    fireEvent.click(screen.getByRole("button", { name: "コメント" }));

    expect((screen.getByRole("button", { name: "キャンセル" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("previews the comment as rendered Markdown", () => {
    const { at } = setup();
    fireEvent.mouseOver(at("head", 'p[data-line-start="1"]'));
    fireEvent.click(addButton());
    fireEvent.input(screen.getByRole("textbox"), { target: { value: "looks **good**" } });

    fireEvent.click(screen.getByRole("tab", { name: "プレビュー" }));

    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByText("good").tagName).toBe("STRONG");
    fireEvent.click(screen.getByRole("tab", { name: "書く" }));
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("looks **good**");
  });
});
