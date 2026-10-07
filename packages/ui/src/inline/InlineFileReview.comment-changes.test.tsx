import { err, type ReviewBackend, type ReviewComment, type ReviewThread } from "@mihiraki/core";
import { createMemoryBackend } from "@mihiraki/core/memory";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/preact";
import { describe, expect, it } from "vitest";
import { createThreadStore } from "../threads/thread-store";
import { InlineFileReview } from "./InlineFileReview";

const files = { "docs/a.md": { base: "Alpha version one.\n", head: "Alpha version two.\n" } };
const fileA = { path: "docs/a.md", changeType: "MODIFIED" as const };

function comment(overrides: Partial<ReviewComment> = {}): ReviewComment {
  return {
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
    version: "v0",
    canEdit: true,
    canDelete: true,
    canReact: true,
    ...overrides,
  };
}

function thread(comments: readonly ReviewComment[] = [comment()]): ReviewThread {
  return {
    id: "t1",
    path: "docs/a.md",
    side: "head",
    lines: { start: 1, end: 1 },
    isResolved: false,
    isOutdated: false,
    canReply: true,
    comments,
  };
}

async function renderInline(backend: ReviewBackend) {
  const store = createThreadStore(backend);
  await store.refresh();
  const view = render(
    <InlineFileReview locale="ja" backend={backend} file={fileA} store={store} />,
  );
  await screen.findByText("Why two?");
  return { view, store };
}

function openMenu() {
  fireEvent.click(screen.getByRole("button", { name: "その他の操作" }));
}

function textbox(): HTMLTextAreaElement {
  return screen.getByRole("textbox") as HTMLTextAreaElement;
}

describe("changing comments", () => {
  it("edits a comment in place and shows the new text once saved", async () => {
    await renderInline(createMemoryBackend(files, [thread()]));
    openMenu();

    fireEvent.click(screen.getByRole("menuitem", { name: "編集" }));
    expect(textbox().value).toBe("Why two?");
    fireEvent.input(textbox(), { target: { value: "Why **two**, not three?" } });
    fireEvent.click(screen.getByRole("button", { name: "コメントを更新" }));

    const shown = document.querySelector<HTMLElement>(".mhr-thread");
    expect(await within(shown as HTMLElement).findByText("two")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("does not overwrite a change made elsewhere while editing, unless asked again", async () => {
    const backend = createMemoryBackend(files, [thread()]);
    const { store } = await renderInline(backend);
    openMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "編集" }));
    fireEvent.input(textbox(), { target: { value: "My edit" } });

    // Someone else edits the comment, and the view hears of it (as from GitHub's live updates).
    await backend.editComment(thread(), comment(), "Changed elsewhere");
    await act(() => store.refresh());
    fireEvent.click(screen.getByRole("button", { name: "コメントを更新" }));

    expect(await screen.findByText(/別の場所で更新されました/)).toBeTruthy();
    expect(textbox().value).toBe("My edit");

    fireEvent.click(screen.getByRole("button", { name: "コメントを更新" }));

    await waitFor(() => expect(screen.queryByRole("textbox")).toBeNull());
    expect(screen.getByText("My edit")).toBeTruthy();
  });

  it("deletes a comment once the deletion is confirmed", async () => {
    const second = comment({ id: "c2", bodyHtml: "<p>Second</p>", bodyMarkdown: "Second" });
    await renderInline(createMemoryBackend(files, [thread([comment(), second])]));
    const [, secondMenu] = screen.getAllByRole("button", { name: "その他の操作" });
    if (!secondMenu) throw new Error("no menu");

    fireEvent.click(secondMenu);
    fireEvent.click(screen.getByRole("menuitem", { name: "削除" }));
    expect(screen.getByText("Second")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => expect(screen.queryByText("Second")).toBeNull());
    expect(screen.getByText("Why two?")).toBeTruthy();
  });

  it("keeps a comment when the deletion is cancelled", async () => {
    await renderInline(createMemoryBackend(files, [thread()]));
    openMenu();

    fireEvent.click(screen.getByRole("menuitem", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(screen.queryByRole("button", { name: "削除する" })).toBeNull();
    expect(screen.getByText("Why two?")).toBeTruthy();
  });

  it("offers no edit or deletion where GitHub does not allow them", async () => {
    await renderInline(
      createMemoryBackend(files, [thread([comment({ canEdit: false, canDelete: false })])]),
    );
    openMenu();

    expect(screen.queryByRole("menuitem", { name: "編集" })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "削除" })).toBeNull();
  });

  it("opens the reply form with the comment quoted", async () => {
    await renderInline(
      createMemoryBackend(files, [thread([comment({ bodyMarkdown: "Why two?\nNot one?" })])]),
    );
    openMenu();

    fireEvent.click(screen.getByRole("menuitem", { name: "引用して返信" }));

    expect(textbox().value).toBe("> Why two?\n> Not one?\n\n");
  });

  it("adds a quote to a reply already being written", async () => {
    await renderInline(createMemoryBackend(files, [thread()]));
    fireEvent.click(screen.getByRole("button", { name: "返信" }));
    fireEvent.input(textbox(), { target: { value: "Draft" } });
    openMenu();

    fireEvent.click(screen.getByRole("menuitem", { name: "引用して返信" }));

    expect(textbox().value).toBe("Draft\n\n> Why two?\n\n");
  });
});

describe("reactions", () => {
  const reacted = () =>
    thread([comment({ reactions: [{ kind: "thumbsUp", count: 1, isByViewer: false }] })]);

  it("adds the viewer's reaction to one somebody gave, and takes it back", async () => {
    await renderInline(createMemoryBackend(files, [reacted()]));

    fireEvent.click(screen.getByRole("button", { name: "いいね 1" }));

    const mine = await screen.findByRole("button", { name: "いいね 2" });
    expect(mine.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(mine);
    expect(await screen.findByRole("button", { name: "いいね 1" })).toBeTruthy();
  });

  it("adds a new reaction from the picker", async () => {
    await renderInline(createMemoryBackend(files, [reacted()]));

    fireEvent.click(screen.getByRole("button", { name: "リアクションを付ける" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "ハート" }));

    expect(await screen.findByRole("button", { name: "ハート 1" })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "ハート" })).toBeNull();
  });

  it("says why a reaction could not be changed", async () => {
    const backend: ReviewBackend = {
      ...createMemoryBackend(files, [reacted()]),
      setReaction: async () => err({ kind: "rejected", detail: "HTTP 403" }),
    };
    await renderInline(backend);

    fireEvent.click(screen.getByRole("button", { name: "いいね 1" }));

    expect(
      await screen.findByText("リアクションを変更できませんでした（HTTP 403）。"),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "いいね 1" })).toBeTruthy();
  });

  it("only shows reactions where the viewer may not react", async () => {
    const counted = comment({
      canReact: false,
      reactions: [{ kind: "thumbsUp", count: 1, isByViewer: false }],
    });
    await renderInline(createMemoryBackend(files, [thread([counted])]));

    const reactions = document.querySelector<HTMLElement>(".mhr-reactions");
    expect(reactions?.textContent).toBe("👍1");
    expect(within(reactions as HTMLElement).queryByRole("button")).toBeNull();
    expect(screen.queryByRole("button", { name: "リアクションを付ける" })).toBeNull();
  });
});
