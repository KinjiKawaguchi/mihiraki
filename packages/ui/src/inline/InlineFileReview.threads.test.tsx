import { err, type ReviewBackend, type ReviewThread } from "@mihiraki/core";
import { createMemoryBackend } from "@mihiraki/core/memory";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/preact";
import { describe, expect, it } from "vitest";
import { createThreadStore } from "../threads/thread-store";
import { InlineFileReview } from "./InlineFileReview";

const files = { "docs/a.md": { base: "Alpha version one.\n", head: "Alpha version two.\n" } };
const fileA = { path: "docs/a.md", changeType: "MODIFIED" as const };

function thread(overrides: Partial<ReviewThread> = {}): ReviewThread {
  return {
    id: "t1",
    path: "docs/a.md",
    side: "head",
    lines: { start: 1, end: 1 },
    isResolved: false,
    isOutdated: false,
    canReply: true,
    comments: [
      {
        id: "c1",
        isPending: false,
        author: "bob",
        avatarUrl: "",
        bodyHtml: "<p>Why two?</p>",
        createdAt: "",
        url: "",
        isByChangeAuthor: false,
        bodyMarkdown: "Why two?",
        reactions: [],
        newIssueUrl: null,
      },
    ],
    ...overrides,
  };
}

async function renderInline(backend: ReviewBackend) {
  const store = createThreadStore(backend);
  await store.refresh();
  const view = render(
    <InlineFileReview locale="ja" backend={backend} file={fileA} store={store} />,
  );
  await screen.findByText("Why two?");
  return view;
}

function threadElement(): HTMLElement {
  const element = document.querySelector<HTMLElement>(".mhr-thread");
  if (!element) throw new Error("no thread shown");
  return element;
}

describe("InlineFileReview threads", () => {
  it("replies in a thread and shows the reply once posted", async () => {
    await renderInline(createMemoryBackend(files, [thread()]));

    fireEvent.click(screen.getByRole("button", { name: "返信" }));
    fireEvent.input(screen.getByRole("textbox"), { target: { value: "Because of ADR-7" } });
    fireEvent.click(screen.getByRole("button", { name: "コメント" }));

    expect(await within(threadElement()).findByText("Because of ADR-7")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("adds a reply to the pending review while one exists", async () => {
    const pendingComments = thread().comments.map((comment) => ({
      ...comment,
      id: "c2",
      isPending: true,
      bodyHtml: "<p>Pending note</p>",
    }));
    const pending = thread({ id: "t2", comments: pendingComments });
    await renderInline(createMemoryBackend(files, [thread(), pending]));

    fireEvent.click(within(threadElement()).getByRole("button", { name: "返信" }));

    expect(screen.getByRole("button", { name: "レビューに追加" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "コメント" })).toBeNull();
  });

  it("offers no reply where the viewer may not reply", async () => {
    await renderInline(createMemoryBackend(files, [thread({ canReply: false })]));

    expect(screen.queryByRole("button", { name: "返信" })).toBeNull();
  });

  it("resolves a thread, folding it, and opens it again", async () => {
    await renderInline(createMemoryBackend(files, [thread()]));

    fireEvent.click(screen.getByRole("button", { name: "解決済みにする" }));

    await waitFor(() => expect(screen.queryByText("Why two?")).toBeNull());
    expect(within(threadElement()).getByText("解決済み")).toBeTruthy();

    fireEvent.click(within(threadElement()).getByRole("button", { name: /1件/ }));
    fireEvent.click(screen.getByRole("button", { name: "未解決に戻す" }));

    await waitFor(() => expect(within(threadElement()).queryByText("解決済み")).toBeNull());
    expect(screen.getByText("Why two?")).toBeTruthy();
  });

  it("says why a thread could not be resolved", async () => {
    const backend: ReviewBackend = {
      ...createMemoryBackend(files, [thread()]),
      setThreadResolved: async () => err({ kind: "rejected", detail: "HTTP 403" }),
    };
    await renderInline(backend);

    fireEvent.click(screen.getByRole("button", { name: "解決済みにする" }));

    expect(
      await screen.findByText("スレッドを解決済みにできませんでした（HTTP 403）。"),
    ).toBeTruthy();
    expect(screen.getByText("Why two?")).toBeTruthy();
  });
});
