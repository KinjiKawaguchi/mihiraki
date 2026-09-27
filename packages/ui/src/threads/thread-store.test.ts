import {
  commitId,
  createMemoryBackend,
  type ReviewBackend,
  type ReviewThread,
} from "@mihiraki/core";
import { describe, expect, it, vi } from "vitest";
import { createThreadStore } from "./thread-store";

const thread: ReviewThread = {
  id: "1",
  path: "a.md",
  side: "head",
  lines: { start: 1, end: 1 },
  isResolved: false,
  isOutdated: false,
  isPending: false,
  comments: [],
};

describe("createThreadStore", () => {
  it("starts empty and loads threads on refresh", async () => {
    const store = createThreadStore(createMemoryBackend({}, [thread]));

    expect(store.getThreads()).toEqual([]);
    await store.refresh();

    expect(store.getThreads()).toEqual([thread]);
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
      loadThreads: () =>
        shouldFail ? Promise.reject(new Error("HTTP 500")) : working.loadThreads(),
    };
    const store = createThreadStore(backend);
    await store.refresh();

    shouldFail = true;
    await store.refresh();

    expect(store.getThreads()).toEqual([thread]);
    expect(store.getError()).toBeInstanceOf(Error);
  });

  it("exposes the revision the threads belong to", async () => {
    const revision = { base: commitId("b1b1b1b"), head: commitId("c2c2c2c") };
    const store = createThreadStore(createMemoryBackend({}, [thread], { revision }));

    expect(store.getRevision()).toBeNull();
    await store.refresh();

    expect(store.getRevision()).toEqual(revision);
  });

  it("keeps the newest result when refreshes finish out of order", async () => {
    const pending: ((threads: readonly ReviewThread[]) => void)[] = [];
    const backend: ReviewBackend = {
      ...createMemoryBackend({}),
      loadThreads: () =>
        new Promise((resolve) => {
          pending.push((threads) =>
            resolve({
              revision: { base: commitId("b1b1b1b"), head: commitId("c1c1c1c") },
              threads,
            }),
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

    expect(store.getThreads()).toEqual([thread]);
  });
});
