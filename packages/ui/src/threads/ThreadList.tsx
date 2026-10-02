import type { ReviewThread } from "@mihiraki/core";
import { useMessages } from "../i18n/i18n";
import { ThreadView } from "./ThreadView";

/** Threads that no rendered block can hold, e.g. base-side threads of an added file. */
export function UnplacedThreads({ threads }: { readonly threads: readonly ReviewThread[] }) {
  const t = useMessages();
  if (threads.length === 0) return null;
  return (
    <section class="mhr-unplaced" aria-label={t.unplacedThreads}>
      <p class="mhr-unplaced__title">{t.unplacedThreads}</p>
      <ThreadList threads={threads} />
    </section>
  );
}

export function ThreadList({ threads }: { readonly threads: readonly ReviewThread[] }) {
  if (threads.length === 0) return null;
  return (
    <div class="mhr-threads">
      {threads.map((thread) => (
        <ThreadView key={thread.id} thread={thread} />
      ))}
    </div>
  );
}
