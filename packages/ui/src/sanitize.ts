import DOMPurify from 'dompurify';

/**
 * Markdown under review is written by the PR author and rendered inside github.com,
 * so everything must pass through here before it reaches the DOM.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { FORBID_TAGS: ['style', 'form'], FORBID_ATTR: ['style'] });
}
