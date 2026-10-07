import { describe, expect, it } from "vitest";
import type { LineRange } from "../markdown/types";
import type { ReviewThread, Side } from "../review/types";
import { buildSplitRows, placeThreads, type SplitRow } from "./split-document";

function thread(side: Side, lines: LineRange): ReviewThread {
  return {
    id: `${side}${lines.start}-${lines.end}`,
    path: "doc.md",
    side,
    lines,
    isResolved: false,
    isOutdated: false,
    canReply: true,
    comments: [],
  };
}

const line = (start: number, end = start): LineRange => ({ start, end });

describe("buildSplitRows", () => {
  it("shows unchanged blocks on both sides with their own rendering", () => {
    const [row] = buildSplitRows("same\n", "same\n");

    expect(row?.kind).toBe("unchanged");
    expect(row?.base?.html).toContain("same");
    expect(row?.head?.html).toContain("same");
  });

  it("leaves the missing side empty for added and removed blocks", () => {
    const rows = buildSplitRows("# T\n\nold only\n", "# T\n\nnew only here\n\nand more\n");

    expect(rows.map((row) => [row.kind, row.base !== null, row.head !== null])).toEqual([
      ["unchanged", true, true],
      ["removed", true, false],
      ["added", false, true],
      ["added", false, true],
    ]);
  });

  it("highlights word changes inside modified blocks", () => {
    const [row] = buildSplitRows("ten minutes timeout\n", "five minutes timeout\n");

    expect(row?.kind).toBe("modified");
    expect(row?.base?.html).toContain('<del class="mhr-del">ten</del>');
    expect(row?.head?.html).toContain('<ins class="mhr-ins">five</ins>');
  });

  it("treats a version that does not exist as a document without blocks", () => {
    expect(buildSplitRows(null, "# New\n").map((row) => row.kind)).toEqual(["added"]);
    expect(buildSplitRows("# Gone\n", null).map((row) => row.kind)).toEqual(["removed"]);
  });

  it("cannot describe a modified row with a missing side", () => {
    const [row] = buildSplitRows("same\n", "same\n");
    // @ts-expect-error a modified row always has both sides
    const broken: SplitRow = { kind: "modified", base: row?.base ?? null, head: null };

    expect(broken.head).toBeNull();
  });
});

describe("placeThreads", () => {
  const base = "# Title\n\nold paragraph text here\n\nshared tail\n";
  const head = "# Title\n\nnew paragraph text here\nsecond line\n\nshared tail\n";
  const rows = buildSplitRows(base, head);

  it("attaches a head-side thread to the head block containing its line", () => {
    const { byRow } = placeThreads(rows, [thread("head", line(4))]);

    expect(byRow[1]?.head.map((t) => t.id)).toEqual(["head4-4"]);
    expect(byRow[1]?.base).toEqual([]);
  });

  it("attaches a base-side thread using base line numbers", () => {
    const { byRow } = placeThreads(rows, [thread("base", line(5))]);

    expect(byRow[2]?.base.map((t) => t.id)).toEqual(["base5-5"]);
  });

  it("anchors a multi-line thread at its first line", () => {
    const { byRow } = placeThreads(rows, [thread("head", line(1, 6))]);

    expect(byRow[0]?.head.map((t) => t.id)).toEqual(["head1-6"]);
  });

  it("attaches a thread on a blank line to the preceding block", () => {
    const { byRow } = placeThreads(rows, [thread("head", line(5))]);

    expect(byRow[1]?.head.map((t) => t.id)).toEqual(["head5-5"]);
  });

  it("returns one empty group per row when there are no threads", () => {
    expect(placeThreads(rows, [])).toEqual({
      byRow: rows.map(() => ({ base: [], head: [] })),
      unplaced: [],
    });
  });

  it("keeps threads whose side has no blocks instead of dropping them", () => {
    const addedFile = buildSplitRows(null, "# New\n");
    const orphan = thread("base", line(1));

    const placement = placeThreads(addedFile, [orphan]);

    expect(placement.unplaced).toEqual([orphan]);
    expect(placement.byRow).toEqual([{ base: [], head: [] }]);
  });

  it("shows a changed diagram as two whole versions, without word highlights", () => {
    const [row] = buildSplitRows(
      "```mermaid\nflowchart LR\n  a --> b\n```\n",
      "```mermaid\nflowchart LR\n  a --> c\n```\n",
    );

    expect(row?.kind).toBe("modified");
    expect(row?.base?.html).toBe(row?.base?.block.html);
    expect(row?.head?.html).toBe(row?.head?.block.html);
  });
});
