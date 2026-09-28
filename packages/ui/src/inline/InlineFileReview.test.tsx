import { commitId, err, ok, type ReviewBackend, type ReviewThread } from "@mihiraki/core";
import { createMemoryBackend } from "@mihiraki/core/memory";
import { fireEvent, render, screen, waitFor } from "@testing-library/preact";
import { describe, expect, it, vi } from "vitest";
import { createThreadStore } from "../threads/thread-store";
import { InlineFileReview } from "./InlineFileReview";

const files = {
  "docs/a.md": { base: "Alpha version one.\n", head: "Alpha version two.\n" },
  "docs/b.md": { base: "Bravo.\n", head: "Bravo changed.\n" },
};
const fileA = { path: "docs/a.md", changeType: "MODIFIED" as const };

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
        isByChangeAuthor: false,
        bodyMarkdown: "",
        reactions: [],
        newIssueUrl: null,
      },
    ],
  };
}

function pendingThreadOn(path: string, text: string): ReviewThread {
  const thread = threadOn(path, text);
  return { ...thread, comments: thread.comments.map((c) => ({ ...c, isPending: true })) };
}

function columnText(container: Element, side: "base" | "head"): string {
  return Array.from(container.querySelectorAll(`[data-side="${side}"]`))
    .map((cell) => cell.textContent)
    .join("\n");
}

async function renderInline(backend: ReviewBackend) {
  const store = createThreadStore(backend);
  await store.refresh();
  const view = render(
    <InlineFileReview locale="ja" backend={backend} file={fileA} store={store} />,
  );
  await waitFor(() => expect(columnText(view.container, "head")).toContain("Alpha version two."));
  return view;
}

describe("InlineFileReview", () => {
  it("renders one file side by side", async () => {
    const { container } = await renderInline(createMemoryBackend(files));

    expect(columnText(container, "base")).toContain("Alpha version one.");
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

    fireEvent.mouseOver(container.querySelector('[data-side="head"] p') as Element);
    fireEvent.click(screen.getByRole("button", { name: "コメントを追加" }));
    fireEvent.input(screen.getByRole("textbox"), { target: { value: "Posted inline" } });
    fireEvent.click(screen.getByRole("button", { name: "コメント" }));

    expect(await screen.findByText("Posted inline")).toBeTruthy();
  });

  it("offers adding to the review when the viewer has a pending review in any file", async () => {
    const pending = pendingThreadOn("docs/b.md", "pending elsewhere");
    const { container } = await renderInline(createMemoryBackend(files, [pending]));

    fireEvent.mouseOver(container.querySelector('[data-side="head"] p') as Element);
    fireEvent.click(screen.getByRole("button", { name: "コメントを追加" }));

    expect(screen.getByRole("button", { name: "レビューに追加" })).toBeTruthy();
  });

  it("offers only adding to the review when the host reports a pending review without threads", async () => {
    // A review can be started without any comment yet, e.g. from GitHub's own review dialog.
    const memory = createMemoryBackend(files);
    const backend: ReviewBackend = {
      ...memory,
      loadThreads: async () => {
        const loaded = await memory.loadThreads();
        return loaded.ok ? ok({ ...loaded.value, hasPendingReview: true }) : loaded;
      },
    };
    const { container } = await renderInline(backend);

    fireEvent.mouseOver(container.querySelector('[data-side="head"] p') as Element);
    fireEvent.click(screen.getByRole("button", { name: "コメントを追加" }));

    expect(screen.getByRole("button", { name: "レビューに追加" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "コメント" })).toBeNull();
  });

  it("shows the host-specific notice while the viewer has a pending review", async () => {
    const backend = createMemoryBackend(files, [pendingThreadOn("docs/b.md", "pending")]);
    const store = createThreadStore(backend);
    await store.refresh();

    render(
      <InlineFileReview
        locale="ja"
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
        locale="ja"
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
    const older = { base: commitId("b1b1b1b"), head: commitId("c1c1c1c") };
    const newer = { base: commitId("b1b1b1b"), head: commitId("c2c2c2c") };
    const base = createMemoryBackend(files, [], { revision: newer });
    let loads = 0;
    const backend: ReviewBackend = {
      ...base,
      loadFileVersions: async (file) => {
        loads += 1;
        const versions = await base.loadFileVersions(file);
        return loads === 1 && versions.ok ? ok({ ...versions.value, revision: older }) : versions;
      },
    };
    const store = createThreadStore(backend);
    await store.refresh();
    render(<InlineFileReview locale="ja" backend={backend} file={fileA} store={store} />);

    fireEvent.click(await screen.findByRole("button", { name: "最新の版を読み込む" }));

    await waitFor(() => expect(screen.queryByText(/更新されています/)).toBeNull());
    expect(loads).toBe(2);
  });

  it("shows which file could not be loaded and why", async () => {
    const backend: ReviewBackend = {
      ...createMemoryBackend(files),
      loadFileVersions: async () => err({ kind: "timeout" }),
    };
    render(
      <InlineFileReview
        locale="ja"
        backend={backend}
        file={fileA}
        store={createThreadStore(backend)}
      />,
    );

    expect(
      await screen.findByText(/docs\/a\.md を読み込めませんでした。応答がありませんでした/),
    ).toBeTruthy();
  });

  it("shows why the comments could not be loaded", async () => {
    const backend: ReviewBackend = {
      ...createMemoryBackend(files),
      loadThreads: async () => err({ kind: "unexpectedResponse" }),
    };
    const store = createThreadStore(backend);
    await store.refresh();
    render(<InlineFileReview locale="ja" backend={backend} file={fileA} store={store} />);

    expect(
      await screen.findByText(/コメントを取得できませんでした。応答を解釈できませんでした/),
    ).toBeTruthy();
  });

  it("speaks the language it is given", async () => {
    const backend: ReviewBackend = {
      ...createMemoryBackend(files),
      loadFileVersions: async () => err({ kind: "timeout" }),
    };
    render(
      <InlineFileReview
        locale="en"
        backend={backend}
        file={fileA}
        store={createThreadStore(backend)}
      />,
    );

    expect(
      await screen.findByText(
        "Could not load docs/a.md. There was no response. Try again in a moment.",
      ),
    ).toBeTruthy();
  });

  it("offers a way back to the host's own view of the file when given one", async () => {
    const onSelect = vi.fn();
    const backend = createMemoryBackend(files);
    render(
      <InlineFileReview
        locale="ja"
        backend={backend}
        file={fileA}
        store={createThreadStore(backend)}
        hostViewSwitch={{ label: "元の表示", description: "元の表示に戻します", onSelect }}
      />,
    );

    const button = await screen.findByRole("button", { name: "元の表示" });
    fireEvent.click(button);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(button.title).toBe("元の表示に戻します");
  });

  it("shows the file in one column when the layout is unified", async () => {
    const backend = createMemoryBackend(files);
    const { container } = render(
      <InlineFileReview
        locale="en"
        layout="unified"
        backend={backend}
        file={fileA}
        store={createThreadStore(backend)}
      />,
    );

    await waitFor(() => expect(container.querySelector(".mhr-unified")).not.toBeNull());
    expect(container.querySelector(".mhr-split__header")).toBeNull();
    expect(container.querySelector("del.mhr-del")?.textContent).toBe("one");
    expect(container.querySelector("ins.mhr-ins")?.textContent).toBe("two");
  });
});
