import { DIAGRAM_ATTR } from "@mihiraki/core";
import { createContext } from "preact";
import { useContext, useLayoutEffect } from "preact/hooks";

/** A diagram's language (e.g. "mermaid") and its code. */
export interface Diagram {
  readonly language: string;
  readonly code: string;
}

/** A drawing a host started for a diagram. */
export interface DiagramDrawing {
  /** Shown in place of the code. Put on the page right away, as drawing may need that. */
  readonly element: HTMLElement;
  /** Whether the drawing succeeded; the code is shown instead when it did not. */
  readonly isReady: Promise<boolean>;
  readonly remove: () => void;
}

/** Host-specific drawing of diagrams. Without one, diagrams stay code blocks. */
export type DiagramRenderer = (diagram: Diagram) => DiagramDrawing;

export const DiagramRendererContext = createContext<DiagramRenderer | null>(null);

/** `loading`, `ready` or `failed`; the stylesheet shows the code or the drawing by it. */
const STATE_ATTR = "data-mhr-diagram-state";

function readDiagram(placeholder: Element): Diagram | null {
  const language = placeholder.getAttribute(DIAGRAM_ATTR);
  const code = placeholder.querySelector("code")?.textContent;
  return language && code ? { language, code } : null;
}

/**
 * Draws a diagram block with the host's renderer. Only the block's own placeholder is
 * drawn, so HTML in the document that imitates one stays inert.
 */
export function useDiagram(
  contentRef: { readonly current: HTMLElement | null },
  html: string,
  isDiagram: boolean,
): void {
  const renderDiagram = useContext(DiagramRendererContext);
  useLayoutEffect(() => {
    const placeholder = isDiagram
      ? contentRef.current?.querySelector(`:scope > [${DIAGRAM_ATTR}]`)
      : null;
    const diagram = placeholder ? readDiagram(placeholder) : null;
    if (!renderDiagram || !placeholder || !diagram) return;

    const drawing = renderDiagram(diagram);
    let isCurrent = true;
    const settle = (isReady: boolean) => {
      if (isCurrent) placeholder.setAttribute(STATE_ATTR, isReady ? "ready" : "failed");
    };
    placeholder.setAttribute(STATE_ATTR, "loading");
    placeholder.append(drawing.element);
    drawing.isReady.then(settle, () => settle(false));
    return () => {
      isCurrent = false;
      drawing.remove();
      drawing.element.remove();
      placeholder.removeAttribute(STATE_ATTR);
    };
  }, [renderDiagram, html, isDiagram]);
}
