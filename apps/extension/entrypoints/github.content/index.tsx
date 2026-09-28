import type { HostError, Result } from "@mihiraki/core";
import { resolveLocale } from "@mihiraki/ui";
import { createGitHubBackend } from "../../src/github/github-backend";
import type { PullRequestLocation } from "../../src/github/pr-location";
import { createHostSyncClient } from "../../src/host-sync/client";
import { inheritHostThemeColors } from "../../src/inline/host-theme";
import { startInlineReview } from "../../src/inline/inline-review";
import { followPullRequestPages } from "../../src/session/pull-request-pages";
import cssText from "./style.css?inline";

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
    followPullRequestPages(ctx, {
      initialUrl: window.location.href,
      start: startReview,
      onGiveUp: (error) => console.warn("[mihiraki] Could not start the split view:", error),
    });
  },
});
