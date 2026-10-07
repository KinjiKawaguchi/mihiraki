import type { ImageSource } from "@mihiraki/ui";

/** GitHub's own rich diff marks each proxied image with the address it was written with. */
const PROXIED_IMAGE = "img[data-canonical-src]";

/** Hosts GitHub serves itself; loading from them tells no third party who is reading. */
function isGitHubHost(host: string): boolean {
  return (
    host === "github.com" ||
    host.endsWith(".githubusercontent.com") ||
    host.endsWith(".githubassets.com")
  );
}

/** A path without a scheme or host: it resolves to the page's own site, github.com. */
function isRelative(src: string): boolean {
  return !/^[a-z][a-z\d+.-]*:/i.test(src) && !src.startsWith("//");
}

function urlOf(src: string, base: string): URL | null {
  try {
    return new URL(src, base);
  } catch {
    return null;
  }
}

/**
 * Where an image of the file loads from on github.com: as written when GitHub itself serves
 * it (including relative paths and data URIs); through the proxied address GitHub gave the
 * same image in its own rich diff of this file otherwise; or held back when there is none,
 * as GitHub never loads a third-party image straight from the reader's browser.
 */
export function githubImageSource(container: Element): ImageSource {
  const base = container.ownerDocument.baseURI;
  return (src) => {
    if (isRelative(src)) return src;
    const url = urlOf(src, base);
    if (!url) return null;
    if (url.protocol === "data:" || isGitHubHost(url.host)) return src;
    for (const image of Array.from(container.querySelectorAll(PROXIED_IMAGE))) {
      const canonical = urlOf(image.getAttribute("data-canonical-src") ?? "", base);
      const proxied = image.getAttribute("src");
      if (canonical?.href === url.href && proxied) return proxied;
    }
    return null;
  };
}

/** Changes when GitHub's own rendering of the file (and its proxied images) comes or goes. */
export function imageKeyOf(container: Element): string {
  return Array.from(container.querySelectorAll(PROXIED_IMAGE), (image) =>
    image.getAttribute("data-canonical-src"),
  ).join("\n");
}
