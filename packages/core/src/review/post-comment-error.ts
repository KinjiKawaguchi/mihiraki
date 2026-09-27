import type { HostError } from "./host-error";

/** Foreseeable reasons a comment could not be posted; the UI words them for the reviewer. */
export type PostCommentError =
  | HostError
  /** A single comment was requested while a review is pending (see availableCommentModes). */
  | { readonly kind: "pendingReviewConflict" }
  /** The host could not place the lines, usually because the change moved on meanwhile. */
  | { readonly kind: "lineNotResolved" };
