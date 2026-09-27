import { createMemoryBackend, type ReviewBackend, type ReviewThread } from "@mihiraki/core";
import { describe, expect, it, vi } from "vitest";
import { createThreadStore } from "./thread-store";

const thread: ReviewThread = {
  id: "1",
  path: "a.md",
  side: "RIGHT",
  line: 1,
  startLine: null,
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
});
