/**
 * Runs in the page's main world, where GitHub's React stores are reachable, and serves
 * requests from the extension's isolated world (see client.ts).
 */
import { asRecord, asString } from "../github/json";
import {
  findReviewStores,
  type ReviewStores,
  readDiffLayout,
  registerCreatedThread,
  watchDiffLayout,
  watchReviewThreads,
} from "./github-stores";
import {
  HOST_SYNC_EVENTS,
  parseJson,
  type ThreadRegistration,
  toThreadRegistration,
} from "./protocol";

export interface HostBridgeOptions {
  readonly findStores?: (document: Document) => ReviewStores | null;
  readonly register?: (stores: ReviewStores, registration: ThreadRegistration) => boolean;
}

export function installHostBridge(document: Document, options: HostBridgeOptions = {}): () => void {
  const { findStores = findReviewStores, register = registerCreatedThread } = options;
  let watched: { readonly stores: ReviewStores; readonly stop: () => void } | null = null;

  const reply = (type: string, payload: Record<string, unknown>) =>
    document.dispatchEvent(new CustomEvent(type, { detail: JSON.stringify(payload) }));

  /** Starts forwarding changes made to GitHub's threads and diff layout. */
  const watch = (stores: ReviewStores) => {
    const stopThreads = watchReviewThreads(stores, () =>
      reply(HOST_SYNC_EVENTS.hostThreadsChanged, {}),
    );
    const stopLayout = watchDiffLayout(stores, (layout) =>
      reply(HOST_SYNC_EVENTS.diffLayout, { layout }),
    );
    return () => {
      stopThreads();
      stopLayout();
    };
  };

  /** Stores are looked up per request: GitHub replaces them on client-side navigation. */
  const currentStores = () => {
    const stores = findStores(document);
    const isWatched =
      watched?.stores.layout === stores?.layout && watched?.stores.page === stores?.page;
    if (stores && !isWatched) {
      watched?.stop();
      watched = { stores, stop: watch(stores) };
    }
    return stores;
  };

  const onPing = () => reply(HOST_SYNC_EVENTS.pong, { isAvailable: currentStores() !== null });

  const onDiffLayoutRequest = () => {
    const stores = currentStores();
    const layout = stores ? readDiffLayout(stores) : null;
    if (layout) reply(HOST_SYNC_EVENTS.diffLayout, { layout });
  };

  const onThreadCreated = (event: Event) => {
    const detail = asRecord(parseJson((event as CustomEvent<unknown>).detail));
    const requestId = asString(detail?.requestId);
    const message = toThreadRegistration(detail?.message);
    if (!requestId || !message) return;
    const stores = currentStores();
    reply(HOST_SYNC_EVENTS.threadRegistered, {
      requestId,
      isRegistered: stores !== null && register(stores, message),
    });
  };

  document.addEventListener(HOST_SYNC_EVENTS.ping, onPing);
  document.addEventListener(HOST_SYNC_EVENTS.threadCreated, onThreadCreated);
  document.addEventListener(HOST_SYNC_EVENTS.diffLayoutRequest, onDiffLayoutRequest);
  return () => {
    document.removeEventListener(HOST_SYNC_EVENTS.ping, onPing);
    document.removeEventListener(HOST_SYNC_EVENTS.threadCreated, onThreadCreated);
    document.removeEventListener(HOST_SYNC_EVENTS.diffLayoutRequest, onDiffLayoutRequest);
    watched?.stop();
  };
}
