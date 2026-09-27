/** Events that GitHub's keyboard shortcuts listen to on `document`. */
const ISOLATED_EVENTS = ["keydown", "keyup", "keypress"] as const;

/** Resets styles inherited from the page before our own CSS applies. */
const HOST_RESET = ":host { all: initial; }";

export interface ShadowHost {
  readonly host: HTMLElement;
  readonly root: ShadowRoot;
  /** Render target inside the shadow root, kept separate from the style element. */
  readonly mount: HTMLElement;
}

/** An element hosting a shadow root with our styles, isolated from page CSS and shortcuts. */
export function createShadowHost(document: Document, tagName: string, cssText: string): ShadowHost {
  const host = document.createElement(tagName);
  const root = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `${HOST_RESET}\n${cssText}`;
  const mount = document.createElement("div");
  root.append(style, mount);
  for (const type of ISOLATED_EVENTS) {
    host.addEventListener(type, (event) => event.stopPropagation());
  }
  return { host, root, mount };
}
