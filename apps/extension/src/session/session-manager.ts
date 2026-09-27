import type { Result } from "@mihiraki/core";

type Stop = () => void;

export interface SessionManagerOptions {
  /**
   * Starts the review for a key (a pull request): the function that stops it, or why it
   * could not start. A failure is retried; a rejection is a bug and is not.
   */
  readonly start: (key: string) => Promise<Result<Stop, unknown>>;
  /** Delays before each retry of a failed start; its length is the number of retries. */
  readonly retryDelaysMs?: readonly number[];
  readonly schedule?: (callback: () => void, delayMs: number) => () => void;
  /** Called with the last failure once retries run out, or with the bug that broke a start. */
  readonly onGiveUp?: (error: unknown) => void;
}

interface Session {
  readonly key: string;
  isActive: boolean;
  stops: readonly Promise<Stop>[];
  cancelRetry: () => void;
}

const DEFAULT_RETRY_DELAYS_MS = [2_000, 10_000, 30_000];
const noop = () => undefined;

function scheduleWithTimer(callback: () => void, delayMs: number): () => void {
  const timer = setTimeout(callback, delayMs);
  return () => clearTimeout(timer);
}

/**
 * Keeps exactly one review session for the pull request being viewed: starts it when
 * the reviewer arrives, stops it when they leave, and retries a start that failed
 * (e.g. a transient network error) while they stay.
 */
export function createSessionManager({
  start,
  retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
  schedule = scheduleWithTimer,
  onGiveUp = noop,
}: SessionManagerOptions) {
  let current: Session | null = null;

  const retryOrGiveUp = (session: Session, attempt: number, error: unknown): void => {
    if (!session.isActive) return;
    const delayMs = retryDelaysMs[attempt];
    if (delayMs === undefined) {
      onGiveUp(error);
      return;
    }
    session.cancelRetry = schedule(() => {
      if (session.isActive) launch(session, attempt + 1);
    }, delayMs);
  };

  const launch = (session: Session, attempt: number): void => {
    const started = start(session.key).then(
      (result) => {
        if (result.ok) return result.value;
        retryOrGiveUp(session, attempt, result.error);
        return noop;
      },
      (bug: unknown) => {
        if (session.isActive) onGiveUp(bug);
        return noop;
      },
    );
    session.stops = [...session.stops, started];
  };

  const end = (session: Session): void => {
    session.isActive = false;
    session.cancelRetry();
    for (const stopped of session.stops) void stopped.then((stop) => stop());
  };

  return {
    sync: (key: string | null): void => {
      if ((current?.key ?? null) === key) return;
      if (current) end(current);
      current = key ? { key, isActive: true, stops: [], cancelRetry: noop } : null;
      if (current) launch(current, 0);
    },
    stop: (): void => {
      if (current) end(current);
      current = null;
    },
  };
}
