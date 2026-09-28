import type { HostError, Result } from "@mihiraki/core";
import {
  isFilesTab,
  type PullRequestLocation,
  parsePullRequestLocation,
} from "../github/pr-location";
import { createSessionManager } from "./session-manager";

/** What following the pages needs from WXT's content script context. */
export interface PageContext {
  addEventListener(
    target: Window,
    type: "wxt:locationchange",
    handler: (event: { readonly newUrl: URL }) => void,
  ): void;
  onInvalidated(callback: () => void): unknown;
}

export interface PullRequestPagesOptions {
  /** URL of the page the script is loaded on. */
  readonly initialUrl: string;
  readonly start: (pr: PullRequestLocation) => Promise<Result<() => void, HostError>>;
  readonly onGiveUp?: (error: unknown) => void;
}

function keyOf(pr: PullRequestLocation): string {
  return `${pr.owner}/${pr.repo}#${pr.number}`;
}

/**
 * Runs the review while the reviewer is on a pull request's Files changed tab. GitHub
 * moves between tabs without full page loads, so this follows in-page navigations.
 */
export function followPullRequestPages(
  ctx: PageContext,
  { initialUrl, start, onGiveUp }: PullRequestPagesOptions,
): void {
  const pullRequests = new Map<string, PullRequestLocation>();
  const sessions = createSessionManager({
    start: (key) => {
      const pr = pullRequests.get(key);
      return pr ? start(pr) : Promise.reject(new Error(`Unknown pull request: ${key}`));
    },
    onGiveUp,
  });

  const show = (href: string) => {
    const pr = isFilesTab(href) ? parsePullRequestLocation(href) : null;
    if (pr) pullRequests.set(keyOf(pr), pr);
    sessions.sync(pr ? keyOf(pr) : null);
  };

  show(initialUrl);
  // WXT reports a navigation as it begins (the Navigation API's `navigate` event), while
  // window.location still shows the page being left, so follow the destination instead.
  ctx.addEventListener(window, "wxt:locationchange", (event) => show(event.newUrl.href));
  ctx.onInvalidated(() => sessions.stop());
}
