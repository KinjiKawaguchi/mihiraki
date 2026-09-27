import type { LineRange, Side } from "@mihiraki/core";
import { useEffect, useRef, useState } from "preact/hooks";

/** A source-mapped element of one row, identified by the lines it covers. */
export interface BlockRef {
  readonly rowIndex: number;
  readonly lines: LineRange;
}

/** `dragging` while the pointer is held down on "+", then `composing` once the form is open. */
export type SelectionPhase = "dragging" | "composing";

export interface BlockSelection {
  /** Distinguishes selections, so work started for one never acts on the next. */
  readonly serial: number;
  readonly side: Side;
  readonly anchor: BlockRef;
  readonly focus: BlockRef;
  readonly phase: SelectionPhase;
}

export function selectionRange(selection: BlockSelection): LineRange {
  return {
    start: Math.min(selection.anchor.lines.start, selection.focus.lines.start),
    end: Math.max(selection.anchor.lines.end, selection.focus.lines.end),
  };
}

/** Where the comment form goes: below the selected element that ends last, like GitHub. */
export function selectionEnd(selection: BlockSelection): BlockRef {
  return selection.focus.lines.end >= selection.anchor.lines.end
    ? selection.focus
    : selection.anchor;
}

/** GitHub-style "press + and drag" selection of consecutive elements on one side. */
export function useBlockSelection() {
  const [selection, setSelection] = useState<BlockSelection | null>(null);
  const serial = useRef(0);
  const isDragging = selection?.phase === "dragging";
  const begin = (side: Side, ref: BlockRef, phase: SelectionPhase): BlockSelection => {
    serial.current += 1;
    return { serial: serial.current, side, anchor: ref, focus: ref, phase };
  };

  const finish = () =>
    setSelection((current) =>
      current?.phase === "dragging" ? { ...current, phase: "composing" } : current,
    );

  useEffect(() => {
    if (!isDragging) return undefined;
    window.addEventListener("mouseup", finish);
    return () => window.removeEventListener("mouseup", finish);
  }, [isDragging]);

  return {
    selection,
    start: (side: Side, ref: BlockRef) => setSelection(begin(side, ref, "dragging")),
    open: (side: Side, ref: BlockRef) => setSelection(begin(side, ref, "composing")),
    /** Moves the end of a selection being dragged; ignored otherwise or on the other side. */
    extend: (side: Side, ref: BlockRef) =>
      setSelection((current) =>
        current?.phase === "dragging" && current.side === side
          ? { ...current, focus: ref }
          : current,
      ),
    finish,
    clear: () => setSelection(null),
    /** Clears only if `serial` is still the open selection (e.g. after a slow submit). */
    clearIfCurrent: (expected: number) =>
      setSelection((current) => (current?.serial === expected ? null : current)),
  };
}
