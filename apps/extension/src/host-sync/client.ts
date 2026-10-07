/**
 * The extension side (isolated world) of host sync. Every request resolves to false when
 * the bridge does not answer in time, so callers can fall back to a plain notice.
 */
import type { DiffLayout } from "@mihiraki/ui";
import { parseDiffLayout } from "../github/diff-layout";
import { asRecord } from "../github/json";
import { HOST_SYNC_EVENTS, type HostChange, parseJson } from "./protocol";

export interface HostSyncClient {
  isHostAvailable(): Promise<boolean>;
  /** Asks the bridge to show a change just made through GitHub's endpoints in GitHub's own UI. */
  announceChange(change: HostChange): Promise<boolean>;
  onHostThreadsChanged(listener: () => void): () => void;
  /** Called when a change could not be shown in GitHub's own UI, which then stays stale. */
  onSyncLost(listener: () => void): () => void;
  /** Reports GitHub's split / unified setting once the bridge answers, then on every change. */
  watchDiffLayout(listener: (layout: DiffLayout) => void): () => void;
}

interface Exchange {
  readonly send: string;
  readonly receive: string;
  readonly payload: Record<string, unknown>;
  readonly isAnswer: (detail: Readonly<Record<string, unknown>>) => boolean;
  readonly outcome: (detail: Readonly<Record<string, unknown>>) => boolean;
}

const DEFAULT_TIMEOUT_MS = 1000;

/** Sends one request to the bridge; false when it does not answer within `timeoutMs`. */
function exchangeWithBridge(
  document: Document,
  timeoutMs: number,
  { send, receive, payload, isAnswer, outcome }: Exchange,
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const finish = (result: boolean) => {
      clearTimeout(timer);
      document.removeEventListener(receive, onAnswer);
      resolve(result);
    };
    const onAnswer = (event: Event) => {
      const detail = asRecord(parseJson((event as CustomEvent<unknown>).detail));
      if (detail && isAnswer(detail)) finish(outcome(detail));
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    document.addEventListener(receive, onAnswer);
    document.dispatchEvent(new CustomEvent(send, { detail: JSON.stringify(payload) }));
  });
}

export function createHostSyncClient(
  document: Document,
  { timeoutMs = DEFAULT_TIMEOUT_MS } = {},
): HostSyncClient {
  const exchange = (request: Exchange) => exchangeWithBridge(document, timeoutMs, request);
  let syncLostListeners: readonly (() => void)[] = [];

  return {
    isHostAvailable: () =>
      exchange({
        send: HOST_SYNC_EVENTS.ping,
        receive: HOST_SYNC_EVENTS.pong,
        payload: {},
        isAnswer: () => true,
        outcome: (detail) => detail.isAvailable === true,
      }),
    announceChange: async (change) => {
      const requestId = crypto.randomUUID();
      const isApplied = await exchange({
        send: HOST_SYNC_EVENTS.change,
        receive: HOST_SYNC_EVENTS.changeApplied,
        payload: { requestId, change },
        isAnswer: (detail) => detail.requestId === requestId,
        outcome: (detail) => detail.isApplied === true,
      });
      if (!isApplied) for (const listener of syncLostListeners) listener();
      return isApplied;
    },
    onSyncLost: (listener) => {
      syncLostListeners = [...syncLostListeners, listener];
      return () => {
        syncLostListeners = syncLostListeners.filter((existing) => existing !== listener);
      };
    },
    watchDiffLayout: (listener) => {
      const handler = (event: Event) => {
        const detail = asRecord(parseJson((event as CustomEvent<unknown>).detail));
        const layout = parseDiffLayout(detail?.layout);
        if (layout) listener(layout);
      };
      document.addEventListener(HOST_SYNC_EVENTS.diffLayout, handler);
      document.dispatchEvent(new CustomEvent(HOST_SYNC_EVENTS.diffLayoutRequest, { detail: "{}" }));
      return () => document.removeEventListener(HOST_SYNC_EVENTS.diffLayout, handler);
    },
    onHostThreadsChanged: (listener) => {
      const handler = () => listener();
      document.addEventListener(HOST_SYNC_EVENTS.hostThreadsChanged, handler);
      return () => document.removeEventListener(HOST_SYNC_EVENTS.hostThreadsChanged, handler);
    },
  };
}
