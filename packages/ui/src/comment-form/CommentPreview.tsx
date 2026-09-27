import { renderMarkdown } from "@mihiraki/core";
import { useMemo } from "preact/hooks";
import { useMessages } from "../i18n/i18n";
import { SafeHtml } from "../safe-html/SafeHtml";
import { sanitizeHtml } from "../safe-html/sanitize";

export function CommentPreview({ body }: { readonly body: string }) {
  const t = useMessages();
  const html = useMemo(() => sanitizeHtml(renderMarkdown(body)), [body]);
  if (body.trim() === "") return <p class="mhr-form__empty">{t.nothingToPreview}</p>;
  return <SafeHtml class="mhr-form__preview markdown-body" html={html} />;
}
