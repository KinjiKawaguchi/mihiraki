import { err, type ReviewBackend, type ReviewThread } from "@mihiraki/core";
import { createMemoryBackend } from "@mihiraki/core/memory";
import type { Locale } from "@mihiraki/ui";
import { waitFor } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import type { HostSyncClient } from "../host-sync/client";
import { appendFileBlock } from "./fixture";
import { isSplitActive, SPLIT_TOGGLE_TAG, SPLIT_VIEW_TAG } from "./github-file-dom";
import { startInlineReview } from "./inline-review";

const backend = createMemoryBackend({
  "docs/a.md": { base: "Alpha version one.\n", head: "Alpha version two.\n" },
  "docs/b.md": { base: "Bravo.\n", head: "Bravo changed.\n" },
});

let stop: (() => void) | null = null;

afterEach(() => {
  stop?.();
  stop = null;
  document.head.innerHTML = "";
  document.body.innerHTML = "";
});

async function start(reviewBackend: ReviewBackend = backend, locale: Locale = "ja") {
  const started = await startInlineReview({
    document,
    backend: reviewBackend,
    cssText: "",
    locale,
  });
  if (!started.ok) throw new Error(`Unexpected failure: ${started.error.kind}`);
  stop = started.value;
}

function toggleButton(container: Element): HTMLButtonElement | null {
  return container.querySelector(SPLIT_TOGGLE_TAG)?.shadowRoot?.querySelector("button") ?? null;
}

function splitViewText(container: Element): string {
  return container.querySelector(SPLIT_VIEW_TAG)?.shadowRoot?.textContent ?? "";
}

