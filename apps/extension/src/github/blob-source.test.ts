import { describe, expect, it } from "vitest";
import { extractBlobSource, findBlobSource } from "./blob-source";

function page(json: unknown): string {
  const escaped = JSON.stringify(json).replace(/</g, "\\u003c");
  return `<html><body><script type="application/json" data-target="react-app.embeddedData">${escaped}</script></body></html>`;
}

describe("extractBlobSource", () => {
  it("joins rawLines found anywhere in the embedded page data", () => {
    const html = page({ payload: { blob: { rawLines: ["# Title", "", "a <b> & c"] } } });

    expect(extractBlobSource(html)).toBe("# Title\n\na <b> & c");
  });

  it("falls back to rawBlob", () => {
    expect(extractBlobSource(page({ payload: { deep: { blob: { rawBlob: "text\n" } } } }))).toBe(
      "text\n",
    );
  });

  it("returns null when the page has no source", () => {
    expect(extractBlobSource("<html><body>Not found</body></html>")).toBeNull();
  });
});

describe("findBlobSource", () => {
  it("joins the rawLines of a styled blob's route data", () => {
    const json = {
      payload: { "codeViewBlobLayoutRoute.StyledBlob": { rawLines: ["# Title", "", "text"] } },
    };

    expect(findBlobSource(json)).toBe("# Title\n\ntext");
  });

  it("returns null when the data has no source", () => {
    expect(findBlobSource({ payload: { codeViewBlobRoute: { richText: "<p>x</p>" } } })).toBeNull();
  });
});
