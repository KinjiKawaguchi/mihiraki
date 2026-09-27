declare module "markdown-it-task-lists" {
  import type { MarkdownIt } from "markdown-it";

  const taskLists: (
    md: MarkdownIt,
    options?: { enabled?: boolean; label?: boolean; labelAfter?: boolean },
  ) => void;
  export default taskLists;
}

declare module "markdown-it-emoji" {
  import type { MarkdownIt } from "markdown-it";
  export const full: (md: MarkdownIt) => void;
}
