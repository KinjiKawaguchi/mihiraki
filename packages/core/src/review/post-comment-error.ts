/** Foreseeable reasons a comment could not be posted; the UI words them for the reviewer. */
export type PostCommentError =
  /** A single comment was requested while a review is pending (see availableCommentModes). */
  | { readonly kind: "pendingReviewConflict" }
  /** The host could not place the lines, usually because the change moved on meanwhile. */
  | { readonly kind: "lineNotResolved" }
  /** The host refused the comment; `detail` is its own explanation, possibly empty. */
  | { readonly kind: "rejected"; readonly detail: string }
  | { readonly kind: "timeout" }
  | { readonly kind: "network" }
  /** The host answered with something that could not be understood. */
  | { readonly kind: "unexpectedResponse" };
