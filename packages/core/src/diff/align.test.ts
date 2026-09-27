import { describe, expect, it } from "vitest";
import { parseBlocks } from "../markdown/blocks";
import { type AlignedRow, alignBlocks } from "./align";

function align(base: string, head: string) {
  return alignBlocks(parseBlocks(base), parseBlocks(head));
}

function summarize(rows: readonly AlignedRow[]) {
  return rows.map((row) => [row.kind, row.base?.source ?? null, row.head?.source ?? null]);
}

describe("alignBlocks", () => {
  it("pairs identical blocks as unchanged", () => {
    const doc = "# A\n\ntext\n";

    expect(summarize(align(doc, doc))).toEqual([
      ["unchanged", "# A", "# A"],
      ["unchanged", "text", "text"],
    ]);
  });

  it("reports an inserted block at its position with no base counterpart", () => {
    const rows = align("# A\n\nlast\n", "# A\n\nnew one\n\nlast\n");

    expect(summarize(rows)).toEqual([
      ["unchanged", "# A", "# A"],
      ["added", null, "new one"],
      ["unchanged", "last", "last"],
    ]);
  });

  it("reports a deleted block with no head counterpart", () => {
    const rows = align("# A\n\ngone\n\nlast\n", "# A\n\nlast\n");

    expect(summarize(rows)).toEqual([
      ["unchanged", "# A", "# A"],
      ["removed", "gone", null],
      ["unchanged", "last", "last"],
    ]);
  });

  it("pairs an edited block with its previous version as modified", () => {
    const rows = align("Fix the typo in this sentence.\n", "Fix the typos in this sentence.\n");

    expect(summarize(rows)).toEqual([
      ["modified", "Fix the typo in this sentence.", "Fix the typos in this sentence."],
    ]);
  });

  it("does not pair blocks of different kinds", () => {
    const rows = align("Overview\n", "# Overview\n");

    expect(rows.map((row) => row.kind)).toEqual(["removed", "added"]);
  });

  it("does not pair unrelated blocks of the same kind", () => {
    const rows = align("Alpha beta gamma delta.\n", "Completely unrelated text here.\n");

    expect(rows.map((row) => row.kind)).toEqual(["removed", "added"]);
  });

  it("pairs the most similar block when several changed blocks sit together", () => {
    const base = "Dropped paragraph entirely.\n\nThe cache expires after ten minutes.\n";
    const head = "The cache expires after five minutes.\n";

    expect(summarize(align(base, head))).toEqual([
      ["removed", "Dropped paragraph entirely.", null],
      ["modified", "The cache expires after ten minutes.", "The cache expires after five minutes."],
    ]);
  });

  it("treats every block of a new file as added", () => {
    expect(align("", "# New\n\nbody\n").map((row) => row.kind)).toEqual(["added", "added"]);
  });
});
