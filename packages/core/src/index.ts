export type { AlignedRow, RowKind } from "./diff/align";
export { alignBlocks } from "./diff/align";
export { diffBlockHtml, mergeBlockHtml } from "./diff/inline-diff";
export type { RowThreads, SplitCell, SplitRow, ThreadPlacement } from "./document/split-document";
export { buildSplitRows, placeThreads } from "./document/split-document";
export { type UnifiedCell, unifiedCell } from "./document/unified-cell";
export { parseBlocks } from "./markdown/blocks";
export { parseLineRange } from "./markdown/line-range";
export { renderMarkdown } from "./markdown/render";
export type { BlockKind, LineRange, SourceBlock } from "./markdown/types";
export { err, mapResult, ok, type Result } from "./result";
export type {
  ChangedFile,
  FileChangeType,
  FileVersions,
  ReviewBackend,
  ThreadSnapshot,
} from "./review/backend";
export { basePathOf, headPathOf } from "./review/changed-file";
export { availableCommentModes } from "./review/comment-modes";
export { type CommitId, commitId, parseCommitId } from "./review/commit-id";
export type { HostError } from "./review/host-error";
export type { PostCommentError } from "./review/post-comment-error";
export { isSameRevision } from "./review/revision";
export type {
  CommentMode,
  CommentTarget,
  ReviewComment,
  ReviewThread,
  Revision,
  Side,
} from "./review/types";
