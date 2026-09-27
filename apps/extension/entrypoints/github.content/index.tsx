import { createGitHubBackend } from "../../src/github/github-backend";
import { isFilesTab, parsePullRequestLocation } from "../../src/github/pr-location";
import { createHostSyncClient } from "../../src/host-sync/client";
import { inheritHostThemeColors } from "../../src/inline/host-theme";
import { startInlineReview } from "../../src/inline/inline-review";
import cssText from "./style.css?inline";

interface Session {
  readonly pullRequestKey: string;
  readonly stopped: Promise<() => void>;
}

function pullRequestKeyOf(href: string): string | null {
  const pr = isFilesTab(href) ? parsePullRequestLocation(href) : null;
  return pr ? `${pr.owner}/${pr.repo}#${pr.number}` : null;
}

function startSession(href: string, pullRequestKey: string): Session | null {
  const pr = parsePullRequestLocation(href);
  if (!pr) return null;
  const hostSync = createHostSyncClient(document);
  const backend = createGitHubBackend(pr, undefined, {
    onThreadCreated: (created) => hostSync.announceThreadCreated(created),
  });
  const stopped = startInlineReview({
    document,
    backend,
    cssText: inheritHostThemeColors(cssText),
    hostSync,
  }).catch((error: unknown) => {
    console.warn("[mihiraki] 分割表示を準備できませんでした:", error);
    return () => undefined;
  });
  return { pullRequestKey, stopped };
}

function endSession(session: Session | null): void {
  void session?.stopped.then((stop) => stop());
}

export default defineContentScript({
  // GitHub navigates between tabs without full page loads, so the script runs on
  // every page and starts or stops itself whenever the URL changes.
  matches: ["https://github.com/*"],
  cssInjectionMode: "manual",

  main(ctx) {
    let session: Session | null = null;

    const sync = () => {
      const href = window.location.href;
      const pullRequestKey = pullRequestKeyOf(href);
      if (session?.pullRequestKey === pullRequestKey) return;
      endSession(session);
      session = pullRequestKey ? startSession(href, pullRequestKey) : null;
    };

    sync();
    ctx.addEventListener(window, "wxt:locationchange", sync);
    ctx.onInvalidated(() => endSession(session));
  },
});
