import { describe, expect, it } from "vitest";
import { holdImages } from "./images";
import { sanitizeHtml } from "./sanitize";

const label = (host: string) => `Show image (${host})`;

function parse(html: string): HTMLTemplateElement {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template;
}

describe("holdImages", () => {
  it("loads an image from the URL the host gives for it", () => {
    const html = sanitizeHtml('<p><img src="https://ex.com/a.png" alt="A"></p>');
    const out = parse(
      holdImages(html, { resolve: () => "https://camo.example/a", allowed: new Set() }, label),
    );

    expect(out.content.querySelector("img")?.getAttribute("src")).toBe("https://camo.example/a");
  });

  it("holds an image back behind a button naming its site when the host gives no URL", () => {
    const html = sanitizeHtml('<p><img src="https://tracker.example/pixel.png" alt="pixel"></p>');
    const out = parse(holdImages(html, { resolve: () => null, allowed: new Set() }, label));

    expect(out.content.querySelector("img")).toBeNull();
    const button = out.content.querySelector("button");
    expect(button?.textContent).toBe("Show image (tracker.example)");
    expect(button?.getAttribute("data-mhr-src")).toBe("https://tracker.example/pixel.png");
  });

  it("loads an image the reviewer asked for as written", () => {
    const src = "https://tracker.example/pixel.png";
    const html = sanitizeHtml(`<img src="${src}">`);
    const out = parse(holdImages(html, { resolve: () => null, allowed: new Set([src]) }, label));

    expect(out.content.querySelector("img")?.getAttribute("src")).toBe(src);
  });

  it("drops srcset, which would load other images past the policy", () => {
    const html = sanitizeHtml('<img src="https://ex.com/a.png" srcset="https://ex.com/a2.png 2x">');
    const out = parse(holdImages(html, { resolve: (src) => src, allowed: new Set() }, label));

    expect(out.content.querySelector("img")?.hasAttribute("srcset")).toBe(false);
  });
});

describe("sanitizeHtml", () => {
  it("removes audio and video, whose sources would load from anywhere", () => {
    const html = sanitizeHtml(
      '<video src="https://ex.com/v.mp4"></video><audio src="https://ex.com/a.mp3"></audio>',
    );

    expect(html).not.toContain("ex.com");
  });
});
