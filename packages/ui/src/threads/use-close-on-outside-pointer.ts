import { useEffect, useRef } from "preact/hooks";

/** Closes a popup when the pointer goes down outside it (the view lives in a shadow root). */
export function useCloseOnOutsidePointer(isOpen: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current?.getRootNode();
    if (!isOpen || !root) return undefined;
    const onPointerDown = (event: Event) => {
      if (ref.current && !event.composedPath().includes(ref.current)) close();
    };
    root.addEventListener("pointerdown", onPointerDown);
    return () => root.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen]);
  return ref;
}