describe("startInlineReview", () => {
  it("adds a split toggle beside the view switcher of changed Markdown files only", async () => {
    const markdown = await appendFileBlock(document, "docs/a.md");
    const code = await appendFileBlock(document, "src/app.ts");

    await start();

    expect(
      markdown
        .querySelector('[data-component="SegmentedControl"]')
        ?.nextElementSibling?.tagName.toLowerCase(),
    ).toBe(SPLIT_TOGGLE_TAG);
    expect(toggleButton(code)).toBeNull();
  });

  it("labels the toggle in the language it is given", async () => {
    const container = await appendFileBlock(document, "docs/a.md");
    await start(backend, "en");

    expect(toggleButton(container)?.textContent).toBe("Split");
  });

  it("replaces the diff with the rendered split view when toggled on", async () => {
    const container = await appendFileBlock(document, "docs/a.md");
    await start();

    toggleButton(container)?.click();

    expect(isSplitActive(container)).toBe(true);
    expect(toggleButton(container)?.getAttribute("aria-pressed")).toBe("true");
    await waitFor(() => expect(splitViewText(container)).toContain("Alpha version two."));
  });

  it("restores GitHub diff when toggled off", async () => {
    const container = await appendFileBlock(document, "docs/a.md");
    await start();

    toggleButton(container)?.click();
    toggleButton(container)?.click();

    expect(isSplitActive(container)).toBe(false);
    expect(container.querySelector(SPLIT_VIEW_TAG)).toBeNull();
  });

  it("reports a pull request whose files cannot be listed, leaving the page alone", async () => {
    const container = await appendFileBlock(document, "docs/a.md");
    const offline: ReviewBackend = {
      ...backend,
      listChangedMarkdownFiles: async () => err({ kind: "network" }),
    };

    const started = await startInlineReview({
      document,
      backend: offline,
      cssText: "",
      locale: "ja",
    });

    expect(started).toEqual(err({ kind: "network" }));
    expect(toggleButton(container)).toBeNull();
    expect(document.head.querySelector("style")).toBeNull();
  });

  it("decorates file blocks that GitHub renders later", async () => {
    await start();

    const late = await appendFileBlock(document, "docs/b.md");

    await waitFor(() => expect(toggleButton(late)).not.toBeNull());
  });

  it("puts the toggle back when GitHub re-renders the file header", async () => {
    const container = await appendFileBlock(document, "docs/a.md");
    await start();

    container.querySelector(SPLIT_TOGGLE_TAG)?.remove();
    container.querySelector(".actions")?.append(document.createElement("span"));

    await waitFor(() => expect(toggleButton(container)).not.toBeNull());
  });

  it("removes every trace when stopped", async () => {
    const container = await appendFileBlock(document, "docs/a.md");
    await start();
    toggleButton(container)?.click();

    stop?.();
    stop = null;

    expect(container.querySelector(SPLIT_TOGGLE_TAG)).toBeNull();
    expect(container.querySelector(SPLIT_VIEW_TAG)).toBeNull();
    expect(isSplitActive(container)).toBe(false);
    expect(document.head.querySelector("style")).toBeNull();
  });

  describe("with GitHub own UI kept in sync", () => {
    const pending: ReviewThread = {
      id: "p1",
      path: "docs/a.md",
      side: "head",
      lines: { start: 1, end: 1 },
      isResolved: false,
      isOutdated: false,
      comments: [
        {
          id: "p1-1",
          isPending: true,
          author: "me",
          avatarUrl: "",
          bodyHtml: "<p>draft</p>",
          createdAt: "",
          url: "",
        },
      ],
    };

    function fakeHostSync(isAvailable: boolean) {
      let notify: (() => void) | null = null;
      let notifyLost: (() => void) | null = null;
      const client: HostSyncClient = {
        isHostAvailable: async () => isAvailable,
        announceThreadCreated: async () => isAvailable,
        onHostThreadsChanged: (listener) => {
          notify = listener;
          return () => {
            notify = null;
          };
        },
        onSyncLost: (listener) => {
          notifyLost = listener;
          return () => {
            notifyLost = null;
          };
        },
      };
      return { client, changeHostThreads: () => notify?.(), loseSync: () => notifyLost?.() };
    }

    function backendWithPendingReview(): ReviewBackend & { loadThreadsCalls: () => number } {
      const base = createMemoryBackend(
        { "docs/a.md": { base: "Alpha version one.\n", head: "Alpha version two.\n" } },
        [pending],
      );
      let calls = 0;
      return {
        ...base,
        loadThreads: () => {
          calls += 1;
          return base.loadThreads();
        },
        loadThreadsCalls: () => calls,
      };
    }

    async function startWith(hostSync: HostSyncClient, backend: ReviewBackend) {
      const container = await appendFileBlock(document, "docs/a.md");
      const started = await startInlineReview({
        document,
        backend,
        cssText: "",
        hostSync,
        locale: "ja",
      });
      if (!started.ok) throw new Error(`Unexpected failure: ${started.error.kind}`);
      stop = started.value;
      toggleButton(container)?.click();
      await waitFor(() => expect(splitViewText(container)).toContain("Alpha version two."));
      return container;
    }

    it("leaves out the reload notice because GitHub counts the pending comments itself", async () => {
      const container = await startWith(fakeHostSync(true).client, backendWithPendingReview());

      expect(splitViewText(container)).not.toContain("Submit review");
    });

    it("keeps the reload notice when GitHub stores cannot be reached", async () => {
      const container = await startWith(fakeHostSync(false).client, backendWithPendingReview());

      await waitFor(() => expect(splitViewText(container)).toContain("Submit review"));
    });

    it("shows the reload notice once a comment could not be shown in GitHub own UI", async () => {
      const host = fakeHostSync(true);
      const container = await startWith(host.client, backendWithPendingReview());

      host.loseSync();

      await waitFor(() => expect(splitViewText(container)).toContain("Submit review"));
      expect(splitViewText(container)).toContain("Alpha version two.");
    });

    it("reloads threads when they change in GitHub own UI", async () => {
      const host = fakeHostSync(true);
      const backend = backendWithPendingReview();
      await startWith(host.client, backend);
      const before = backend.loadThreadsCalls();

      host.changeHostThreads();

      await waitFor(() => expect(backend.loadThreadsCalls()).toBeGreaterThan(before));
    });
  });
});
