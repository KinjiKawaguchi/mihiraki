import type { ChangedFile } from "@mihiraki/core";
import { describe, expect, it, vi } from "vitest";
import { createGitHubBackend } from "./github-backend";

const pr = { owner: "acme", repo: "docs", number: 7 };
const BASE = "b".repeat(40);
const HEAD = "h".repeat(40);
const NEWER_HEAD = "n".repeat(40);
const revision = { base: BASE, head: HEAD };

function routeJson(
  threads: Record<string, unknown> = {},
  markersMap: Record<string, unknown> = {},
  headOid = HEAD,
) {
  return {
    payload: {
      pullRequestsChangesRoute: {
        comparison: { fullDiff: { baseOid: BASE, headOid } },
        diffSummaries: [
          { path: "docs/a.md", changeType: "MODIFIED", markersMap },
          { path: "src/main.ts", changeType: "MODIFIED" },
          { path: "docs/new.md", changeType: "ADDED" },
        ],
        markers: { threads },
      },
    },
  };
}

function blobPage(lines: string[]) {
  return `<script type="application/json">${JSON.stringify({ payload: { blob: { rawLines: lines } } })}</script>`;
}

interface RecordedRequest {
  readonly url: string;
  readonly init: RequestInit | undefined;
}

function fakeGitHub(handlers: Record<string, () => Response>) {
  const requests: RecordedRequest[] = [];
  const fetchFn = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    const handler = handlers[url];
    return handler ? handler() : new Response("not found", { status: 404 });
  };
  return { fetchFn, requests };
}

const changesUrl = "https://github.com/acme/docs/pull/7/changes";
const postUrl = "https://github.com/acme/docs/pull/7/page_data/create_review_comment";
const json =
  (value: unknown, status = 200) =>
  () =>
    new Response(JSON.stringify(value), { status });

