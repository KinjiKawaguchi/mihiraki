import type { HostError } from "./host-error";

/** Foreseeable reasons a comment could not be edited; the UI words them for the reviewer. */
export type EditCommentError =
  | HostError
  /** The comment changed since the version the edit started from (edited elsewhere). */
  | { readonly kind: "editConflict" };
