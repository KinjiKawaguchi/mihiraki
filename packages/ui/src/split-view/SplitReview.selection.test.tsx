import { fireEvent, render, screen, waitFor } from "@testing-library/preact";
import { describe, expect, it, vi } from "vitest";
import { SplitReview } from "./SplitReview";

const common = "First paragraph.\n\nSecond paragraph.\n\n";
const base = `${common}Third paragraph.\n\n- item one\n- item two\n- item three\n`;
const head = `${common}Third paragraph changed.\n\n- item one\n- item two\n- item three\n`;

function setup() {
  const onSubmitComment = vi.fn().mockResolvedValue(undefined);
  const view = render(
    <SplitReview
      path="doc.md"
      base={base}
      head={head}
      threads={[]}
      onSubmitComment={onSubmitComment}
    />,
  );
  const at = (side: "LEFT" | "RIGHT", selector: string) =>
    view.container.querySelector(`[data-side="${side}"] ${selector}`) as Element;
  return { ...view, onSubmitComment, at };
}

function addButton() {
  return screen.getByRole("button", { name: "コメントを追加" });
}

describe("SplitReview block selection", () => {
  it("selects consecutive blocks by dragging from the add button", async () => {
    const { at, onSubmitComment } = setup();

    fireEvent.mouseOver(at("RIGHT", 'p[data-line-start="1"]'));
    fireEvent.mouseDown(addButton());
    fireEvent.mouseMove(at("RIGHT", 'p[data-line-start="5"]'));
    fireEvent.mouseUp(at("RIGHT", 'p[data-line-start="5"]'));

    expect(screen.getByText("R1〜R5 にコメント")).toBeTruthy();
    fireEvent.input(screen.getByRole("textbox"), { target: { value: "range" } });
    fireEvent.click(screen.getByRole("button", { name: "コメント" }));
    await waitFor(() =>
      expect(onSubmitComment).toHaveBeenCalledWith(
        { path: "doc.md", side: "RIGHT", line: 5, startLine: 1 },
        "range",
        "single",
      ),
    );
  });

  it("highlights the selected blocks while dragging", () => {
    const { at } = setup();

    fireEvent.mouseOver(at("RIGHT", 'p[data-line-start="1"]'));
    fireEvent.mouseDown(addButton());
    fireEvent.mouseMove(at("RIGHT", 'p[data-line-start="3"]'));

    expect(at("RIGHT", 'p[data-line-start="1"]').classList.contains("bgm-selected")).toBe(true);
    expect(at("RIGHT", 'p[data-line-start="3"]').classList.contains("bgm-selected")).toBe(true);
    expect(at("RIGHT", 'p[data-line-start="5"]').classList.contains("bgm-selected")).toBe(false);
    expect(at("LEFT", 'p[data-line-start="1"]').classList.contains("bgm-selected")).toBe(false);
  });

  it("keeps the selection on the side where it started", () => {
    const { at } = setup();

    fireEvent.mouseOver(at("RIGHT", 'p[data-line-start="1"]'));
    fireEvent.mouseDown(addButton());
    fireEvent.mouseMove(at("LEFT", 'p[data-line-start="5"]'));
    fireEvent.mouseUp(at("LEFT", 'p[data-line-start="5"]'));

    expect(screen.getByText("R1 にコメント")).toBeTruthy();
  });

  it("opens the form directly below the chosen list item", () => {
    const { at } = setup();
    const item = at("RIGHT", 'li[data-line-start="8"]');

    fireEvent.mouseOver(item);
    fireEvent.mouseDown(addButton());
    fireEvent.mouseUp(item);

    expect(item.querySelector("form")).not.toBeNull();
    expect(at("RIGHT", 'li[data-line-start="9"]').querySelector("form")).toBeNull();
  });

  it("opens the form right after the chosen paragraph", () => {
    const { at, container } = setup();

    fireEvent.mouseOver(at("RIGHT", 'p[data-line-start="3"]'));
    fireEvent.click(addButton());

    const form = container.querySelector("form");
    expect(form?.parentElement?.previousElementSibling).toBe(at("RIGHT", 'p[data-line-start="3"]'));
  });

  it("previews the comment as rendered Markdown", () => {
    const { at } = setup();
    fireEvent.mouseOver(at("RIGHT", 'p[data-line-start="1"]'));
    fireEvent.click(addButton());
    fireEvent.input(screen.getByRole("textbox"), { target: { value: "looks **good**" } });

    fireEvent.click(screen.getByRole("tab", { name: "プレビュー" }));

    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByText("good").tagName).toBe("STRONG");
    fireEvent.click(screen.getByRole("tab", { name: "書く" }));
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe("looks **good**");
  });
});
