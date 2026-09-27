import { renderMarkdown } from "@mihiraki/core";
import { useMemo } from "preact/hooks";
import { SafeHtml } from "../safe-html/SafeHtml";
import { sanitizeHtml } from "../safe-html/sanitize";

export function CommentPreview({ body }: { readonly body: string }) {
  const html = useMemo(() => sanitizeHtml(renderMarkdown(body)), [body]);
  if (body.trim() === "") return <p class="mhr-form__empty">プレビューする内容がありません</p>;
  return <SafeHtml class="mhr-form__preview markdown-body" html={html} />;
}
