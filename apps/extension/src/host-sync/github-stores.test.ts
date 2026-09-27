import { afterEach, describe, expect, it, vi } from "vitest";
import {
  findReviewStores,
  registerCreatedThread,
  watchReviewThreads,
  type ZustandStore,
} from "./github-stores";

type State = Record<string, unknown>;

function createStore(initial: State): ZustandStore {
  let state = initial;
  let listeners: ((next: State, previous: State) => void)[] = [];
  return {
    getState: () => state,
    setState: (partial: Partial<State>) => {
      const previous = state;
      state = { ...state, ...partial };
      for (const listener of listeners) listener(state, previous);
    },
    subscribe: (listener) => {
      listeners = [...listeners, listener];
      return () => {
        listeners = listeners.filter((l) => l !== listener);
      };
    },
  };
}

function providerFiber(name: string, store: ZustandStore, parent: object | null) {
  return {
    type: { displayName: name },
    child: { memoizedProps: { value: store } },
    return: parent,
  };
}

/** Mirrors what was observed on github.com: the diff header sits below both store providers. */
function renderGitHubLikePage(page: ZustandStore, layout: ZustandStore) {
  const layoutProvider = providerFiber("LayoutStoreProvider", layout, null);
  const pageProvider = providerFiber("PullRequestStoreProvider", page, {
    type: "div",
    return: layoutProvider,
  });
  const header = document.createElement("div");
  header.setAttribute("data-diff-header-wrapper", "true");
  Object.assign(header, {
    __reactFiber$abc123: { type: "div", return: { type: () => null, return: pageProvider } },
  });
  document.body.append(header);
}

function createActions() {
  return {
    addPendingComment: vi.fn(),
    updateThread: vi.fn(),
    onCommentThreadAdded: vi.fn(),
    incrementUnresolvedConversationCount: vi.fn(),
  };
}

function storesWith(actions: ReturnType<typeof createActions>) {
  const page = createStore({
    diffSummariesActions: { onCommentThreadAdded: actions.onCommentThreadAdded },
  });
  const layout = createStore({
    markers: {},
    pendingReview: null,
    pendingReviewActions: { addPendingComment: actions.addPendingComment },
    markersActions: { updateThread: actions.updateThread },
    markerCountsActions: {
      incrementUnresolvedConversationCount: actions.incrementUnresolvedConversationCount,
    },
  });
  return { page, layout };
}

const message = {
  target: { path: "docs/a.md", side: "head" as const, lines: { start: 18, end: 20 } },
  mode: "review" as const,
  thread: { id: "2791962937", subjectType: "line" },
};

afterEach(() => {
  document.body.innerHTML = "";
});

describe("findReviewStores", () => {
  it("finds both stores from the diff header through the React tree", () => {
    const stores = storesWith(createActions());
    renderGitHubLikePage(stores.page, stores.layout);

    expect(findReviewStores(document)).toEqual(stores);
  });

  it("returns null outside the Files changed page", () => {
    expect(findReviewStores(document)).toBeNull();
  });
});

describe("registerCreatedThread", () => {
  it('replays what GitHub does after its own "Add review comment"', () => {
    const actions = createActions();

    expect(registerCreatedThread(storesWith(actions), message)).toBe(true);

    expect(actions.addPendingComment).toHaveBeenCalledWith(2791962937);
    expect(actions.updateThread).toHaveBeenCalledWith(
      2791962937,
      "docs/a.md",
      "R20",
      expect.any(Function),
    );
    expect(actions.onCommentThreadAdded).toHaveBeenCalledWith({
      path: "docs/a.md",
      diffLineKey: "R20",
      threadID: "2791962937",
    });
    expect(actions.incrementUnresolvedConversationCount).toHaveBeenCalled();
  });

  it("gives GitHub the returned thread with its position filled in", () => {
    const actions = createActions();
    registerCreatedThread(storesWith(actions), message);

    const produce = actions.updateThread.mock.calls[0]?.[3] as () => unknown;
    const subject = {
      path: "docs/a.md",
      startLine: 18,
      startDiffSide: "RIGHT",
      endLine: 20,
      endDiffSide: "RIGHT",
      isOutdated: false,
    };
    expect(produce()).toEqual({
      id: "2791962937",
      subjectType: "line",
      subject,
      positioning: subject,
      shouldRenderInDiffLines: true,
    });
  });

  it("does not add a published comment to the pending review", () => {
    const actions = createActions();

    registerCreatedThread(storesWith(actions), { ...message, mode: "single" });

    expect(actions.addPendingComment).not.toHaveBeenCalled();
    expect(actions.updateThread).toHaveBeenCalled();
  });

  it("changes nothing when GitHub no longer has the expected actions", () => {
    const actions = createActions();
    const stores = storesWith(actions);
    stores.layout.setState({ markersActions: {} });

    expect(registerCreatedThread(stores, message)).toBe(false);
    expect(actions.addPendingComment).not.toHaveBeenCalled();
  });
});

describe("watchReviewThreads", () => {
  it("reports changes of GitHub threads or pending review until stopped", () => {
    const stores = storesWith(createActions());
    const onChange = vi.fn();
    const stop = watchReviewThreads(stores, onChange);

    stores.layout.setState({ markers: { "a.md": {} } });
    stores.layout.setState({ unrelated: 1 });
    stop();
    stores.layout.setState({ pendingReview: { id: 1 } });

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
