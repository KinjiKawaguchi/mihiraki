import { installHostBridge } from "../src/host-sync/bridge";

/**
 * Runs in the page's main world so it can reach GitHub's React stores, which the
 * isolated content script cannot see. Talks to it through DOM events only.
 */
export default defineContentScript({
  matches: ["https://github.com/*"],
  world: "MAIN",
  main() {
    installHostBridge(document);
  },
});
