import type { LineRange } from '@better-gh-md/core';
import { useMemo, useRef, useState } from 'preact/hooks';
import { sanitizeHtml } from '../sanitize';

interface HoveredElement {
  readonly lines: LineRange;
  readonly top: number;
}

interface RenderedBlockProps {
  readonly html: string;
  /** Only the most recently hovered block shows its button, since mouseleave is not guaranteed. */
  readonly isActive: boolean;
  readonly onActivate: () => void;
  readonly onRequestComment: (lines: LineRange) => void;
}

function readLines(element: Element): LineRange | null {
  const start = Number(element.getAttribute('data-line-start'));
  const end = Number(element.getAttribute('data-line-end'));
  return Number.isInteger(start) && start > 0 ? { start, end: Math.max(start, end) } : null;
}

/** Sanitised rendered Markdown with a "+" button on whichever source-mapped element is hovered. */
export function RenderedBlock({ html, isActive, onActivate, onRequestComment }: RenderedBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<HoveredElement | null>(null);
  const safeHtml = useMemo(() => sanitizeHtml(html), [html]);

  const handleMouseOver = (event: MouseEvent) => {
    const container = containerRef.current;
    const element = (event.target as Element | null)?.closest('[data-line-start]');
    if (!container || !element || !container.contains(element)) return;
    const lines = readLines(element);
    if (!lines) return;
    const top = element.getBoundingClientRect().top - container.getBoundingClientRect().top;
    setHovered({ lines, top });
    onActivate();
  };

  return (
    <div class="bgm-block" ref={containerRef} onMouseOver={handleMouseOver} onMouseLeave={() => setHovered(null)}>
      <div class="markdown-body" dangerouslySetInnerHTML={{ __html: safeHtml }} />
      {isActive && hovered && (
        <button
          type="button"
          class="bgm-add"
          aria-label="コメントを追加"
          title={`コメントを追加 (L${hovered.lines.start})`}
          style={{ top: `${hovered.top}px` }}
          onClick={() => onRequestComment(hovered.lines)}
        >
          +
        </button>
      )}
    </div>
  );
}
