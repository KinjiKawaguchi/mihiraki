import type { ReviewBackend } from "@mihiraki/core";

/** Posts a comment; expected failures come back as values, as from ReviewBackend. */
export type SubmitComment = ReviewBackend["postComment"];
