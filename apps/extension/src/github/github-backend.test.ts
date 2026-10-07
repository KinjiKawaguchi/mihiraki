import {
  type ChangedFile,
  type CommentTarget,
  commitId,
  err,
  mapResult,
  ok,
  type ReviewBackend,
} from "@mihiraki/core";
import { describe, expect, it, vi } from "vitest";
import { createGitHubBackend } from "./github-backend";

const pr = { owner: "acme", repo: "docs", number: 7 };
const BASE = "b".repeat(40);
const HEAD = "c".repeat(40);
const NEWER_HEAD = "d".repeat(40);
const revision = { base: commitId(BASE), head: commitId(HEAD) };
const target: CommentTarget = {
  path: "docs/a.md",
  side: "head",
  lines: { start: 3, end: 3 },
  revision,
};

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
          { path: "docs/moved.md", changeType: "RENAMED" },
        ],
        diffContents: [{ path: "docs/moved.md", oldTreeEntry: { path: "old/moved.md" } }],
        markers: { threads },
      },
    },
  };
}

function styledUrl(oid: string, path: string) {
  return `https://github.com/acme/docs/_styled/${oid}/${path}`;
}

function styledBlob(lines: string[]) {
  return json({ payload: { "codeViewBlobLayoutRoute.StyledBlob": { rawLines: lines } } });
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

async function loadSnapshot(backend: ReviewBackend) {
  const loaded = await backend.loadThreads();
  if (!loaded.ok) throw new Error(`Unexpected failure: ${loaded.error.kind}`);
  return loaded.value;
}

describe("createGitHubBackend", () => {
  it("lists only Markdown files, requesting route data with the browser session", async () => {
    const { fetchFn, requests } = fakeGitHub({ [changesUrl]: json(routeJson()) });

    const files = await createGitHubBackend(pr, fetchFn).listChangedMarkdownFiles();

    expect(mapResult(files, (list) => list.map((file) => file.path))).toEqual(
      ok(["docs/a.md", "docs/new.md", "docs/moved.md"]),
    );
    expect(requests[0]?.init).toMatchObject({
      credentials: "include",
      headers: { Accept: "application/json" },
    });
  });

  it("loads the base version at the base commit and the head version at the head commit", async () => {
    const { fetchFn } = fakeGitHub({
      [changesUrl]: json(routeJson()),
      [styledUrl(BASE, "docs/a.md")]: styledBlob(["old"]),
      [styledUrl(HEAD, "docs/a.md")]: styledBlob(["new"]),
    });
    const file: ChangedFile = { path: "docs/a.md", changeType: "MODIFIED" };

    expect(await createGitHubBackend(pr, fetchFn).loadFileVersions(file)).toEqual(
      ok({ revision, base: "old", head: "new" }),
    );
  });

  it("does not fetch a base version for an added file", async () => {
    const { fetchFn, requests } = fakeGitHub({
      [changesUrl]: json(routeJson()),
      [styledUrl(HEAD, "docs/new.md")]: styledBlob(["fresh"]),
    });
    const file: ChangedFile = { path: "docs/new.md", changeType: "ADDED" };

    expect(await createGitHubBackend(pr, fetchFn).loadFileVersions(file)).toEqual(
      ok({ revision, base: null, head: "fresh" }),
    );
    expect(requests.some((request) => request.url.includes(BASE))).toBe(false);
  });

  it("loads the base version of a renamed file from its previous path", async () => {
    const { fetchFn } = fakeGitHub({
      [changesUrl]: json(routeJson()),
      [styledUrl(BASE, "old/moved.md")]: styledBlob(["before"]),
      [styledUrl(HEAD, "docs/moved.md")]: styledBlob(["after"]),
    });
    const file: ChangedFile = {
      path: "docs/moved.md",
      previousPath: "old/moved.md",
      changeType: "RENAMED",
    };

    expect(await createGitHubBackend(pr, fetchFn).loadFileVersions(file)).toMatchObject(
      ok({ base: "before", head: "after" }),
    );
  });

  it("falls back to the blob page when the styled source is not served", async () => {
    const { fetchFn } = fakeGitHub({
      [changesUrl]: json(routeJson()),
      [`https://github.com/acme/docs/blob/${HEAD}/docs/new.md`]: () =>
        new Response(blobPage(["from the page"])),
    });
    const file: ChangedFile = { path: "docs/new.md", changeType: "ADDED" };

    expect(await createGitHubBackend(pr, fetchFn).loadFileVersions(file)).toEqual(
      ok({ revision, base: null, head: "from the page" }),
    );
  });

  it("reports a file whose source is found nowhere as an unexpected response", async () => {
    const { fetchFn } = fakeGitHub({
      [changesUrl]: json(routeJson()),
      [styledUrl(HEAD, "docs/new.md")]: json({ payload: {} }),
      [`https://github.com/acme/docs/blob/${HEAD}/docs/new.md`]: () =>
        new Response("<html></html>"),
    });
    const file: ChangedFile = { path: "docs/new.md", changeType: "ADDED" };

    expect(await createGitHubBackend(pr, fetchFn).loadFileVersions(file)).toEqual(
      err({ kind: "unexpectedResponse" }),
    );
  });

  it("reports a file GitHub refuses to serve with the HTTP status", async () => {
    const { fetchFn } = fakeGitHub({ [changesUrl]: json(routeJson()) });
    const file: ChangedFile = { path: "docs/new.md", changeType: "ADDED" };

    expect(await createGitHubBackend(pr, fetchFn).loadFileVersions(file)).toEqual(
      err({ kind: "rejected", detail: "HTTP 404" }),
    );
  });

  it("reports threads that cannot be loaded for lack of a connection", async () => {
    const offlineFetch = () => Promise.reject(new TypeError("Failed to fetch"));

    expect(await createGitHubBackend(pr, offlineFetch).loadThreads()).toEqual(
      err({ kind: "network" }),
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

    expect((await loadSnapshot(backend)).threads).toHaveLength(0);
    expect((await loadSnapshot(backend)).threads).toHaveLength(1);
  });

  it("does not make file versions wait for a thread refresh in flight", async () => {
    let routeCalls = 0;
    const { fetchFn } = fakeGitHub({
      [changesUrl]: () => {
        routeCalls += 1;
        return new Response(JSON.stringify(routeJson()));
      },
      [styledUrl(BASE, "docs/a.md")]: styledBlob(["old"]),
      [styledUrl(HEAD, "docs/a.md")]: styledBlob(["new"]),
    });
    const slowRefresh = new Promise<Response>(() => undefined);
    const backend = createGitHubBackend(pr, (input, init) =>
      routeCalls >= 1 && String(input) === changesUrl ? slowRefresh : fetchFn(input, init),
    );
    await backend.listChangedMarkdownFiles();

    void backend.loadThreads();
    const versions = await backend.loadFileVersions({ path: "docs/a.md", changeType: "MODIFIED" });

    expect(versions).toEqual(ok({ revision, base: "old", head: "new" }));
  });

  it("keeps the newest route data when refreshes finish out of order", async () => {
    const pendingRoutes: ((response: Response) => void)[] = [];
    const fileRequests: string[] = [];
    const backend = createGitHubBackend(pr, (input) => {
      const url = String(input);
      if (url === changesUrl) return new Promise((resolve) => pendingRoutes.push(resolve));
      fileRequests.push(url);
      return Promise.resolve(styledBlob(["text"])());
    });
    const route = (headOid: string) => new Response(JSON.stringify(routeJson({}, {}, headOid)));

    const older = backend.loadThreads();
    const newer = backend.loadThreads();
    pendingRoutes[1]?.(route(NEWER_HEAD));
    await newer;
    pendingRoutes[0]?.(route(HEAD));
    await older;
    await backend.loadFileVersions({ path: "docs/new.md", changeType: "ADDED" });

    expect(fileRequests).toEqual([styledUrl(NEWER_HEAD, "docs/new.md")]);
  });

  it("reports whether the viewer has a pending review with the threads", async () => {
    const pendingRoute = routeJson();
    (pendingRoute.payload.pullRequestsChangesRoute as Record<string, unknown>).viewerPendingReview =
      { id: 9, comments: [] };
    const { fetchFn } = fakeGitHub({ [changesUrl]: json(pendingRoute) });

    expect((await loadSnapshot(createGitHubBackend(pr, fetchFn))).hasPendingReview).toBe(true);
  });

  it("posts a review comment through the internal endpoint", async () => {
    const { fetchFn, requests } = fakeGitHub({
      [changesUrl]: json(routeJson()),
      [postUrl]: json({ thread: {} }),
    });

    const result = await createGitHubBackend(pr, fetchFn).postComment(target, "LGTM", "review");

    expect(result).toEqual(ok(undefined));
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

  it("reports when GitHub cannot place the comment on the compared commits", async () => {
    const { fetchFn } = fakeGitHub({
      [changesUrl]: json(routeJson()),
      [postUrl]: json({ error: "Line could not be resolved." }, 422),
    });

    expect(
      await createGitHubBackend(pr, fetchFn).postComment(
        { ...target, lines: { start: 90, end: 90 } },
        "x",
        "single",
      ),
    ).toEqual(err({ kind: "lineNotResolved" }));
  });

  it("refuses a single comment while a review is pending, instead of publishing that review", async () => {
    const pendingRoute = routeJson();
    (pendingRoute.payload.pullRequestsChangesRoute as Record<string, unknown>).viewerPendingReview =
      { id: 9, comments: [] };
    const { fetchFn, requests } = fakeGitHub({
      [changesUrl]: json(pendingRoute),
      [postUrl]: json({ thread: {} }),
    });

    expect(await createGitHubBackend(pr, fetchFn).postComment(target, "x", "single")).toEqual(
      err({ kind: "pendingReviewConflict" }),
    );
    expect(requests.some((request) => request.url === postUrl)).toBe(false);
  });

  it("passes the thread GitHub returned on, so it can also be shown in GitHub own UI", async () => {
    const thread = { id: "77", subjectType: "line" };
    const { fetchFn } = fakeGitHub({
      [changesUrl]: json(routeJson()),
      [postUrl]: json({ thread }),
    });
    const onHostChanged = vi.fn();
    await createGitHubBackend(pr, fetchFn, { onHostChanged }).postComment(target, "x", "review");

    expect(onHostChanged).toHaveBeenCalledWith({
      kind: "threadCreated",
      target,
      mode: "review",
      thread,
    });
  });

  it("keeps a successful post successful even if showing it in GitHub UI fails", async () => {
    const { fetchFn } = fakeGitHub({
      [changesUrl]: json(routeJson()),
      [postUrl]: json({ thread: { id: "1" } }),
    });
    const onHostChanged = vi.fn().mockRejectedValue(new Error("bridge gone"));

    await expect(
      createGitHubBackend(pr, fetchFn, { onHostChanged }).postComment(target, "x", "single"),
    ).resolves.toEqual(ok(undefined));
  });

  it("reports the latest revision with the threads, so a stale view can be noticed", async () => {
    const { fetchFn } = fakeGitHub({ [changesUrl]: json(routeJson({}, {}, NEWER_HEAD)) });

    expect((await loadSnapshot(createGitHubBackend(pr, fetchFn))).revision).toEqual({
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

    await createGitHubBackend(pr, fetchFn).postComment(target, "x", "single");

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

    expect(
      await createGitHubBackend(pr, hangingFetch, { timeoutMs: 20 }).listChangedMarkdownFiles(),
    ).toEqual(err({ kind: "timeout" }));
  });

  it("reports other refusals with the HTTP status and GitHub's message", async () => {
    const { fetchFn } = fakeGitHub({
      [changesUrl]: json(routeJson()),
      [postUrl]: json({ message: "Forbidden" }, 403),
    });

    expect(await createGitHubBackend(pr, fetchFn).postComment(target, "x", "single")).toEqual(
      err({ kind: "rejected", detail: "HTTP 403: Forbidden" }),
    );
  });

  it("reports a post GitHub does not answer as a timeout", async () => {
    const hangingFetch = (_input: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      });

    expect(
      await createGitHubBackend(pr, hangingFetch, { timeoutMs: 20 }).postComment(
        target,
        "x",
        "review",
      ),
    ).toEqual(err({ kind: "timeout" }));
  });

  it("reports a post that cannot reach GitHub as a network failure", async () => {
    const offlineFetch = () => Promise.reject(new TypeError("Failed to fetch"));

    expect(await createGitHubBackend(pr, offlineFetch).postComment(target, "x", "review")).toEqual(
      err({ kind: "network" }),
    );
  });

  it("reports pull request data it cannot understand as an unexpected response", async () => {
    // e.g. GitHub answering with its sign-in page instead of JSON.
    const { fetchFn } = fakeGitHub({ [changesUrl]: () => new Response("<html></html>") });

    expect(await createGitHubBackend(pr, fetchFn).postComment(target, "x", "single")).toEqual(
      err({ kind: "unexpectedResponse" }),
    );
  });

  it("tells the viewer's diff layout setting from the page data", async () => {
    const route = routeJson();
    (route.payload.pullRequestsChangesRoute as Record<string, unknown>).user = {
      viewSettings: { splitPreference: "unified" },
    };
    const { fetchFn } = fakeGitHub({ [changesUrl]: json(route) });

    expect(await createGitHubBackend(pr, fetchFn).diffLayout()).toBe("unified");
  });

  it("does not know the diff layout when the page data cannot be loaded", async () => {
    const offlineFetch = () => Promise.reject(new TypeError("Failed to fetch"));

    expect(await createGitHubBackend(pr, offlineFetch).diffLayout()).toBeNull();
  });

  describe("threads", () => {
    const resolveUrl = "https://github.com/acme/docs/pull/7/page_data/resolve_thread";
    const unresolveUrl = "https://github.com/acme/docs/pull/7/page_data/unresolve_thread";
    const withThread = (extra: Record<string, unknown> = {}) =>
      routeJson(
        {
          "5": {
            id: 5,
            subjectType: "LINE",
            isResolved: false,
            viewerCanReply: true,
            commentsData: {
              comments: [
                { databaseId: 4115, body: "First", author: { login: "bob" } },
                { databaseId: 4116, body: "Second" },
              ],
            },
            ...extra,
          },
        },
        { R3: { threads: [{ id: 5 }] } },
      );

    async function loadThread(backend: ReviewBackend) {
      const [thread] = (await loadSnapshot(backend)).threads;
      if (!thread) throw new Error("no thread");
      return thread;
    }

    it("replies in a thread, pointing GitHub at the thread's last comment as GitHub's own reply box does", async () => {
      const { fetchFn, requests } = fakeGitHub({
        [changesUrl]: json(withThread()),
        [postUrl]: json({ thread: {} }),
      });
      const backend = createGitHubBackend(pr, fetchFn);

      const result = await backend.replyToThread(await loadThread(backend), "Agreed", "single");

      expect(result).toEqual(ok(undefined));
      const post = requests.find((request) => request.url === postUrl);
      expect(JSON.parse(String(post?.init?.body))).toEqual({
        text: "Agreed",
        submitBatch: true,
        inReplyTo: 4116,
        path: "docs/a.md",
      });
    });

    it("refuses a single reply while a review is pending, instead of publishing that review", async () => {
      const route = withThread();
      (route.payload.pullRequestsChangesRoute as Record<string, unknown>).viewerPendingReview = {
        id: 9,
        comments: [],
      };
      const { fetchFn, requests } = fakeGitHub({
        [changesUrl]: json(route),
        [postUrl]: json({ thread: {} }),
      });
      const backend = createGitHubBackend(pr, fetchFn);

      expect(await backend.replyToThread(await loadThread(backend), "x", "single")).toEqual(
        err({ kind: "pendingReviewConflict" }),
      );
      expect(requests.some((request) => request.url === postUrl)).toBe(false);
    });

    it("resolves a thread and opens it again through GitHub's endpoints", async () => {
      const done = json({ message: "ok" });
      const { fetchFn, requests } = fakeGitHub({
        [changesUrl]: json(withThread()),
        [resolveUrl]: done,
        [unresolveUrl]: done,
      });
      const backend = createGitHubBackend(pr, fetchFn);
      const thread = await loadThread(backend);

      expect(await backend.setThreadResolved(thread, true)).toEqual(ok(undefined));
      expect(await backend.setThreadResolved(thread, false)).toEqual(ok(undefined));

      const bodies = requests
        .filter((request) => request.url === resolveUrl || request.url === unresolveUrl)
        .map((request) => [request.url.split("/").pop(), JSON.parse(String(request.init?.body))]);
      expect(bodies).toEqual([
        ["resolve_thread", { threadId: "5" }],
        ["unresolve_thread", { threadId: "5" }],
      ]);
    });

    it("reports a thread GitHub refuses to resolve with the HTTP status", async () => {
      const { fetchFn } = fakeGitHub({ [changesUrl]: json(withThread()) });
      const backend = createGitHubBackend(pr, fetchFn);

      expect(await backend.setThreadResolved(await loadThread(backend), true)).toEqual(
        err({ kind: "rejected", detail: "HTTP 404" }),
      );
    });

    it("tells GitHub's own UI about a reply, with the thread GitHub returned", async () => {
      const returned = { id: "5", isResolved: false };
      const { fetchFn } = fakeGitHub({
        [changesUrl]: json(withThread()),
        [postUrl]: json({ thread: returned }),
      });
      const onHostChanged = vi.fn();
      const backend = createGitHubBackend(pr, fetchFn, { onHostChanged });

      await backend.replyToThread(await loadThread(backend), "Agreed", "single");

      expect(onHostChanged).toHaveBeenCalledWith({
        kind: "threadReplied",
        target: { path: "docs/a.md", side: "head", lines: { start: 3, end: 3 } },
        mode: "single",
        thread: returned,
      });
    });

    it("tells GitHub's own UI about a resolution once GitHub accepted it", async () => {
      const { fetchFn } = fakeGitHub({
        [changesUrl]: json(withThread()),
        [resolveUrl]: json({ message: "ok" }),
      });
      const onHostChanged = vi.fn();
      const backend = createGitHubBackend(pr, fetchFn, { onHostChanged });

      await backend.setThreadResolved(await loadThread(backend), true);

      expect(onHostChanged).toHaveBeenCalledWith({
        kind: "threadResolved",
        target: { path: "docs/a.md", side: "head", lines: { start: 3, end: 3 } },
        thread: { id: "5" },
        isResolved: true,
      });
    });

    it("tells whether the viewer may reply, assuming so when GitHub does not say", async () => {
      const { fetchFn: denied } = fakeGitHub({
        [changesUrl]: json(withThread({ viewerCanReply: false })),
      });
      const { fetchFn: unsaid } = fakeGitHub({
        [changesUrl]: json(withThread({ viewerCanReply: undefined })),
      });

      expect((await loadThread(createGitHubBackend(pr, denied))).canReply).toBe(false);
      expect((await loadThread(createGitHubBackend(pr, unsaid))).canReply).toBe(true);
    });
  });
});
