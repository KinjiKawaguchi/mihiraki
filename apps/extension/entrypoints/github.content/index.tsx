import type { HostError, Result } from "@mihiraki/core";
import { resolveLocale } from "@mihiraki/ui";
import { createGitHubBackend } from "../../src/github/github-backend";
import {
  isFilesTab,
  type PullRequestLocation,
  parsePullRequestLocation,
} from "../../src/github/pr-location";
import { createHostSyncClient } from "../../src/host-sync/client";
import { inheritHostThemeColors } from "../../src/inline/host-theme";
import { startInlineReview } from "../../src/inline/inline-review";
import { createSessionManager } from "../../src/session/session-manager";
import cssText from "./style.css?inline";

function keyOf(pr: PullRequestLocation): string {
  return `${pr.owner}/${pr.repo}#${pr.number}`;
}

function startReview(pr: PullRequestLocation): Promise<Result<() => void, HostError>> {
  const hostSync = createHostSyncClient(document);
  const backend = createGitHubBackend(pr, undefined, {
    onThreadCreated: (created) => hostSync.announceThreadCreated(created),
  });
  return startInlineReview({
    document,
    backend,
    cssText: inheritHostThemeColors(cssText),
    hostSync,
    locale: resolveLocale(navigator.languages),
  });
}

export default defineContentScript({
  // GitHub navigates between tabs without full page loads, so the script runs on
  // every page and starts or stops itself whenever the URL changes.
  matches: ["https://github.com/*"],
  cssInjectionMode: "manual",

  main(ctx) {
    const pullRequests = new Map<string, PullRequestLocation>();
    const sessions = createSessionManager({
      start: (key) => {
        const pr = pullRequests.get(key);
        return pr ? startReview(pr) : Promise.reject(new Error(`Unknown pull request: ${key}`));
      },
      onGiveUp: (error) => console.warn("[mihiraki] Could not start the split view:", error),
    });

    const sync = () => {
      const href = window.location.href;
      const pr = isFilesTab(href) ? parsePullRequestLocation(href) : null;
      if (pr) pullRequests.set(keyOf(pr), pr);
      sessions.sync(pr ? keyOf(pr) : null);
    };

    sync();
    ctx.addEventListener(window, "wxt:locationchange", sync);
    ctx.onInvalidated(() => sessions.stop());
  },
});
