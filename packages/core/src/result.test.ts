import { describe, expect, it } from "vitest";
import { err, mapResult, ok } from "./result";

describe("mapResult", () => {
  it("transforms the value of a success", () => {
    expect(mapResult(ok(2), (value) => value * 10)).toEqual(ok(20));
  });

  it("passes a failure through untouched", () => {
    const transform = (value: number) => value * 10;

    expect(mapResult(err("boom"), transform)).toEqual(err("boom"));
  });
});
