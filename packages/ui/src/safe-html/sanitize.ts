import DOMPurify from "dompurify";

declare const sanitizedHtmlBrand: unique symbol;

/** HTML that went through `sanitizeHtml`; the only kind `SafeHtml` inserts into the page. */
export type SanitizedHtml = string & { readonly [sanitizedHtmlBrand]: true };

/**
 * Markdown under review is written by the PR author and rendered inside github.com,
 * so everything must pass through here before it reaches the DOM.
 */
export function sanitizeHtml(html: string): SanitizedHtml {
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ["style", "form"],
    FORBID_ATTR: ["style"],
  }) as SanitizedHtml;
}
