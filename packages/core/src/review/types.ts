import type { LineRange } from "../markdown/types";
import type { CommitId } from "./commit-id";

/**
 * The pair of commits a review is looking at. Line numbers only mean something relative
 * to one revision, so versions, threads and comment targets each say which one they use.
 */
export interface Revision {
  readonly base: CommitId;
  readonly head: CommitId;
}

/** Which version of a file: `base` (before the change) or `head` (after it). */
export type Side = "base" | "head";

export type ReactionKind =
  | "thumbsUp"
  | "thumbsDown"
  | "laugh"
  | "hooray"
  | "confused"
  | "heart"
  | "rocket"
  | "eyes";

export interface Reaction {
  readonly kind: ReactionKind;
  readonly count: number;
  /** Whether the viewer is one of those who reacted. */
  readonly isByViewer: boolean;
}

export interface ReviewComment {
  readonly id: string;
  /** Part of the viewer's review that has not been submitted yet (only the viewer sees it). */
  readonly isPending: boolean;
  readonly author: string;
  readonly avatarUrl: string;
  /** Written by the author of the change under review. */
  readonly isByChangeAuthor: boolean;
  /** Already-rendered comment body. Must still be sanitised before insertion into the DOM. */
  readonly bodyHtml: string;
  /** The comment as written, for copying and quoting. */
  readonly bodyMarkdown: string;
  readonly createdAt: string;
  readonly url: string;
  /** Reactions that anyone gave, in the host's order. */
  readonly reactions: readonly Reaction[];
  /** Where to start a new issue quoting this comment; null when the host has none. */
  readonly newIssueUrl: string | null;
}

export interface ReviewThread {
  readonly id: string;
  readonly path: string;
  readonly side: Side;
  /** Commented lines of the `side` version; a single-line comment has `start === end`. */
  readonly lines: LineRange;
  readonly isResolved: boolean;
  readonly isOutdated: boolean;
  /** Whether the viewer may reply in this thread. */
  readonly canReply: boolean;
  readonly comments: readonly ReviewComment[];
}

/**
 * `single` publishes the comment immediately ("Comment" on GitHub); `review` adds it to
 * the viewer's pending review ("Start a review" / "Add review comment").
 */
export type CommentMode = "single" | "review";

export interface CommentTarget {
  readonly path: string;
  readonly side: Side;
  readonly lines: LineRange;
  /** The revision whose text the lines were selected in. */
  readonly revision: Revision;
}