describe("createGitHubBackend", () => {
  it("lists only Markdown files, requesting route data with the browser session", async () => {
    const { fetchFn, requests } = fakeGitHub({ [changesUrl]: json(routeJson()) });

    const files = await createGitHubBackend(pr, fetchFn).listChangedMarkdownFiles();

    expect(files.map((file) => file.path)).toEqual(["docs/a.md", "docs/new.md"]);
    expect(requests[0]?.init).toMatchObject({
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  });

  it("loads the base version at the base commit and the head version at the head commit", async () => {
    const { fetchFn } = fakeGitHub({
      [changesUrl]: json(routeJson()),
      [`https://github.com/acme/docs/blob/${BASE}/docs/a.md`]: () =>
        new Response(blobPage(["old"])),
      [`https://github.com/acme/docs/blob/${HEAD}/docs/a.md`]: () =>
        new Response(blobPage(["new"])),
    });
    const file: ChangedFile = { path: "docs/a.md", previousPath: null, changeType: "MODIFIED" };

    expect(await createGitHubBackend(pr, fetchFn).loadFileVersions(file)).toEqual({
      revision,
      base: "old",
      head: "new",
    });
  });

  it("does not fetch a base version for an added file", async () => {
    const { fetchFn, requests } = fakeGitHub({
      [changesUrl]: json(routeJson()),
      [`https://github.com/acme/docs/blob/${HEAD}/docs/new.md`]: () =>
        new Response(blobPage(["fresh"])),
    });
    const file: ChangedFile = { path: "docs/new.md", previousPath: null, changeType: "ADDED" };

    expect(await createGitHubBackend(pr, fetchFn).loadFileVersions(file)).toEqual({
      revision,
      base: "",
      head: "fresh",
    });
    expect(requests.some((request) => request.url.includes(BASE))).toBe(false);
  });

  it("fails clearly when a blob page carries no source", async () => {
    const { fetchFn } = fakeGitHub({
      [changesUrl]: json(routeJson()),
      [`https://github.com/acme/docs/blob/${HEAD}/docs/new.md`]: () =>
        new Response("<html></html>"),
    });
    const file: ChangedFile = { path: "docs/new.md", previousPath: null, changeType: "ADDED" };

    await expect(createGitHubBackend(pr, fetchFn).loadFileVersions(file)).rejects.toThrow(
      /docs\/new\.md/,
    );
  });

  it("refetches route data when loading threads so new comments appear", async () => {
    let calls = 0;
    const { fetchFn } = fakeGitHub({
      [changesUrl]: () => {
        calls += 1;
        const threads =
          calls > 1 ? { "5": { id: 5, subjectType: "LINE", commentsData: { comments: [] } } } : {};
        return new Response(JSON.stringify(routeJson(threads, { R3: { threads: [{ id: 5 }] } })));
      },
    });
    const backend = createGitHubBackend(pr, fetchFn);

    expect((await backend.loadThreads()).threads).toHaveLength(0);
    expect((await backend.loadThreads()).threads).toHaveLength(1);
  });

  it("posts a review comment through the internal endpoint", async () => {
    const { fetchFn, requests } = fakeGitHub({
      [changesUrl]: json(routeJson()),
      [postUrl]: json({ thread: {} }),
    });

    await createGitHubBackend(pr, fetchFn).postComment(
      { path: "docs/a.md", side: "RIGHT", line: 3, startLine: null, revision },
      "LGTM",
      "review",
    );

    const post = requests.find((request) => request.url === postUrl);
    expect(post?.init?.method).toBe("POST");
    expect(post?.init?.credentials).toBe("include");
    expect(JSON.parse(String(post?.init?.body))).toMatchObject({
      path: "docs/a.md",
      line: 3,
      comparisonStartOid: BASE,
      text: "LGTM",
      submitBatch: false,
    });
  });

  it("suggests reloading when GitHub cannot place the comment on the compared commits", async () => {
    const { fetchFn } = fakeGitHub({
      [changesUrl]: json(routeJson()),
      [postUrl]: json({ error: "Line could not be resolved." }, 422),
    });

    await expect(
      createGitHubBackend(pr, fetchFn).postComment(
        { path: "docs/a.md", side: "RIGHT", line: 90, startLine: null, revision },
        "x",
        "single",
      ),
    ).rejects.toThrow(/再読み込み/);
  });

  it("refuses a single comment while a review is pending, instead of publishing that review", async () => {
    const pendingRoute = routeJson();
    (pendingRoute.payload.pullRequestsChangesRoute as Record<string, unknown>).viewerPendingReview =
      { id: 9, comments: [] };
    const { fetchFn, requests } = fakeGitHub({
      [changesUrl]: json(pendingRoute),
      [postUrl]: json({ thread: {} }),
    });

    await expect(
      createGitHubBackend(pr, fetchFn).postComment(
        { path: "docs/a.md", side: "RIGHT", line: 3, startLine: null, revision },
        "x",
        "single",
      ),
    ).rejects.toThrow(/保留中のレビュー/);
    expect(requests.some((request) => request.url === postUrl)).toBe(false);
  });

  it("passes the thread GitHub returned on, so it can also be shown in GitHub own UI", async () => {
    const thread = { id: "77", subjectType: "line" };
    const { fetchFn } = fakeGitHub({
      [changesUrl]: json(routeJson()),
      [postUrl]: json({ thread }),
    });
    const onThreadCreated = vi.fn();
    const target = {
      path: "docs/a.md",
      side: "RIGHT" as const,
      line: 3,
      startLine: null,
      revision,
    };

    await createGitHubBackend(pr, fetchFn, { onThreadCreated }).postComment(target, "x", "review");

    expect(onThreadCreated).toHaveBeenCalledWith({ target, mode: "review", thread });
  });

  it("keeps a successful post successful even if showing it in GitHub UI fails", async () => {
    const { fetchFn } = fakeGitHub({
      [changesUrl]: json(routeJson()),
      [postUrl]: json({ thread: { id: "1" } }),
    });
    const onThreadCreated = vi.fn().mockRejectedValue(new Error("bridge gone"));

    await expect(
      createGitHubBackend(pr, fetchFn, { onThreadCreated }).postComment(
        { path: "docs/a.md", side: "RIGHT", line: 3, startLine: null, revision },
        "x",
        "single",
      ),
    ).resolves.toBeUndefined();
  });

  it("reports the latest revision with the threads, so a stale view can be noticed", async () => {
    const { fetchFn } = fakeGitHub({ [changesUrl]: json(routeJson({}, {}, NEWER_HEAD)) });

    expect((await createGitHubBackend(pr, fetchFn).loadThreads()).revision).toEqual({
      base: BASE,
      head: NEWER_HEAD,
    });
  });

  it("posts against the revision the reviewer was looking at, even after the PR moved on", async () => {
    // The lines were chosen in the text of HEAD; GitHub does the same for a stale page.
    const { fetchFn, requests } = fakeGitHub({
      [changesUrl]: json(routeJson({}, {}, NEWER_HEAD)),
      [postUrl]: json({ thread: {} }),
    });

    await createGitHubBackend(pr, fetchFn).postComment(
      { path: "docs/a.md", side: "RIGHT", line: 3, startLine: null, revision },
      "x",
      "single",
    );

    const body = JSON.parse(
      String(requests.find((request) => request.url === postUrl)?.init?.body),
    );
    expect(body).toMatchObject({
      comparisonStartOid: BASE,
      comparisonEndOid: HEAD,
      positioning: { commitOid: HEAD },
    });
  });

  it("gives up on requests GitHub does not answer", async () => {
    const hangingFetch = (_input: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      });

    await expect(
      createGitHubBackend(pr, hangingFetch, { timeoutMs: 20 }).listChangedMarkdownFiles(),
    ).rejects.toThrow(/応答/);
  });

  it("reports other failures with the HTTP status", async () => {
    const { fetchFn } = fakeGitHub({
      [changesUrl]: json(routeJson()),
      [postUrl]: json({ message: "Forbidden" }, 403),
    });

    await expect(
      createGitHubBackend(pr, fetchFn).postComment(
        { path: "docs/a.md", side: "RIGHT", line: 3, startLine: null, revision },
        "x",
        "single",
      ),
    ).rejects.toThrow(/403/);
  });
});
