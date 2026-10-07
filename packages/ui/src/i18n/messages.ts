import type { FileChangeType, ReactionKind, Side } from "@mihiraki/core";
import type { Locale } from "./locale";

/** Every text the UI shows. Each language provides all of them, so none can be missed. */
export interface Messages {
  readonly locale: Locale;
  readonly sideLabel: Readonly<Record<Side, string>>;
  readonly addComment: string;
  readonly addCommentHint: string;
  /** Title of the comment form, e.g. for "R3" or "R3〜R5". */
  readonly commentOn: (lines: string) => string;
  readonly singleComment: string;
  readonly startReview: string;
  readonly addToReview: string;
  readonly write: string;
  readonly preview: string;
  readonly nothingToPreview: string;
  /** The empty comment box, naming what ⌘/Ctrl+Enter does (e.g. "Start a review"). */
  readonly bodyPlaceholder: (shortcutAction: string) => string;
  readonly cancel: string;
  readonly loading: string;
  readonly staleRevision: string;
  readonly loadLatest: string;
  readonly couldNotLoadFile: (path: string) => string;
  readonly couldNotLoadFiles: string;
  readonly couldNotLoadComments: string;
  readonly couldNotPostComment: string;
  readonly pendingReviewConflict: string;
  readonly lineNotResolved: string;
  readonly timeout: string;
  readonly network: string;
  readonly unexpectedResponse: string;
  /** "<what failed>" followed by why, as one or two sentences. */
  readonly failure: (what: string, why: string | null) => string;
  /** "<what failed>" with the host's own explanation. */
  readonly failureWithDetail: (what: string, detail: string) => string;
  readonly noMarkdownChanges: string;
  readonly appTitle: string;
  readonly close: string;
  readonly markdownFiles: string;
  readonly changeType: Readonly<Record<FileChangeType, string>>;
  readonly pending: string;
  readonly resolved: string;
  readonly outdated: string;
  readonly openOnGitHub: string;
  readonly authorBadge: string;
  readonly moreActions: string;
  readonly copyLink: string;
  readonly copyMarkdown: string;
  readonly referenceInNewIssue: string;
  readonly commentCount: (count: number) => string;
  readonly unplacedThreads: string;
  /** Stands in for an image that would load from another site, naming that site. */
  readonly showExternalImage: (host: string) => string;
  readonly reply: string;
  readonly resolveConversation: string;
  readonly unresolveConversation: string;
  readonly couldNotResolve: string;
  readonly couldNotUnresolve: string;
  readonly quoteReply: string;
  readonly editComment: string;
  readonly deleteComment: string;
  readonly updateComment: string;
  readonly confirmDeleteComment: string;
  /** The button that carries out a confirmed deletion. */
  readonly confirmDelete: string;
  readonly couldNotEditComment: string;
  readonly editConflict: string;
  readonly couldNotDeleteComment: string;
  readonly addReaction: string;
  readonly reactionName: Readonly<Record<ReactionKind, string>>;
  /** A reaction's button, e.g. "Heart 2". */
  readonly reactionLabel: (name: string, count: number) => string;
  readonly couldNotReact: string;
}
