import { createMemoryBackend } from "@mihiraki/core/memory";
import { render, waitFor } from "@testing-library/preact";
import { describe, expect, it, vi } from "vitest";
import { InlineFileReview } from "../inline/InlineFileReview";
import { createThreadStore } from "../threads/thread-store";
import type { DiagramDrawing, DiagramRenderer } from "./diagrams";

const CHART = "flowchart LR\n  a --> b\n";
const file = { path: "docs/a.md", changeType: "MODIFIED" as const };

function renderFile(head: string, renderDiagram?: DiagramRenderer) {
  const backend = createMemoryBackend({ "docs/a.md": { base: "Intro.\n", head } });
  return render(
    <InlineFileReview
      backend={backend}
      file={file}
      store={createThreadStore(backend)}
      renderDiagram={renderDiagram}
    />,
  );
}

function fakeRenderer() {
  const settle: ((isReady: boolean) => void)[] = [];
  const remove = vi.fn();
  const renderDiagram = vi.fn<DiagramRenderer>(
    (): DiagramDrawing => ({
      element: Object.assign(document.createElement("div"), { className: "drawing" }),
      isReady: new Promise((resolve) => settle.push(resolve)),
      remove,
    }),
  );
  return { renderDiagram, settle, remove };
}

const placeholder = (container: Element) =>
  container.querySelector('[data-side="head"] [data-mhr-diagram]');

describe("diagrams", () => {
  it("hands a diagram's code to the host's renderer and shows the drawing once it is ready", async () => {
    const { renderDiagram, settle } = fakeRenderer();
    const { container } = renderFile(`Intro.\n\n\`\`\`mermaid\n${CHART}\`\`\`\n`, renderDiagram);

    await waitFor(() => expect(renderDiagram).toHaveBeenCalled());
    expect(renderDiagram).toHaveBeenCalledWith({ language: "mermaid", code: CHART });
    expect(placeholder(container)?.getAttribute("data-mhr-diagram-state")).toBe("loading");
    expect(placeholder(container)?.querySelector(".drawing")).toBeTruthy();

    settle[0]?.(true);
    await waitFor(() =>
      expect(placeholder(container)?.getAttribute("data-mhr-diagram-state")).toBe("ready"),
    );
  });

  it("falls back to the code when the drawing fails", async () => {
    const { renderDiagram, settle } = fakeRenderer();
    const { container } = renderFile(`\`\`\`mermaid\n${CHART}\`\`\`\n`, renderDiagram);
    await waitFor(() => expect(renderDiagram).toHaveBeenCalled());

    settle[0]?.(false);

    await waitFor(() =>
      expect(placeholder(container)?.getAttribute("data-mhr-diagram-state")).toBe("failed"),
    );
  });

  it("keeps diagrams as code when the host cannot draw them", async () => {
    const { container } = renderFile(`\`\`\`mermaid\n${CHART}\`\`\`\n`);

    await waitFor(() => expect(placeholder(container)).toBeTruthy());
    expect(placeholder(container)?.hasAttribute("data-mhr-diagram-state")).toBe(false);
    expect(placeholder(container)?.textContent).toContain("a --> b");
  });

  it("does not draw author HTML that only imitates a diagram", async () => {
    const { renderDiagram } = fakeRenderer();
    const { container } = renderFile(
      '<div data-mhr-diagram="mermaid"><pre><code>flowchart LR</code></pre></div>\n',
      renderDiagram,
    );

    await waitFor(() => expect(placeholder(container)).toBeTruthy());
    expect(renderDiagram).not.toHaveBeenCalled();
  });

  it("removes the drawing when the view goes away", async () => {
    const { renderDiagram, remove } = fakeRenderer();
    const { unmount } = renderFile(`\`\`\`mermaid\n${CHART}\`\`\`\n`, renderDiagram);
    await waitFor(() => expect(renderDiagram).toHaveBeenCalled());

    unmount();

    expect(remove).toHaveBeenCalled();
  });
});
