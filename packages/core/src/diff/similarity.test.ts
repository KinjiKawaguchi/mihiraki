import { describe, expect, it } from "vitest";
import { parseBlocks } from "../markdown/blocks";
import { blockSimilarity } from "./similarity";

function block(markdown: string) {
  const [first] = parseBlocks(markdown);
  if (!first) throw new Error("no block");
  return first;
}

describe("blockSimilarity", () => {
  it("is 1 for blocks with the same words", () => {
    expect(blockSimilarity(block("same words here"), block("same  words here"))).toBe(1);
  });

  it("is 0 for blocks of different kinds even with the same words", () => {
    expect(blockSimilarity(block("Overview"), block("# Overview"))).toBe(0);
  });

  it("ignores markdown punctuation when comparing words", () => {
    expect(blockSimilarity(block("make it **bold**"), block("make it bold"))).toBe(1);
  });

  it("compares Japanese text character by character", () => {
    const score = blockSimilarity(
      block("設定ファイルを読み込む"),
      block("設定ファイルを再度読み込む"),
    );

    expect(score).toBeGreaterThan(0.8);
  });
});
