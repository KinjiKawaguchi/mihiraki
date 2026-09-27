import type { LineRange, Side } from "@better-gh-md/core";
import { useEffect, useState } from "preact/hooks";

/** A source-mapped element of one row, identified by the lines it covers. */
export interface BlockRef {
  readonly rowIndex: number;
  readonly lines: LineRange;
}

export interface BlockSelection {
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
  const isDragging = selection?.isDragging === true;

  const finish = () =>
    setSelection((current) => (current?.isDragging ? { ...current, isDragging: false } : current));

  useEffect(() => {
    if (!isDragging) return undefined;
    window.addEventListener("mouseup", finish);
    return () => window.removeEventListener("mouseup", finish);
  }, [isDragging]);

  return {
    selection,
    start: (side: Side, ref: BlockRef) =>
      setSelection({ side, anchor: ref, focus: ref, isDragging: true }),
    open: (side: Side, ref: BlockRef) =>
      setSelection({ side, anchor: ref, focus: ref, isDragging: false }),
    extend: (side: Side, ref: BlockRef) =>
      setSelection((current) =>
        current?.isDragging && current.side === side ? { ...current, focus: ref } : current,
      ),
    finish,
    clear: () => setSelection(null),
  };
}
