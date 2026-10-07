import { describe, expect, it } from "vitest";
import { placementFor } from "./popup-placement";

const bounds = { top: 0, bottom: 1000 };

describe("placementFor", () => {
  it("opens below the button when the popup fits there", () => {
    expect(placementFor({ anchorTop: 100, anchorBottom: 120, popupHeight: 300, bounds })).toBe(
      "below",
    );
  });

  it("opens above when the popup would be cut off below and fits above", () => {
    expect(placementFor({ anchorTop: 800, anchorBottom: 820, popupHeight: 300, bounds })).toBe(
      "above",
    );
  });

  it("stays below when neither side fits but below has more room", () => {
    expect(placementFor({ anchorTop: 300, anchorBottom: 320, popupHeight: 900, bounds })).toBe(
      "below",
    );
  });

  it("opens above when neither side fits but above has more room", () => {
    expect(placementFor({ anchorTop: 700, anchorBottom: 720, popupHeight: 900, bounds })).toBe(
      "above",
    );
  });
});
