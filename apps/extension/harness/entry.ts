/**
 * Runs the inline review outside the extension, for checking it against the live
 * github.com DOM from Playwright (see harness/README.md).
 */
import cssText from '../entrypoints/github.content/style.css?inline';
import { createGitHubBackend } from '../src/github/github-backend';
import { parsePullRequestLocation } from '../src/github/pr-location';
import { inheritHostThemeColors } from '../src/inline/host-theme';
import { startInlineReview } from '../src/inline/inline-review';

declare global {
  interface Window {
    betterGhMd?: Promise<() => void>;
  }
}

const pr = parsePullRequestLocation(window.location.href);
if (pr) {
  window.betterGhMd = startInlineReview({ document, backend: createGitHubBackend(pr), cssText: inheritHostThemeColors(cssText) });
}
