import type { RefObject } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";

export type Placement = "below" | "above";

interface PlacementInput {
  readonly anchorTop: number;
  readonly anchorBottom: number;
  readonly popupHeight: number;
  /** The vertical range where the popup stays visible. */
  readonly bounds: { readonly top: number; readonly bottom: number };
}

/** Below the button as usual; above when only that keeps the popup from being cut off. */
export function placementFor({
  anchorTop,
  anchorBottom,
  popupHeight,
  bounds,
}: PlacementInput): Placement {
  const below = bounds.bottom - anchorBottom;
  const above = anchorTop - bounds.top;
  if (below >= popupHeight) return "below";
  return above >= popupHeight || above > below ? "above" : "below";
}

/**
 * Where a popup is visible: the viewport, narrowed to the view's shadow host, since
 * GitHub's file card clips what overflows the view.
 */
function visibleBounds(anchor: Element) {
  const root = anchor.getRootNode();
  const host = root instanceof ShadowRoot ? root.host.getBoundingClientRect() : null;
  const viewport = anchor.ownerDocument.defaultView?.innerHeight ?? Number.POSITIVE_INFINITY;
  return {
    top: Math.max(0, host?.top ?? 0),
    bottom: Math.min(viewport, host?.bottom ?? viewport),
  };
}

/** Places the popup of `anchor` each time it opens; render `placement` on the popup. */
export function usePopupPlacement(isOpen: boolean, anchor: RefObject<HTMLElement>) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<Placement>("below");
  useLayoutEffect(() => {
    const anchorElement = anchor.current;
    const popup = popupRef.current;
    if (!isOpen || !anchorElement || !popup) return;
    const rect = anchorElement.getBoundingClientRect();
    setPlacement(
      placementFor({
        anchorTop: rect.top,
        anchorBottom: rect.bottom,
        popupHeight: popup.offsetHeight,
        bounds: visibleBounds(anchorElement),
      }),
    );
  }, [isOpen, anchor]);
  return { popupRef, placement };
}
