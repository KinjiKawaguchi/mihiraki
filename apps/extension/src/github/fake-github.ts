import type { ReviewBackend, ReviewThread } from "@mihiraki/core";

/*
 * A stand-in for github.com in tests of the GitHub adapter: route data shaped as
 * observed on github.com (2026-09) and a fetch that records requests.
 */

export const pr = { owner: "acme", repo: "docs", number: 7 };
export const BASE = "b".repeat(40);
export const HEAD = "c".repeat(40);

export const changesUrl = "https://github.com/acme/docs/pull/7/changes";
export const postUrl = "https://github.com/acme/docs/pull/7/page_data/create_review_comment";

export function routeJson(
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

/** Route data with one thread "5" on line 3 of docs/a.md, holding comments 4115 and 4116. */
export function routeWithThread(extra: Record<string, unknown> = {}) {
  return routeJson(
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
}

export interface RecordedRequest {
  readonly url: string;
  readonly init: RequestInit | undefined;
}

export function fakeGitHub(handlers: Record<string, () => Response>) {
  const requests: RecordedRequest[] = [];
  const fetchFn = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    requests.push({ url, init });
    const handler = handlers[url];
    return handler ? handler() : new Response("not found", { status: 404 });
  };
  return { fetchFn, requests };
}

export const json =
  (value: unknown, status = 200) =>
  () =>
    new Response(JSON.stringify(value), { status });

export async function loadSnapshot(backend: ReviewBackend) {
  const loaded = await backend.loadThreads();
  if (!loaded.ok) throw new Error(`Unexpected failure: ${loaded.error.kind}`);
  return loaded.value;
}

export async function loadThread(backend: ReviewBackend): Promise<ReviewThread> {
  const [thread] = (await loadSnapshot(backend)).threads;
  if (!thread) throw new Error("no thread");
  return thread;
}
