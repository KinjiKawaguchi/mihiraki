import { err, type ReviewBackend, type ReviewThread } from "@mihiraki/core";
import { createMemoryBackend } from "@mihiraki/core/memory";
import type { DiffLayout } from "@mihiraki/ui";
import { waitFor } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";
import type { HostSyncClient } from "../host-sync/client";
import { appendFileBlock, showRichDiff } from "./fixture";
import { isRenderedViewActive, REVIEW_VIEW_TAG } from "./github-file-dom";
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

async function start(reviewBackend: ReviewBackend = backend, initialLayout: DiffLayout = "split") {
  const started = await startInlineReview({
    document,
    backend: reviewBackend,
    cssText: "",
    locale: "ja",
    initialLayout,
  });
  if (!started.ok) throw new Error(`Unexpected failure: ${started.error.kind}`);
  stop = started.value;
}

function viewRoot(container: Element): ShadowRoot | null {
  return container.querySelector(REVIEW_VIEW_TAG)?.shadowRoot ?? null;
}

function viewText(container: Element): string {
  return viewRoot(container)?.textContent ?? "";
}

describe("startInlineReview", () => {
  it("leaves a file alone while GitHub shows its source diff", async () => {
    const container = await appendFileBlock(document, "docs/a.md");
    await start();

    expect(container.querySelector(REVIEW_VIEW_TAG)).toBeNull();
    expect(isRenderedViewActive(container)).toBe(false);
  });

  it("replaces GitHub's rich diff with the split view when the layout is split", async () => {
    const container = await appendFileBlock(document, "docs/a.md");
    await start();

    showRichDiff(container, true);

    await waitFor(() => expect(viewText(container)).toContain("Alpha version two."));
    expect(isRenderedViewActive(container)).toBe(true);
    expect(viewRoot(container)?.querySelector(".mhr-split__header")).toBeTruthy();
  });

  it("shows one column with comments when the layout is unified", async () => {
    const container = await appendFileBlock(document, "docs/a.md");
    await start(backend, "unified");

    showRichDiff(container, true);

    await waitFor(() => expect(viewRoot(container)?.querySelector(".mhr-unified")).toBeTruthy());
    expect(viewRoot(container)?.querySelector(".mhr-split__header")).toBeNull();
  });

  it("restores GitHub's diff when the file goes back to the source diff", async () => {
    const container = await appendFileBlock(document, "docs/a.md");
    await start();
    showRichDiff(container, true);
    await waitFor(() => expect(viewText(container)).toContain("Alpha version two."));

    showRichDiff(container, false);

    await waitFor(() => expect(container.querySelector(REVIEW_VIEW_TAG)).toBeNull());
    expect(isRenderedViewActive(container)).toBe(false);
  });

  it("leaves files other than changed Markdown files alone", async () => {
    const code = await appendFileBlock(document, "src/app.ts");
    await start();

    showRichDiff(code, true);
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(code.querySelector(REVIEW_VIEW_TAG)).toBeNull();
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
      initialLayout: "split",
    });
    showRichDiff(container, true);

    expect(started).toEqual(err({ kind: "network" }));
    expect(container.querySelector(REVIEW_VIEW_TAG)).toBeNull();
    expect(document.head.querySelector("style")).toBeNull();
  });

  it("handles file blocks that GitHub renders later", async () => {
    await start();

    const late = await appendFileBlock(document, "docs/b.md");
    showRichDiff(late, true);

    await waitFor(() => expect(viewText(late)).toContain("Bravo changed."));
  });

  describe("going back to GitHub's own rich diff", () => {
    function hostViewButton(container: Element): HTMLButtonElement {
      const button = Array.from(viewRoot(container)?.querySelectorAll("button") ?? []).find(
        (candidate) => candidate.textContent === "GitHub の表示に戻す",
      );
      if (!button) throw new Error("no button back to GitHub's view");
      return button;
    }

    const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

    it("shows GitHub's rich diff for the file once asked, leaving other files as they are", async () => {
      const a = await appendFileBlock(document, "docs/a.md");
      const b = await appendFileBlock(document, "docs/b.md");
      await start();
      showRichDiff(a, true);
      showRichDiff(b, true);
      await waitFor(() => expect(viewText(a)).toContain("Alpha version two."));
      await waitFor(() => expect(viewText(b)).toContain("Bravo changed."));

      hostViewButton(a).click();

      await waitFor(() => expect(a.querySelector(REVIEW_VIEW_TAG)).toBeNull());
      expect(isRenderedViewActive(a)).toBe(false);
      expect(isRenderedViewActive(b)).toBe(true);
    });

    it("keeps GitHub's rich diff while GitHub re-renders the file", async () => {
      const container = await appendFileBlock(document, "docs/a.md");
      await start();
      showRichDiff(container, true);
      await waitFor(() => expect(viewText(container)).toContain("Alpha version two."));
      hostViewButton(container).click();
      await waitFor(() => expect(container.querySelector(REVIEW_VIEW_TAG)).toBeNull());

      container.append(document.createElement("div"));
      await settle();

      expect(container.querySelector(REVIEW_VIEW_TAG)).toBeNull();
    });

    it("shows Mihiraki's view again once the file goes through the source diff", async () => {
      const container = await appendFileBlock(document, "docs/a.md");
      await start();
      showRichDiff(container, true);
      await waitFor(() => expect(viewText(container)).toContain("Alpha version two."));
      hostViewButton(container).click();
      await waitFor(() => expect(container.querySelector(REVIEW_VIEW_TAG)).toBeNull());

      showRichDiff(container, false);
      await settle();
      showRichDiff(container, true);

      await waitFor(() => expect(viewText(container)).toContain("Alpha version two."));
      expect(isRenderedViewActive(container)).toBe(true);
    });
  });

  it("removes every trace when stopped", async () => {
    const container = await appendFileBlock(document, "docs/a.md");
    await start();
    showRichDiff(container, true);
    await waitFor(() => expect(viewText(container)).toContain("Alpha version two."));

    stop?.();
    stop = null;

    expect(container.querySelector(REVIEW_VIEW_TAG)).toBeNull();
    expect(isRenderedViewActive(container)).toBe(false);
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
          isByChangeAuthor: false,
          bodyMarkdown: "",
          reactions: [],
          newIssueUrl: null,
        },
      ],
    };

    function fakeHostSync(isAvailable: boolean) {
      let notify: (() => void) | null = null;
      let notifyLost: (() => void) | null = null;
      let notifyLayout: ((layout: DiffLayout) => void) | null = null;
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
        watchDiffLayout: (listener) => {
          notifyLayout = listener;
          return () => {
            notifyLayout = null;
          };
        },
      };
      return {
        client,
        changeHostThreads: () => notify?.(),
        loseSync: () => notifyLost?.(),
        changeLayout: (layout: DiffLayout) => notifyLayout?.(layout),
      };
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
        initialLayout: "split",
      });
      if (!started.ok) throw new Error(`Unexpected failure: ${started.error.kind}`);
      stop = started.value;
      showRichDiff(container, true);
      await waitFor(() => expect(viewText(container)).toContain("Alpha version two."));
      return container;
    }

    it("leaves out the reload notice because GitHub counts the pending comments itself", async () => {
      const container = await startWith(fakeHostSync(true).client, backendWithPendingReview());

      expect(viewText(container)).not.toContain("Submit review");
    });

    it("keeps the reload notice when GitHub stores cannot be reached", async () => {
      const container = await startWith(fakeHostSync(false).client, backendWithPendingReview());

      await waitFor(() => expect(viewText(container)).toContain("Submit review"));
    });

    it("shows the reload notice once a comment could not be shown in GitHub own UI", async () => {
      const host = fakeHostSync(true);
      const container = await startWith(host.client, backendWithPendingReview());

      host.loseSync();

      await waitFor(() => expect(viewText(container)).toContain("Submit review"));
      expect(viewText(container)).toContain("Alpha version two.");
    });

    it("follows GitHub's layout setting when it changes", async () => {
      const host = fakeHostSync(true);
      const container = await startWith(host.client, backendWithPendingReview());

      host.changeLayout("unified");

      await waitFor(() => expect(viewRoot(container)?.querySelector(".mhr-unified")).toBeTruthy());
      // One column shows both versions of the changed words in place.
      expect(viewRoot(container)?.querySelector("del.mhr-del")?.textContent).toBe("one");
      expect(viewRoot(container)?.querySelector("ins.mhr-ins")?.textContent).toBe("two");
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
