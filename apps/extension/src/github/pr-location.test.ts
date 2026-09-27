import { describe, expect, it } from "vitest";
import { isFilesTab, parsePullRequestLocation } from "./pr-location";

describe("parsePullRequestLocation", () => {
  it("reads owner, repository and number from any pull request tab", () => {
    expect(parsePullRequestLocation("https://github.com/acme/docs/pull/42/files")).toEqual({
      owner: "acme",
      repo: "docs",
      number: 42,
    });
    expect(parsePullRequestLocation("https://github.com/acme/docs/pull/42")).toEqual({
      owner: "acme",
      repo: "docs",
      number: 42,
    });
  });

  it("returns null outside pull requests", () => {
    expect(parsePullRequestLocation("https://github.com/acme/docs/issues/42")).toBeNull();
    expect(parsePullRequestLocation("https://github.com/acme/docs/pulls")).toBeNull();
    expect(parsePullRequestLocation("https://gitlab.com/acme/docs/pull/42")).toBeNull();
  });
});

describe("isFilesTab", () => {
  it("recognises both the current and the legacy Files changed URLs", () => {
    expect(isFilesTab("https://github.com/acme/docs/pull/42/changes")).toBe(true);
    expect(isFilesTab("https://github.com/acme/docs/pull/42/files?diff=split")).toBe(true);
  });

  it("rejects other pull request tabs", () => {
    expect(isFilesTab("https://github.com/acme/docs/pull/42")).toBe(false);
    expect(isFilesTab("https://github.com/acme/docs/pull/42/commits")).toBe(false);
  });
});
