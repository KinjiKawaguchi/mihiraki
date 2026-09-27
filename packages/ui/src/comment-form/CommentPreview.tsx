import { renderMarkdown } from "@mihiraki/core";
import { useMemo } from "preact/hooks";
import { sanitizeHtml } from "../sanitize";

export function CommentPreview({ body }: { readonly body: string }) {
  const html = useMemo(() => sanitizeHtml(renderMarkdown(body)), [body]);
  if (body.trim() === "") return <p class="mhr-form__empty">プレビューする内容がありません</p>;
  return <div class="mhr-form__preview markdown-body" dangerouslySetInnerHTML={{ __html: html }} />;
}
