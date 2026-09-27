import { commitId, err, ok, type ReviewBackend, type ReviewThread } from "@mihiraki/core";
import { createMemoryBackend } from "@mihiraki/core/memory";
import { describe, expect, it, vi } from "vitest";
import { createThreadStore } from "./thread-store";

const thread: ReviewThread = {
  id: "1",
  path: "a.md",
  side: "head",
  lines: { start: 1, end: 1 },
  isResolved: false,
  isOutdated: false,
  comments: [],
};

describe("createThreadStore", () => {
  it("starts empty and loads threads on refresh", async () => {
    const store = createThreadStore(createMemoryBackend({}, [thread]));

    expect(store.getState().snapshot).toBeNull();
    await store.refresh();

    expect(store.getState().snapshot?.threads).toEqual([thread]);
  });

  it("notifies subscribers after a refresh until they unsubscribe", async () => {
    const store = createThreadStore(createMemoryBackend({}, [thread]));
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    await store.refresh();
    unsubscribe();
    await store.refresh();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("keeps the previous threads and exposes the error when a refresh fails", async () => {
    const working = createMemoryBackend({}, [thread]);
    let shouldFail = false;
    const backend: ReviewBackend = {
      ...working,
      loadThreads: async () =>
        shouldFail ? err({ kind: "rejected", detail: "HTTP 500" }) : working.loadThreads(),
    };
    const store = createThreadStore(backend);
    await store.refresh();

    shouldFail = true;
    await store.refresh();

    expect(store.getState().snapshot?.threads).toEqual([thread]);
    expect(store.getState().error).toEqual({
      kind: "host",
      error: { kind: "rejected", detail: "HTTP 500" },
    });
  });

  it("exposes the revision the threads belong to", async () => {
    const revision = { base: commitId("b1b1b1b"), head: commitId("c2c2c2c") };
    const store = createThreadStore(createMemoryBackend({}, [thread], { revision }));

    await store.refresh();

    expect(store.getState().snapshot?.revision).toEqual(revision);
  });

  it("exposes whether the viewer has a pending review, as the backend reports it", async () => {
    const pendingComment = {
      id: "c1",
      isPending: true,
      author: "me",
      avatarUrl: "",
      bodyHtml: "",
      createdAt: "",
      url: "",
    };
    const store = createThreadStore(
      createMemoryBackend({}, [{ ...thread, comments: [pendingComment] }]),
    );

    await store.refresh();

    expect(store.getState().snapshot?.hasPendingReview).toBe(true);
  });

  it("keeps the newest result when refreshes finish out of order", async () => {
    const pending: ((threads: readonly ReviewThread[]) => void)[] = [];
    const backend: ReviewBackend = {
      ...createMemoryBackend({}),
      loadThreads: () =>
        new Promise((resolve) => {
          pending.push((threads) =>
            resolve(
              ok({
                revision: { base: commitId("b1b1b1b"), head: commitId("c1c1c1c") },
                threads,
                hasPendingReview: false,
              }),
            ),
          );
        }),
    };
    const store = createThreadStore(backend);
    const older = store.refresh();
    const newer = store.refresh();

    pending[1]?.([thread]);
    await newer;
    pending[0]?.([]);
    await older;

    expect(store.getState().snapshot?.threads).toEqual([thread]);
  });
});
