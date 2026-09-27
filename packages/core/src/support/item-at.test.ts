import { describe, expect, it } from "vitest";
import { itemAt } from "./item-at";

describe("itemAt", () => {
  it("returns the item at an index that exists", () => {
    expect(itemAt([10, 20, 30], 1)).toBe(20);
  });

  it("throws for an index outside the array, since callers rely on it existing", () => {
    expect(() => itemAt([10], 1)).toThrow(RangeError);
  });
});
