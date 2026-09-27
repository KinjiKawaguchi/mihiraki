import type { Ref } from "preact";
import type { SanitizedHtml } from "./sanitize";

interface SafeHtmlProps {
  readonly html: SanitizedHtml;
  readonly class: string;
  readonly elementRef?: Ref<HTMLDivElement>;
}

/**
 * The one place HTML is inserted into the page. Biome rejects `dangerouslySetInnerHTML`
 * anywhere else, and the type only lets sanitised HTML in.
 */
export function SafeHtml({ html, class: className, elementRef }: SafeHtmlProps) {
  // biome-ignore lint/security/noDangerouslySetInnerHtml: `html` can only come from sanitizeHtml
  return <div class={className} ref={elementRef} dangerouslySetInnerHTML={{ __html: html }} />;
}
