/**
 * Runs in the page's main world, where GitHub's React stores are reachable, and serves
 * requests from the extension's isolated world (see client.ts).
 */
import { asRecord, asString } from "../github/json";
import {
  findReviewStores,
  type ReviewStores,
  registerCreatedThread,
  watchReviewThreads,
} from "./github-stores";
import {
  HOST_SYNC_EVENTS,
  parseJson,
  type ThreadCreatedMessage,
  toThreadCreatedMessage,
} from "./protocol";

export interface HostBridgeOptions {
  readonly findStores?: (document: Document) => ReviewStores | null;
  readonly register?: (stores: ReviewStores, message: ThreadCreatedMessage) => boolean;
}

export function installHostBridge(document: Document, options: HostBridgeOptions = {}): () => void {
  const { findStores = findReviewStores, register = registerCreatedThread } = options;
  let watched: { readonly layout: ReviewStores["layout"]; readonly stop: () => void } | null = null;

  const reply = (type: string, payload: Record<string, unknown>) =>
    document.dispatchEvent(new CustomEvent(type, { detail: JSON.stringify(payload) }));

  /** Stores are looked up per request: GitHub replaces them on client-side navigation. */
  const currentStores = () => {
    const stores = findStores(document);
    if (stores && watched?.layout !== stores.layout) {
      watched?.stop();
      watched = {
        layout: stores.layout,
        stop: watchReviewThreads(stores, () => reply(HOST_SYNC_EVENTS.hostThreadsChanged, {})),
      };
    }
    return stores;
  };

  const onPing = () => reply(HOST_SYNC_EVENTS.pong, { isAvailable: currentStores() !== null });

  const onThreadCreated = (event: Event) => {
    const detail = asRecord(parseJson((event as CustomEvent<unknown>).detail));
    const requestId = asString(detail?.requestId);
    const message = toThreadCreatedMessage(detail?.message);
    if (!requestId || !message) return;
    const stores = currentStores();
    reply(HOST_SYNC_EVENTS.threadRegistered, {
      requestId,
      isRegistered: stores !== null && register(stores, message),
    });
  };

  document.addEventListener(HOST_SYNC_EVENTS.ping, onPing);
  document.addEventListener(HOST_SYNC_EVENTS.threadCreated, onThreadCreated);
  return () => {
    document.removeEventListener(HOST_SYNC_EVENTS.ping, onPing);
    document.removeEventListener(HOST_SYNC_EVENTS.threadCreated, onThreadCreated);
    watched?.stop();
  };
}
