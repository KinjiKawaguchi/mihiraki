/**
 * Runs the inline review outside the extension, for checking it against the live
 * github.com DOM from Playwright (see harness/README.md).
 */
import type { HostError, Result } from "@mihiraki/core";
import { resolveLocale } from "@mihiraki/ui";
import cssText from "../entrypoints/github.content/style.css?inline";
import { createGitHubBackend } from "../src/github/github-backend";
import { parsePullRequestLocation } from "../src/github/pr-location";
import { installHostBridge } from "../src/host-sync/bridge";
import { createHostSyncClient } from "../src/host-sync/client";
import { inheritHostThemeColors } from "../src/inline/host-theme";
import { startInlineReview } from "../src/inline/inline-review";

declare global {
  interface Window {
    mihiraki?: Promise<Result<() => void, HostError>>;
  }
}

const pr = parsePullRequestLocation(window.location.href);
if (pr) {
  // The harness runs entirely in the main world, so the bridge lives in the same bundle.
  installHostBridge(document);
  const hostSync = createHostSyncClient(document);
  const backend = createGitHubBackend(pr, undefined, {
    onThreadCreated: (created) => hostSync.announceThreadCreated(created),
  });
  window.mihiraki = startInlineReview({
    document,
    backend,
    cssText: inheritHostThemeColors(cssText),
    hostSync,
    locale: resolveLocale(navigator.languages),
  });
}
