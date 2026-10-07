import type { ReactionKind } from "@mihiraki/core";

/** The reactions GitHub offers, in the order of its picker. */
export const REACTION_EMOJI: Readonly<Record<ReactionKind, string>> = {
  thumbsUp: "👍",
  thumbsDown: "👎",
  laugh: "😄",
  hooray: "🎉",
  confused: "😕",
  heart: "❤️",
  rocket: "🚀",
  eyes: "👀",
};
