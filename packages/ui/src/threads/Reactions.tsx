import type { Reaction, ReactionKind } from "@mihiraki/core";

const EMOJI: Readonly<Record<ReactionKind, string>> = {
  thumbsUp: "👍",
  thumbsDown: "👎",
  laugh: "😄",
  hooray: "🎉",
  confused: "😕",
  heart: "❤️",
  rocket: "🚀",
  eyes: "👀",
};

/** Reactions with their counts, the viewer's own marked. Shown only; not changed from here. */
export function Reactions({ reactions }: { readonly reactions: readonly Reaction[] }) {
  if (reactions.length === 0) return null;
  return (
    <ul class="mhr-reactions">
      {reactions.map((reaction) => (
        <li
          key={reaction.kind}
          class={`mhr-reaction${reaction.isByViewer ? " mhr-reaction--mine" : ""}`}
        >
          <span aria-hidden="true">{EMOJI[reaction.kind]}</span>
          <span>{reaction.count}</span>
        </li>
      ))}
    </ul>
  );
}
