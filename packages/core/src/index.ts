export type { AlignedRow, RowKind } from "./diff/align";
export { alignBlocks } from "./diff/align";
export { diffBlockHtml } from "./diff/inline-diff";
export type { RowThreads, SplitCell, SplitRow } from "./document/split-document";
export { buildSplitRows, groupThreadsByRow } from "./document/split-document";
export { parseBlocks } from "./markdown/blocks";
export { renderMarkdown } from "./markdown/render";
export type { BlockKind, LineRange, SourceBlock } from "./markdown/types";
export type {
  ChangedFile,
  FileChangeType,
  FileVersions,
  ReviewBackend,
  ThreadSnapshot,
} from "./review/backend";
export { toCommentTarget } from "./review/comment-target";
export {
  createMemoryBackend,
  type MemoryBackendOptions,
  type MemoryFile,
} from "./review/memory-backend";
export { isSameRevision } from "./review/revision";
export type {
  CommentMode,
  CommentTarget,
  ReviewComment,
  ReviewThread,
  Revision,
  Side,
} from "./review/types";
