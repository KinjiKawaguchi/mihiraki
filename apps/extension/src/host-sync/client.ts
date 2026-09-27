/**
 * The extension side (isolated world) of host sync. Every request resolves to false when
 * the bridge does not answer in time, so callers can fall back to a plain notice.
 */
import { asRecord } from '../github/json';
import { HOST_SYNC_EVENTS, parseJson, type ThreadCreatedMessage } from './protocol';

export interface HostSyncClient {
  isHostAvailable(): Promise<boolean>;
  /** Asks the bridge to show a thread just created through the API in GitHub's own UI. */
  announceThreadCreated(message: ThreadCreatedMessage): Promise<boolean>;
  onHostThreadsChanged(listener: () => void): () => void;
}

interface Exchange {
  readonly send: string;
  readonly receive: string;
  readonly payload: Record<string, unknown>;
  readonly isAnswer: (detail: Readonly<Record<string, unknown>>) => boolean;
  readonly outcome: (detail: Readonly<Record<string, unknown>>) => boolean;
}

const DEFAULT_TIMEOUT_MS = 1000;

export function createHostSyncClient(document: Document, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}): HostSyncClient {
  const exchange = ({ send, receive, payload, isAnswer, outcome }: Exchange) =>
    new Promise<boolean>((resolve) => {
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

  return {
    isHostAvailable: () =>
      exchange({
        send: HOST_SYNC_EVENTS.ping,
        receive: HOST_SYNC_EVENTS.pong,
        payload: {},
        isAnswer: () => true,
        outcome: (detail) => detail['isAvailable'] === true,
      }),
    announceThreadCreated: (message) => {
      const requestId = crypto.randomUUID();
      return exchange({
        send: HOST_SYNC_EVENTS.threadCreated,
        receive: HOST_SYNC_EVENTS.threadRegistered,
        payload: { requestId, message },
        isAnswer: (detail) => detail['requestId'] === requestId,
        outcome: (detail) => detail['isRegistered'] === true,
      });
    },
    onHostThreadsChanged: (listener) => {
      const handler = () => listener();
      document.addEventListener(HOST_SYNC_EVENTS.hostThreadsChanged, handler);
      return () => document.removeEventListener(HOST_SYNC_EVENTS.hostThreadsChanged, handler);
    },
  };
}
