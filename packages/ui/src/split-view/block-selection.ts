import type { LineRange, Side } from "@mihiraki/core";
import { useEffect, useRef, useState } from "preact/hooks";

/** A source-mapped element of one row, identified by the lines it covers. */
export interface BlockRef {
  readonly rowIndex: number;
  readonly lines: LineRange;
}

export interface BlockSelection {
  /** Distinguishes selections, so work started for one never acts on the next. */
  readonly serial: number;
  readonly side: Side;
  readonly anchor: BlockRef;
  readonly focus: BlockRef;
  /** True while the pointer is still held down on the add button. */
  readonly isDragging: boolean;
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
  const isDragging = selection?.isDragging === true;
  const begin = (side: Side, ref: BlockRef, isDraggingNow: boolean): BlockSelection => {
    serial.current += 1;
    return { serial: serial.current, side, anchor: ref, focus: ref, isDragging: isDraggingNow };
  };

  const finish = () =>
    setSelection((current) => (current?.isDragging ? { ...current, isDragging: false } : current));

  useEffect(() => {
    if (!isDragging) return undefined;
    window.addEventListener("mouseup", finish);
    return () => window.removeEventListener("mouseup", finish);
  }, [isDragging]);

  return {
    selection,
    start: (side: Side, ref: BlockRef) => setSelection(begin(side, ref, true)),
    open: (side: Side, ref: BlockRef) => setSelection(begin(side, ref, false)),
    extend: (side: Side, ref: BlockRef) =>
      setSelection((current) =>
        current?.isDragging && current.side === side ? { ...current, focus: ref } : current,
      ),
    finish,
    clear: () => setSelection(null),
    /** Clears only if `serial` is still the open selection (e.g. after a slow submit). */
    clearIfCurrent: (expected: number) =>
      setSelection((current) => (current?.serial === expected ? null : current)),
  };
}
