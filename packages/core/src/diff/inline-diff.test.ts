import { describe, expect, it } from "vitest";
import { diffBlockHtml, mergeBlockHtml } from "./inline-diff";

describe("diffBlockHtml", () => {
  it("leaves identical html untouched", () => {
    const html = "<p>same text</p>";

    expect(diffBlockHtml(html, html)).toEqual({ base: html, head: html });
  });

  it("marks a replaced word as deleted on the base side and inserted on the head side", () => {
    const result = diffBlockHtml("<p>the old value</p>", "<p>the new value</p>");

    expect(result.base).toBe('<p>the <del class="mhr-del">old</del> value</p>');
    expect(result.head).toBe('<p>the <ins class="mhr-ins">new</ins> value</p>');
  });

  it("highlights a single inserted Japanese character", () => {
    const result = diffBlockHtml("<p>仕様を確認する</p>", "<p>仕様を再確認する</p>");

    expect(result.base).toBe("<p>仕様を確認する</p>");
    expect(result.head).toBe('<p>仕様を<ins class="mhr-ins">再</ins>確認する</p>');
  });

  it("merges consecutive changed words into one highlight", () => {
    const result = diffBlockHtml("<p>keep this</p>", "<p>keep this and much more</p>");

    expect(result.head).toBe('<p>keep this<ins class="mhr-ins"> and much more</ins></p>');
  });

  it("never wraps tags, only the text inside them", () => {
    const result = diffBlockHtml("<p>a <strong>b</strong></p>", "<p>a <strong>c</strong></p>");

    expect(result.base).toBe('<p>a <strong><del class="mhr-del">b</del></strong></p>');
    expect(result.head).toBe('<p>a <strong><ins class="mhr-ins">c</ins></strong></p>');
  });

  it("keeps each side own line attributes without reporting them as changes", () => {
    const result = diffBlockHtml(
      '<p data-line-start="1" data-line-end="1">x</p>',
      '<p data-line-start="5" data-line-end="5">x</p>',
    );

    expect(result.base).toBe('<p data-line-start="1" data-line-end="1">x</p>');
    expect(result.head).toBe('<p data-line-start="5" data-line-end="5">x</p>');
  });
});

describe("mergeBlockHtml", () => {
  it("leaves identical html untouched", () => {
    const html = "<p>same text</p>";

    expect(mergeBlockHtml(html, html)).toBe(html);
  });

  it("shows a replaced word as deleted then inserted, in place", () => {
    expect(mergeBlockHtml("<p>the old value</p>", "<p>the new value</p>")).toBe(
      '<p>the <del class="mhr-del">old</del><ins class="mhr-ins">new</ins> value</p>',
    );
  });

  it("marks an inserted Japanese character", () => {
    expect(mergeBlockHtml("<p>仕様を確認する</p>", "<p>仕様を再確認する</p>")).toBe(
      '<p>仕様を<ins class="mhr-ins">再</ins>確認する</p>',
    );
  });

  it("shows removed words where they used to be", () => {
    expect(mergeBlockHtml("<p>keep this and more</p>", "<p>keep this</p>")).toBe(
      '<p>keep this<del class="mhr-del"> and more</del></p>',
    );
  });

  it("marks text inside tags without wrapping the tags", () => {
    expect(mergeBlockHtml("<p>a <strong>b</strong></p>", "<p>a <strong>c</strong></p>")).toBe(
      '<p>a <strong><del class="mhr-del">b</del><ins class="mhr-ins">c</ins></strong></p>',
    );
  });

  it("keeps the head's structure, dropping tags only the base had", () => {
    expect(mergeBlockHtml("<p>see <em>this</em> now</p>", "<p>see now</p>")).toBe(
      '<p>see <del class="mhr-del">this </del>now</p>',
    );
  });

  it("keeps the head's source line attributes", () => {
    expect(
      mergeBlockHtml(
        '<p data-line-start="1" data-line-end="1">x</p>',
        '<p data-line-start="5" data-line-end="5">x</p>',
      ),
    ).toBe('<p data-line-start="5" data-line-end="5">x</p>');
  });
});
