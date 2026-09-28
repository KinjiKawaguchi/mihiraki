import { ok } from "@mihiraki/core";
import { describe, expect, it, vi } from "vitest";
import type { PullRequestLocation } from "../github/pr-location";
import { followPullRequestPages, type PageContext } from "./pull-request-pages";

const CONVERSATION = "https://github.com/octo/docs/pull/7";
const FILES = "https://github.com/octo/docs/pull/7/changes";

function fakeContext() {
  const navigations: ((event: { readonly newUrl: URL }) => void)[] = [];
  const invalidations: (() => void)[] = [];
  const ctx: PageContext = {
    addEventListener: (_target, _type, handler) => navigations.push(handler),
    onInvalidated: (callback) => invalidations.push(callback),
  };
  return {
    ctx,
    navigate: (to: string) => {
      for (const listener of navigations) listener({ newUrl: new URL(to) });
    },
    invalidate: () => {
      for (const listener of invalidations) listener();
    },
  };
}

function follow(initialUrl: string) {
  const page = fakeContext();
  const stop = vi.fn();
  const start = vi.fn(async (_pr: PullRequestLocation) => ok(stop));
  followPullRequestPages(page.ctx, { initialUrl, start });
  return { ...page, start, stop };
}

describe("followPullRequestPages", () => {
  it("starts the review on the Files changed tab it is loaded on", () => {
    const { start } = follow(FILES);

    expect(start).toHaveBeenCalledWith({ owner: "octo", repo: "docs", number: 7 });
  });

  it("does not start on other tabs", () => {
    const { start } = follow(CONVERSATION);

    expect(start).not.toHaveBeenCalled();
  });

  it("starts for the destination of a navigation before the address changes", () => {
    // WXT reports a navigation when it begins, while window.location still shows the
    // page being left.
    const { navigate, start } = follow(CONVERSATION);

    navigate(FILES);

    expect(start).toHaveBeenCalledWith({ owner: "octo", repo: "docs", number: 7 });
  });

  it("stops the review when the reviewer leaves the tab", async () => {
    const { navigate, stop } = follow(FILES);

    navigate(CONVERSATION);

    await vi.waitFor(() => expect(stop).toHaveBeenCalled());
  });

  it("stops the review when the script is invalidated", async () => {
    const { invalidate, stop } = follow(FILES);

    invalidate();

    await vi.waitFor(() => expect(stop).toHaveBeenCalled());
  });
});
