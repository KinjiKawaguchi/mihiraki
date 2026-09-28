import { describe, expect, it } from "vitest";
import { parseBlocks } from "./blocks";

describe("parseBlocks", () => {
  it("splits top-level blocks with 1-based inclusive line ranges", () => {
    const source = ["# Title", "", "First paragraph", "continues here.", "", "- a", "- b"].join(
      "\n",
    );

    const blocks = parseBlocks(source);

    expect(blocks.map((b) => [b.kind, b.lines.start, b.lines.end])).toEqual([
      ["heading", 1, 1],
      ["paragraph", 3, 4],
      ["list", 6, 7],
    ]);
  });

  it("keeps the raw source text of each block", () => {
    const blocks = parseBlocks("Hello **world**\n\n```ts\nconst a = 1;\n```\n");

    expect(blocks.map((b) => b.source)).toEqual(["Hello **world**", "```ts\nconst a = 1;\n```"]);
  });

  it("renders each block to html annotated with source lines of nested elements", () => {
    const blocks = parseBlocks("- one\n- two\n");

    const html = blocks[0]?.html ?? "";
    expect(html).toContain('<ul data-line-start="1" data-line-end="2">');
    expect(html).toContain('<li data-line-start="2" data-line-end="2">');
  });

  it("annotates table rows with their own source line", () => {
    const blocks = parseBlocks("| a | b |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n");

    const html = blocks[0]?.html ?? "";
    expect(blocks[0]?.kind).toBe("table");
    expect(html).toContain('<tr data-line-start="4" data-line-end="4">');
  });

  it("trims trailing blank lines from a block range", () => {
    const blocks = parseBlocks("- a\n\n- b\n\n\nafter\n");

    expect(blocks[0]?.lines).toEqual({ start: 1, end: 3 });
  });

  it("treats yaml front matter as its own block rendered as a table", () => {
    const blocks = parseBlocks("---\ntitle: Spec\nstatus: draft\n---\n\n# Body\n");

    expect(blocks[0]?.kind).toBe("frontmatter");
    expect(blocks[0]?.lines).toEqual({ start: 1, end: 4 });
    expect(blocks[0]?.html).toContain("<td>title</td>");
    expect(blocks[1]?.lines).toEqual({ start: 6, end: 6 });
  });

  it("returns no blocks for an empty document", () => {
    expect(parseBlocks("")).toEqual([]);
  });

  it("makes a top-level mermaid fence a diagram block, keeping its code as the fallback", () => {
    const [block] = parseBlocks("```mermaid\nflowchart LR\n  a --> b\n```\n");

    expect(block?.kind).toBe("diagram");
    expect(block?.html).toContain('data-mhr-diagram="mermaid"');
    expect(block?.html).toContain('data-line-start="1" data-line-end="4"');
    expect(block?.html).toContain("a --&gt; b");
  });

  it("leaves other fences, and mermaid nested in other blocks, as code", () => {
    const blocks = parseBlocks(
      "```ts\nconst a = 1;\n```\n\n- item\n\n  ```mermaid\n  graph\n  ```\n",
    );

    expect(blocks.map((block) => block.kind)).toEqual(["code", "list"]);
    expect(blocks.map((block) => block.html).join("")).not.toContain("data-mhr-diagram");
  });
});
