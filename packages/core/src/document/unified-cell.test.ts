import { describe, expect, it } from "vitest";
import { buildSplitRows } from "./split-document";
import { unifiedCell } from "./unified-cell";

function onlyRow(base: string | null, head: string | null) {
  const [row] = buildSplitRows(base, head);
  if (!row) throw new Error("no row");
  return row;
}

describe("unifiedCell", () => {
  it("shows an unchanged block once, from the head version", () => {
    const row = onlyRow("same\n", "same\n");

    expect(unifiedCell(row)).toEqual({ side: "head", cell: row.head });
  });

  it("shows an added block from the head version", () => {
    const row = onlyRow(null, "new\n");

    expect(unifiedCell(row)).toEqual({ side: "head", cell: row.head });
  });

  it("shows a removed block from the base version, so it is commented on as base lines", () => {
    const row = onlyRow("gone\n", null);

    expect(unifiedCell(row)).toEqual({ side: "base", cell: row.base });
  });

  it("shows a modified block as the head version with the removed words in it", () => {
    const row = onlyRow("ten minutes timeout\n", "five minutes timeout\n");
    const { side, cell } = unifiedCell(row);

    expect(side).toBe("head");
    expect(cell.block).toBe(row.head?.block);
    expect(cell.html).toContain('<del class="mhr-del">ten</del><ins class="mhr-ins">five</ins>');
  });

  it("shows the new version of a changed diagram whole", () => {
    const row = onlyRow(
      "```mermaid\nflowchart LR\n  a --> b\n```\n",
      "```mermaid\nflowchart LR\n  a --> c\n```\n",
    );

    const { side, cell } = unifiedCell(row);

    expect(side).toBe("head");
    expect(cell.html).toBe(row.head?.block.html);
  });
});
