import { afterEach, describe, expect, it } from "vitest";
import { githubImageSource, imageKeyOf } from "./github-images";

afterEach(() => {
  document.body.innerHTML = "";
});

function fileBlock(html: string): HTMLElement {
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.append(container);
  return container;
}

describe("githubImageSource", () => {
  it("loads an external image through the proxied URL GitHub gave it in its own rich diff", () => {
    const container = fileBlock(
      '<article><img src="https://camo.githubusercontent.com/abc" data-canonical-src="https://ex.com/a.png"></article>',
    );

    expect(githubImageSource(container)("https://ex.com/a.png")).toBe(
      "https://camo.githubusercontent.com/abc",
    );
  });

  it("holds back an external image GitHub has not proxied", () => {
    expect(githubImageSource(fileBlock(""))("https://tracker.example/p.png")).toBeNull();
  });

  it("lets images from GitHub itself and relative paths load as written", () => {
    const source = githubImageSource(fileBlock(""));

    expect(source("https://github.com/acme/app/raw/main/a.png")).toBe(
      "https://github.com/acme/app/raw/main/a.png",
    );
    expect(source("https://avatars.githubusercontent.com/u/1")).toBe(
      "https://avatars.githubusercontent.com/u/1",
    );
    expect(source("./images/a.png")).toBe("./images/a.png");
    expect(source("data:image/png;base64,AAAA")).toBe("data:image/png;base64,AAAA");
  });

  it("does not trust a look-alike host", () => {
    expect(githubImageSource(fileBlock(""))("https://github.com.evil.example/a.png")).toBeNull();
  });
});

describe("imageKeyOf", () => {
  it("changes once GitHub's own rendering with proxied images arrives", () => {
    const container = fileBlock("");
    const before = imageKeyOf(container);

    container.innerHTML =
      '<article><img src="https://camo.githubusercontent.com/abc" data-canonical-src="https://ex.com/a.png"></article>';

    expect(imageKeyOf(container)).not.toBe(before);
  });
});
