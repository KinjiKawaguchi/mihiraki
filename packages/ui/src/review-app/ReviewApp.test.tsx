import { err, type ReviewBackend, type ReviewThread } from "@mihiraki/core";
import { createMemoryBackend } from "@mihiraki/core/memory";
import { fireEvent, render, screen, waitFor } from "@testing-library/preact";
import { describe, expect, it, vi } from "vitest";
import { ReviewApp } from "./ReviewApp";

const files = {
  "docs/a.md": { base: "Alpha version one.\n", head: "Alpha version two.\n" },
  "docs/b.md": { base: "Bravo text.\n", head: "Bravo text changed.\n" },
};

function threadOn(path: string, text: string): ReviewThread {
  return {
    id: path,
    path,
    side: "head",
    lines: { start: 1, end: 1 },
    isResolved: false,
    isOutdated: false,
    comments: [
      {
        id: path,
        isPending: false,
        author: "bob",
        avatarUrl: "",
        bodyHtml: `<p>${text}</p>`,
        createdAt: "",
        url: "",
      },
    ],
  };
}

function columnText(container: Element, side: "base" | "head"): string {
  return Array.from(container.querySelectorAll(`[data-side="${side}"]`))
    .map((cell) => cell.textContent)
    .join("\n");
}

async function waitForColumn(container: Element, side: "base" | "head", text: string) {
  await waitFor(() => expect(columnText(container, side)).toContain(text));
}

describe("ReviewApp", () => {
  it("opens the first changed Markdown file side by side", async () => {
    const { container } = render(<ReviewApp backend={createMemoryBackend(files)} />);

    await waitForColumn(container, "base", "Alpha version one.");
    await waitForColumn(container, "head", "Alpha version two.");
  });

  it("switches to another file from the file list", async () => {
    const { container } = render(<ReviewApp backend={createMemoryBackend(files)} />);

    fireEvent.click(await screen.findByRole("button", { name: "docs/b.md" }));

    await waitForColumn(container, "head", "Bravo text changed.");
  });

  it("shows only the threads of the selected file", async () => {
    const backend = createMemoryBackend(files, [
      threadOn("docs/a.md", "about A"),
      threadOn("docs/b.md", "about B"),
    ]);
    render(<ReviewApp backend={backend} />);

    expect(await screen.findByText("about A")).toBeTruthy();
    expect(screen.queryByText("about B")).toBeNull();
  });

  it("shows a newly posted comment after submitting", async () => {
    const { container } = render(<ReviewApp backend={createMemoryBackend(files)} />);
    await waitForColumn(container, "head", "Alpha version two.");

    fireEvent.mouseOver(container.querySelector('[data-side="head"] p') as Element);
    fireEvent.click(screen.getByRole("button", { name: "コメントを追加" }));
    fireEvent.input(screen.getByRole("textbox"), { target: { value: "Nice change" } });
    fireEvent.click(screen.getByRole("button", { name: "コメント" }));

    expect(await screen.findByText("Nice change")).toBeTruthy();
  });

  it("tells the reviewer when the pull request has no Markdown changes", async () => {
    render(<ReviewApp backend={createMemoryBackend({})} />);

    expect(await screen.findByText(/Markdownファイルの変更はありません/)).toBeTruthy();
  });

  it("shows why loading failed", async () => {
    const backend: ReviewBackend = {
      ...createMemoryBackend(files),
      listChangedMarkdownFiles: async () => err({ kind: "rejected", detail: "HTTP 404" }),
    };
    render(<ReviewApp backend={backend} />);

    expect(
      await screen.findByText(/変更されたファイルを読み込めませんでした（HTTP 404）/),
    ).toBeTruthy();
  });

  it("still tells the reviewer something when loading breaks unexpectedly", async () => {
    const backend: ReviewBackend = {
      ...createMemoryBackend(files),
      listChangedMarkdownFiles: () => Promise.reject(new Error("boom")),
    };
    render(<ReviewApp backend={backend} />);

    expect(await screen.findByText(/boom/)).toBeTruthy();
  });

  it("calls onClose from the close button", async () => {
    const onClose = vi.fn();
    render(<ReviewApp backend={createMemoryBackend(files)} onClose={onClose} />);

    fireEvent.click(await screen.findByRole("button", { name: "閉じる" }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
