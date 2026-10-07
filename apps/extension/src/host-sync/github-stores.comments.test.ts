import { describe, expect, it, vi } from "vitest";
import { createStore } from "./fake-stores";
import { applyHostChange, type ReviewStores } from "./github-stores";
import type { CheckedHostChange } from "./protocol";

/** GitHub's thread 7 on R3 of docs/a.md, as its layout store holds it (observed 2026-10). */
const markers = {
  "docs/a.md": {
    R3: {
      threads: [
        {
          id: "7",
          commentsData: {
            comments: [
              { id: "PRRC_first", databaseId: 4115, body: "First" },
              { id: "PRRC_second", databaseId: 4116, body: "Second" },
            ],
          },
        },
      ],
    },
  },
};

function createActions() {
  return {
    updateThreadComment: vi.fn(),
    deleteThreadComment: vi.fn(() => "comment_deleted"),
    removePendingComment: vi.fn(),
    removeItemsForComment: vi.fn(),
    onCommentThreadDeleted: vi.fn(),
  };
}

function storesWith(actions: ReturnType<typeof createActions>): ReviewStores {
  return {
    page: createStore({
      diffSummariesActions: { onCommentThreadDeleted: actions.onCommentThreadDeleted },
    }),
    layout: createStore({
      markers,
      markersActions: {
        updateThreadComment: actions.updateThreadComment,
        deleteThreadComment: actions.deleteThreadComment,
      },
      pendingReviewActions: { removePendingComment: actions.removePendingComment },
      unifiedBatchActions: { removeItemsForComment: actions.removeItemsForComment },
    }),
  };
}

const commentOf = (commentId: number) => ({
  target: { path: "docs/a.md", side: "head" as const, lines: { start: 3, end: 3 } },
  thread: { id: "7" },
  threadId: 7,
  commentId,
});

const edit: CheckedHostChange = {
  ...commentOf(4115),
  kind: "commentEdited",
  comment: { body: "Fixed", bodyHTML: "<p>Fixed</p>", bodyVersion: "v2" },
};

interface CommentUpdate {
  readonly threadID: number;
  readonly filePath: string;
  readonly lineMarkersKey: string;
  readonly match: (comment: unknown) => boolean;
  readonly transform: (comment: unknown) => unknown;
}

function updateOf(actions: ReturnType<typeof createActions>): CommentUpdate {
  const [update] = actions.updateThreadComment.mock.lastCall ?? [];
  return update as CommentUpdate;
}

describe("replaying comment changes in GitHub's stores", () => {
  it("puts an edit's text and version on the comment, as GitHub's own edit form does", () => {
    const actions = createActions();

    expect(applyHostChange(storesWith(actions), edit, null)).toBe(true);

    const update = updateOf(actions);
    expect(update).toMatchObject({ threadID: 7, filePath: "docs/a.md", lineMarkersKey: "R3" });
    expect(update.match({ databaseId: 4115 })).toBe(true);
    expect(update.match({ databaseId: 4116 })).toBe(false);
    expect(update.transform({ id: "PRRC_first", databaseId: 4115, body: "First" })).toEqual({
      id: "PRRC_first",
      databaseId: 4115,
      body: "Fixed",
      bodyHTML: "<p>Fixed</p>",
      bodyVersion: "v2",
    });
  });

  it("adds no comment when GitHub's stores do not have the edited one", () => {
    const actions = createActions();

    applyHostChange(storesWith(actions), edit, null);

    // GitHub appends whatever the transform returns for a comment it did not find.
    expect(updateOf(actions).transform(undefined)).toBeUndefined();
  });

  it("puts the reactions GitHub returned on the comment", () => {
    const actions = createActions();
    const reactionGroups = [{ reaction: { content: "HEART" }, totalCount: 1 }];
    const change: CheckedHostChange = {
      ...commentOf(4115),
      kind: "reactionsChanged",
      reactionGroups,
    };

    expect(applyHostChange(storesWith(actions), change, null)).toBe(true);

    const update = updateOf(actions);
    expect(update.match({ databaseId: 4115 })).toBe(true);
    expect(update.transform({ databaseId: 4115, reactionGroups: [] })).toEqual({
      databaseId: 4115,
      reactionGroups,
    });
    expect(update.transform(undefined)).toBeUndefined();
  });

  it("removes a deleted comment by the node id GitHub's stores know it by", () => {
    const actions = createActions();
    const change: CheckedHostChange = { ...commentOf(4116), kind: "commentDeleted" };

    expect(applyHostChange(storesWith(actions), change, null)).toBe(true);

    expect(actions.removeItemsForComment).toHaveBeenCalledWith(4116);
    expect(actions.deleteThreadComment).toHaveBeenCalledWith(7, "PRRC_second", "docs/a.md", "R3");
    expect(actions.removePendingComment).toHaveBeenCalledWith(7);
    expect(actions.onCommentThreadDeleted).not.toHaveBeenCalled();
  });

  it("drops the thread from the file's summary when its last comment was deleted", () => {
    const actions = createActions();
    actions.deleteThreadComment.mockReturnValue("thread_deleted");
    const change: CheckedHostChange = { ...commentOf(4116), kind: "commentDeleted" };

    applyHostChange(storesWith(actions), change, null);

    expect(actions.onCommentThreadDeleted).toHaveBeenCalledWith({
      path: "docs/a.md",
      threadID: "7",
    });
  });

  it("changes nothing for a comment GitHub's stores do not have", () => {
    const actions = createActions();
    const change: CheckedHostChange = { ...commentOf(9999), kind: "commentDeleted" };

    expect(applyHostChange(storesWith(actions), change, null)).toBe(false);
    expect(actions.deleteThreadComment).not.toHaveBeenCalled();
  });

  it("changes nothing when GitHub no longer has the expected actions", () => {
    const actions = createActions();
    const stores = storesWith(actions);
    stores.layout.setState({ markersActions: {} });

    expect(applyHostChange(stores, edit, null)).toBe(false);
    expect(applyHostChange(stores, { ...commentOf(4116), kind: "commentDeleted" }, null)).toBe(
      false,
    );
  });
});
