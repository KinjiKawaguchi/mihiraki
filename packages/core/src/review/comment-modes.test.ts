import { describe, expect, it } from "vitest";
import { availableCommentModes } from "./comment-modes";

describe("availableCommentModes", () => {
  it("offers a single comment or starting a review when no review is pending", () => {
    expect(availableCommentModes(false)).toEqual(["single", "review"]);
  });

  it("only offers adding to the review while one is pending", () => {
    // A single comment would publish the whole pending review along with it (as on GitHub).
    expect(availableCommentModes(true)).toEqual(["review"]);
  });
});
