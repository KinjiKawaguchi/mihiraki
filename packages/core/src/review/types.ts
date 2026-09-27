/** GitHub's naming: LEFT is the base (old) file, RIGHT the head (new) file. */
export type Side = 'LEFT' | 'RIGHT';

export interface ReviewComment {
  readonly id: string;
  readonly author: string;
  readonly avatarUrl: string;
  /** Already-rendered comment body. Must still be sanitised before insertion into the DOM. */
  readonly bodyHtml: string;
  readonly createdAt: string;
  readonly url: string;
}

export interface ReviewThread {
  readonly id: string;
  readonly path: string;
  readonly side: Side;
  /** Last line of the commented range. */
  readonly line: number;
  /** First line for multi-line comments, `null` for single-line ones. */
  readonly startLine: number | null;
  readonly isResolved: boolean;
  readonly isOutdated: boolean;
  /** Part of the viewer's review that has not been submitted yet (only the viewer sees it). */
  readonly isPending: boolean;
  readonly comments: readonly ReviewComment[];
}

/**
 * `single` publishes the comment immediately ("Comment" on GitHub); `review` adds it to
 * the viewer's pending review ("Start a review" / "Add review comment").
 */
export type CommentMode = 'single' | 'review';

export interface CommentTarget {
  readonly path: string;
  readonly side: Side;
  readonly line: number;
  readonly startLine: number | null;
}
