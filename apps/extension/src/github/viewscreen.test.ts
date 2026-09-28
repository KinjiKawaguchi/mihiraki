import type { DiagramDrawing } from "@mihiraki/ui";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createViewscreenRenderer, hostColorMode } from "./viewscreen";

const VIEWER = "https://viewscreen.githubusercontent.com";
const CHART = "flowchart LR\n  a --> b\n";

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-color-mode");
});

interface Sender {
  readonly origin: string;
  readonly source: Window;
  readonly identity: string;
}

function draw(code = CHART) {
  const drawing = createViewscreenRenderer(window, () => "dark")({ language: "mermaid", code });
  document.body.append(drawing.element);
  const frame = drawing.element as HTMLIFrameElement;
  const viewer = frame.contentWindow as Window;
  const posted = vi.spyOn(viewer, "postMessage").mockImplementation(() => undefined);
  const identity = frame.name;
  const report = (body: string, payload: unknown = {}, sender: Partial<Sender> = {}) => {
    const from = { origin: VIEWER, source: viewer, identity, ...sender };
    window.dispatchEvent(
      new MessageEvent("message", {
        data: JSON.stringify({ type: "render", body, payload, identity: from.identity }),
        origin: from.origin,
        source: from.source,
      }),
    );
  };
  const commands = () =>
    posted.mock.calls.map(([message, target]) => ({
      target,
      body: JSON.parse(String(message)).body,
    }));
  return { drawing, frame, identity, report, commands };
}

async function settled(drawing: DiagramDrawing) {
  return await drawing.isReady;
}

describe("createViewscreenRenderer", () => {
  it("opens GitHub's mermaid viewer in the page's colour mode, named after the drawing", () => {
    const { frame, identity } = draw();

    const src = new URL(frame.src);
    expect(src.origin + src.pathname).toBe(`${VIEWER}/markdown/mermaid`);
    expect(src.searchParams.get("color_mode")).toBe("dark");
    expect(src.hash).toBe(`#${identity}`);
    expect(identity).not.toBe("");
  });

  it("acknowledges the viewer and hands it the code when asked", () => {
    const { report, commands } = draw();

    report("hello");
    report("code_rendering_service:markdown:get_data");

    expect(commands()).toEqual([
      { target: VIEWER, body: { cmd: "ack", ack: true } },
      { target: VIEWER, body: { cmd: "branding", branding: false } },
      {
        target: VIEWER,
        body: {
          cmd: "code_rendering_service:data:ready",
          "code_rendering_service:data:ready": { data: CHART, width: 0 },
        },
      },
    ]);
  });

  it("is ready, as tall as the viewer reports, once the diagram is drawn", async () => {
    const { drawing, frame, report, commands } = draw();

    report("ready", { height: 240.4 });

    expect(await settled(drawing)).toBe(true);
    expect(frame.style.height).toBe("241px");
    expect(commands().at(-1)?.body.cmd).toBe("code_rendering_service:ready:ack");
  });

  it("follows the height the viewer reports later", async () => {
    const { frame, report } = draw();

    report("ready", { height: 100 });
    report("resize", { height: 180 });

    expect(frame.style.height).toBe("180px");
  });

  it("ignores messages from any other origin, even through the viewer's frame", () => {
    const { report, commands } = draw();

    report("hello", {}, { origin: "https://evil.example" });

    expect(commands()).toEqual([]);
  });

  it("ignores messages from other frames", () => {
    const { report, commands } = draw();
    const other = draw();

    report("hello", {}, { source: other.frame.contentWindow as Window });

    expect(commands()).toEqual([]);
  });

  it("ignores messages about other drawings", () => {
    const { report, commands } = draw();

    report("hello", {}, { identity: "someone-else" });

    expect(commands()).toEqual([]);
  });

  it("fails when the viewer reports an error", async () => {
    const { drawing, report } = draw();

    report("error");

    expect(await settled(drawing)).toBe(false);
  });

  it("fails when the viewer never finishes", async () => {
    vi.useFakeTimers();
    const { drawing } = draw();

    vi.advanceTimersByTime(15_000);

    expect(await settled(drawing)).toBe(false);
  });

  it("stops talking to the viewer once removed", () => {
    const { drawing, report, commands } = draw();

    drawing.remove();
    report("hello");

    expect(commands()).toEqual([]);
  });

  it("does not try to draw languages the viewer does not know", async () => {
    const drawing = createViewscreenRenderer(
      window,
      () => "light",
    )({
      language: "plantuml",
      code: "@startuml",
    });

    expect(await settled(drawing)).toBe(false);
  });
});

describe("hostColorMode", () => {
  it("uses the colour mode the page is set to", () => {
    document.documentElement.setAttribute("data-color-mode", "light");

    expect(hostColorMode(window)).toBe("light");
  });

  it("follows the system when the page is set to automatic", () => {
    document.documentElement.setAttribute("data-color-mode", "auto");
    const prefersDark = (query: string) => ({ matches: query.includes("dark") }) as MediaQueryList;

    expect(hostColorMode({ document, matchMedia: prefersDark } as unknown as Window)).toBe("dark");
  });
});
