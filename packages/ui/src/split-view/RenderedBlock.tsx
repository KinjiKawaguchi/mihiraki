import type { LineRange } from "@mihiraki/core";
import type { ComponentChild } from "preact";
import { createPortal } from "preact/compat";
import { useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import { SafeHtml } from "../safe-html/SafeHtml";
import { type SanitizedHtml, sanitizeHtml } from "../safe-html/sanitize";
import { insertSlotBelow, lineElementAt, markSelectedElements, readLines } from "./rendered-dom";

interface HoveredElement {
  readonly lines: LineRange;
  readonly top: number;
}

interface RenderedBlockProps {
  readonly html: string;
  /** Only the most recently hovered block shows its button, since mouseleave is not guaranteed. */
  readonly isActive: boolean;
  readonly onActivate: () => void;
  /** Pointer pressed on "+": starts a selection that can be extended by dragging. */
  readonly onSelectionStart: (lines: LineRange) => void;
  /** "+" activated from the keyboard: comment on this element only. */
  readonly onRequestComment: (lines: LineRange) => void;
  /** Pointer moved over an element (or beside it, in the gutter); extends a drag selection. */
  readonly onPointerOverLines: (lines: LineRange) => void;
  readonly highlightedLines: LineRange | null;
  /** Lines of the element the comment form should appear under, if it belongs to this block. */
  readonly formAfterLines: LineRange | null;
  readonly form: ComponentChild;
}

function useFormSlot(
  contentRef: { current: HTMLDivElement | null },
  html: SanitizedHtml,
  lines: LineRange | null,
) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const created = contentRef.current && lines ? insertSlotBelow(contentRef.current, lines) : null;
    setSlot(created);
    return () => created?.remove();
  }, [html, lines?.start, lines?.end]);
  return slot;
}

interface AddCommentButtonProps {
  readonly hovered: HoveredElement;
  readonly onSelectionStart: (lines: LineRange) => void;
  readonly onRequestComment: (lines: LineRange) => void;
}

/** Press and drag selects a range (see useBlockSelection); keyboard activation comments right away. */
function AddCommentButton({ hovered, onSelectionStart, onRequestComment }: AddCommentButtonProps) {
  return (
    <button
      type="button"
      class="mhr-add"
      aria-label="コメントを追加"
      title="クリックでコメント、ドラッグで範囲を選択"
      style={{ top: `${hovered.top}px` }}
      onMouseDown={(event) => {
        event.preventDefault();
        onSelectionStart(hovered.lines);
      }}
      onClick={(event) => {
        if (event.detail === 0) onRequestComment(hovered.lines);
      }}
    >
      +
    </button>
  );
}

/** Sanitised rendered Markdown with a "+" button on whichever source-mapped element is hovered. */
export function RenderedBlock(props: RenderedBlockProps) {
  const {
    html,
    isActive,
    onActivate,
    onSelectionStart,
    onRequestComment,
    onPointerOverLines,
    highlightedLines,
    formAfterLines,
    form,
  } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<HoveredElement | null>(null);
  const safeHtml = useMemo(() => sanitizeHtml(html), [html]);
  const slot = useFormSlot(contentRef, safeHtml, formAfterLines);

  useLayoutEffect(() => {
    if (contentRef.current) markSelectedElements(contentRef.current, highlightedLines);
  }, [safeHtml, highlightedLines?.start, highlightedLines?.end]);

  const handlePointer = (event: MouseEvent) => {
    const container = containerRef.current;
    const content = contentRef.current;
    const element = content ? lineElementAt(content, event.target, event.clientY) : null;
    const lines = element ? readLines(element) : null;
    if (!container || !element || !lines) return;
    const top = element.getBoundingClientRect().top - container.getBoundingClientRect().top;
    const isSame =
      hovered?.top === top &&
      hovered.lines.start === lines.start &&
      hovered.lines.end === lines.end;
    if (!isSame) setHovered({ lines, top });
    onActivate();
    onPointerOverLines(lines);
  };

  return (
    // Hovering only reveals the "+" button; the rendered content itself is not interactive.
    // biome-ignore lint/a11y/noStaticElementInteractions: pointer tracking for the hover affordance
    // biome-ignore lint/a11y/useKeyWithMouseEvents: see above; keyboard access is a known gap
    <div
      class="mhr-block"
      ref={containerRef}
      onMouseOver={handlePointer}
      onMouseMove={handlePointer}
      onMouseLeave={() => setHovered(null)}
    >
      <SafeHtml class="markdown-body" html={safeHtml} elementRef={contentRef} />
      {isActive && hovered && (
        <AddCommentButton
          hovered={hovered}
          onSelectionStart={onSelectionStart}
          onRequestComment={onRequestComment}
        />
      )}
      {slot && createPortal(form, slot)}
    </div>
  );
}
