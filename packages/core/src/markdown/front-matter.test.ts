import type { Token } from "markdown-it";
import { describe, expect, it } from "vitest";
import { createMarkdownRenderer } from "./renderer";

describe("front matter rendering", () => {
  it("gives each entry the source line it is on", () => {
    const html = createMarkdownRenderer().render("---\ntitle: Spec\nstatus: draft\n---\n");

    expect(html).toContain('<tr data-line-start="2" data-line-end="2"><td>title</td>');
    expect(html).toContain('<tr data-line-start="3" data-line-end="3"><td>status</td>');
  });

  it("leaves entries without line numbers when the source position is unknown", () => {
    const md = createMarkdownRenderer();
    const [token] = md.parse("---\ntitle: Spec\n---\n", {});
    const unplaced = Object.assign(Object.create(Object.getPrototypeOf(token)), token, {
      map: null,
      attrs: null,
    }) as Token;

    const html = md.renderer.render([unplaced], md.options, {});

    expect(html).toContain("<td>title</td>");
    expect(html).not.toContain("data-line-start");
  });
});
