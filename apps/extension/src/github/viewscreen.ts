import type { Diagram, DiagramDrawing, DiagramRenderer } from "@mihiraki/ui";
import { asRecord, asString } from "./json";

/**
 * GitHub draws mermaid diagrams in frames from its rendering service, which the page
 * talks to through postMessage. The same frames draw ours, so diagrams look as they do
 * in GitHub's own rich diff.
 */
const VIEWER_ORIGIN = "https://viewscreen.githubusercontent.com";
const DOCS_HOST = "https://docs.github.com";
const VIEWER_LANGUAGES: ReadonlySet<string> = new Set(["mermaid"]);
const READY_TIMEOUT_MS = 15_000;

export type ColorMode = "light" | "dark";

/** The colour mode GitHub renders the page in: the user's choice, else the system's. */
export function hostColorMode(window: Window): ColorMode {
  const mode = window.document.documentElement.getAttribute("data-color-mode");
  if (mode === "light" || mode === "dark") return mode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

interface ViewerStatus {
  readonly status: string;
  readonly height: number | null;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** A status the viewer of `identity` reports, or null for any other message. */
function parseViewerStatus(data: unknown, identity: string): ViewerStatus | null {
  const message = asRecord(typeof data === "string" ? parseJson(data) : data);
  const status = asString(message?.body);
  if (message?.type !== "render" || message.identity !== identity || status === null) return null;
  const height = asRecord(message.payload)?.height;
  const isHeight = typeof height === "number" && Number.isFinite(height) && height > 0;
  return { status, height: isHeight ? height : null };
}

function viewerCommand(identity: string, cmd: string, value: unknown): string {
  return JSON.stringify({ type: "render:cmd", identity, body: { cmd, [cmd]: value } });
}

function createFrame(document: Document, identity: string, colorMode: ColorMode) {
  const frame = document.createElement("iframe");
  const query = new URLSearchParams({ docs_host: DOCS_HOST, color_mode: colorMode });
  frame.title = "Diagram";
  frame.name = identity;
  frame.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups");
  frame.src = `${VIEWER_ORIGIN}/markdown/mermaid?${query}#${identity}`;
  return frame;
}

function failedDrawing(document: Document): DiagramDrawing {
  return {
    element: document.createElement("div"),
    isReady: Promise.resolve(false),
    remove: () => undefined,
  };
}

/** Answers the viewer's statuses: hands it the code, and follows its size and outcome. */
function respondToViewer(
  frame: HTMLIFrameElement,
  code: string,
  settle: (isReady: boolean) => void,
) {
  const post = (cmd: string, value: unknown) =>
    frame.contentWindow?.postMessage(viewerCommand(frame.name, cmd, value), VIEWER_ORIGIN);
  return ({ status, height }: ViewerStatus) => {
    if (height !== null && (status === "ready" || status === "resize"))
      frame.style.height = `${Math.ceil(height)}px`;
    if (status === "hello") {
      post("ack", true);
      post("branding", false);
    } else if (status === "code_rendering_service:markdown:get_data") {
      post("code_rendering_service:data:ready", { data: code, width: frame.clientWidth });
    } else if (status === "code_rendering_service:container:get_size") {
      post("code_rendering_service:container:size", { width: frame.clientWidth });
    } else if (status === "ready") {
      post("code_rendering_service:ready:ack", {});
      settle(true);
    } else if (status.startsWith("error")) {
      settle(false);
    }
  };
}

/** Draws diagrams the way GitHub does, in frames of its rendering service. */
export function createViewscreenRenderer(
  window: Window,
  colorMode: () => ColorMode,
): DiagramRenderer {
  return ({ language, code }: Diagram): DiagramDrawing => {
    if (!VIEWER_LANGUAGES.has(language)) return failedDrawing(window.document);
    const frame = createFrame(window.document, crypto.randomUUID(), colorMode());
    let settle: (isReady: boolean) => void = () => undefined;
    const isReady = new Promise<boolean>((resolve) => {
      settle = resolve;
    });
    const respond = respondToViewer(frame, code, (isDrawn) => settle(isDrawn));
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== VIEWER_ORIGIN || event.source !== frame.contentWindow) return;
      const status = parseViewerStatus(event.data, frame.name);
      if (status !== null) respond(status);
    };
    const timer = window.setTimeout(() => settle(false), READY_TIMEOUT_MS);
    window.addEventListener("message", onMessage);
    return {
      element: frame,
      isReady,
      remove: () => {
        window.removeEventListener("message", onMessage);
        window.clearTimeout(timer);
      },
    };
  };
}
