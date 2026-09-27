import { createMemoryBackend, type ReviewBackend, type ReviewThread } from "@mihiraki/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/preact";
import { describe, expect, it } from "vitest";
import { createThreadStore } from "../threads/thread-store";
import { InlineFileReview } from "./InlineFileReview";

const files = {
  "docs/a.md": { base: "Alpha version one.\n", head: "Alpha version two.\n" },
  "docs/b.md": { base: "Bravo.\n", head: "Bravo changed.\n" },
};
const fileA = { path: "docs/a.md", previousPath: null, changeType: "MODIFIED" as const };

function threadOn(path: string, text: string): ReviewThread {
  return {
    id: path,
    path,
    side: "RIGHT",
    line: 1,
    startLine: null,
    isResolved: false,
    isOutdated: false,
    isPending: false,
    comments: [
      {
        id: path,
        author: "bob",
        avatarUrl: "",
        bodyHtml: `<p>${text}</p>`,
        createdAt: "",
        url: "",
      },
    ],
  };
}

function columnText(container: Element, side: "LEFT" | "RIGHT"): string {
  return Array.from(container.querySelectorAll(`[data-side="${side}"]`))
    .map((cell) => cell.textContent)
    .join("\n");
}

async function renderInline(backend: ReviewBackend) {
  const store = createThreadStore(backend);
  await store.refresh();
  const view = render(<InlineFileReview backend={backend} file={fileA} store={store} />);
  await waitFor(() => expect(columnText(view.container, "RIGHT")).toContain("Alpha version two."));
  return view;
}

describe("InlineFileReview", () => {
  it("renders one file side by side", async () => {
    const { container } = await renderInline(createMemoryBackend(files));

    expect(columnText(container, "LEFT")).toContain("Alpha version one.");
  });

  it("shows only the threads of its own file", async () => {
    await renderInline(
      createMemoryBackend(files, [
        threadOn("docs/a.md", "about A"),
        threadOn("docs/b.md", "about B"),
      ]),
    );

    expect(screen.getByText("about A")).toBeTruthy();
    expect(screen.queryByText("about B")).toBeNull();
  });

  it("refreshes the shared threads after posting so the new comment appears", async () => {
    const { container } = await renderInline(createMemoryBackend(files));

    fireEvent.mouseOver(container.querySelector('[data-side="RIGHT"] p') as Element);
    fireEvent.click(screen.getByRole("button", { name: "コメントを追加" }));
    fireEvent.input(screen.getByRole("textbox"), { target: { value: "Posted inline" } });
    fireEvent.click(screen.getByRole("button", { name: "コメント" }));

    expect(await screen.findByText("Posted inline")).toBeTruthy();
  });

  it("offers adding to the review when the viewer has a pending review in any file", async () => {
    const pending = { ...threadOn("docs/b.md", "pending elsewhere"), isPending: true };
    const { container } = await renderInline(createMemoryBackend(files, [pending]));

    fireEvent.mouseOver(container.querySelector('[data-side="RIGHT"] p') as Element);
    fireEvent.click(screen.getByRole("button", { name: "コメントを追加" }));

    expect(screen.getByRole("button", { name: "レビューに追加" })).toBeTruthy();
  });

  it("shows the host-specific notice while the viewer has a pending review", async () => {
    const backend = createMemoryBackend(files, [
      { ...threadOn("docs/b.md", "pending"), isPending: true },
    ]);
    const store = createThreadStore(backend);
    await store.refresh();

    render(
      <InlineFileReview
        backend={backend}
        file={fileA}
        store={store}
        pendingReviewNotice="Submit from the host"
      />,
    );

    expect(await screen.findByText("Submit from the host")).toBeTruthy();
  });

  it("hides the notice when nothing is pending", async () => {
    const backend = createMemoryBackend(files);
    const store = createThreadStore(backend);
    await store.refresh();

    render(
      <InlineFileReview
        backend={backend}
        file={fileA}
        store={store}
        pendingReviewNotice="Submit from the host"
      />,
    );

    await waitFor(() => expect(document.body.textContent).toContain("Alpha version two."));
    expect(screen.queryByText("Submit from the host")).toBeNull();
  });

  it("tells the reviewer when the pull request changed since the file was loaded", async () => {
    const older = { base: "b", head: "h1" };
    const newer = { base: "b", head: "h2" };
    const base = createMemoryBackend(files, [], { revision: newer });
    let loads = 0;
    const backend: ReviewBackend = {
      ...base,
      loadFileVersions: async (file) => {
        loads += 1;
        const versions = await base.loadFileVersions(file);
        return loads === 1 ? { ...versions, revision: older } : versions;
      },
    };
    const store = createThreadStore(backend);
    await store.refresh();
    render(<InlineFileReview backend={backend} file={fileA} store={store} />);

    fireEvent.click(await screen.findByRole("button", { name: "最新の版を読み込む" }));

    await waitFor(() => expect(screen.queryByText(/更新されています/)).toBeNull());
    expect(loads).toBe(2);
  });

  it("shows why the file could not be loaded", async () => {
    const backend: ReviewBackend = {
      ...createMemoryBackend(files),
      loadFileVersions: () => Promise.reject(new Error("HTTP 404")),
    };
    render(<InlineFileReview backend={backend} file={fileA} store={createThreadStore(backend)} />);

    expect(await screen.findByText(/HTTP 404/)).toBeTruthy();
  });
});
