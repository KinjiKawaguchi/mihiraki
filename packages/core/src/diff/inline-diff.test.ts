import { describe, expect, it } from "vitest";
import { diffBlockHtml } from "./inline-diff";

describe("diffBlockHtml", () => {
  it("leaves identical html untouched", () => {
    const html = "<p>same text</p>";

    expect(diffBlockHtml(html, html)).toEqual({ base: html, head: html });
  });

  it("marks a replaced word as deleted on the base side and inserted on the head side", () => {
    const result = diffBlockHtml("<p>the old value</p>", "<p>the new value</p>");

    expect(result.base).toBe('<p>the <del class="bgm-del">old</del> value</p>');
    expect(result.head).toBe('<p>the <ins class="bgm-ins">new</ins> value</p>');
  });

  it("highlights a single inserted Japanese character", () => {
    const result = diffBlockHtml("<p>仕様を確認する</p>", "<p>仕様を再確認する</p>");

    expect(result.base).toBe("<p>仕様を確認する</p>");
    expect(result.head).toBe('<p>仕様を<ins class="bgm-ins">再</ins>確認する</p>');
  });

  it("merges consecutive changed words into one highlight", () => {
    const result = diffBlockHtml("<p>keep this</p>", "<p>keep this and much more</p>");

    expect(result.head).toBe('<p>keep this<ins class="bgm-ins"> and much more</ins></p>');
  });

  it("never wraps tags, only the text inside them", () => {
    const result = diffBlockHtml("<p>a <strong>b</strong></p>", "<p>a <strong>c</strong></p>");

    expect(result.base).toBe('<p>a <strong><del class="bgm-del">b</del></strong></p>');
    expect(result.head).toBe('<p>a <strong><ins class="bgm-ins">c</ins></strong></p>');
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
