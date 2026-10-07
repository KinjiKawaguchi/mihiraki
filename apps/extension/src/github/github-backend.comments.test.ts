import { err, ok, type ReviewBackend } from "@mihiraki/core";
import { describe, expect, it, vi } from "vitest";
import {
  changesUrl,
  fakeGitHub,
  json,
  loadThread,
  pr,
  type RecordedRequest,
  routeWithThread,
} from "./fake-github";
import { createGitHubBackend } from "./github-backend";

const pageData = (route: string) => `https://github.com/acme/docs/pull/7/page_data/${route}`;
const editUrl = (version: string) => pageData(`update_review_comment?body_version=${version}`);
const deleteUrl = pageData("review_comments/4116");
const addReactionUrl = pageData("add_comment_reaction");
const removeReactionUrl = pageData("remove_comment_reaction");
const position = { path: "docs/a.md", side: "head", lines: { start: 3, end: 3 } };

const versionedRoute = () =>
  routeWithThread({
    commentsData: {
      comments: [
        { databaseId: 4115, body: "First", bodyVersion: "v1" },
        { databaseId: 4116, body: "Second" },
      ],
    },
  });

const edited = {
  bodyVersion: "v2",
  commentDatabaseId: 4115,
  threadId: "5",
  body: "Fixed",
  bodyHTML: "<p>Fixed</p>",
};
const reactionGroups = [{ reaction: { content: "HEART", viewerHasReacted: true }, totalCount: 1 }];

async function loadComments(backend: ReviewBackend) {
  const thread = await loadThread(backend);
  const [first, second] = thread.comments;
  if (!first || !second) throw new Error("missing comments");
  return { thread, first, second };
}

function sent(requests: readonly RecordedRequest[], url: string) {
  const request = requests.find((candidate) => candidate.url === url);
  return { method: request?.init?.method, body: JSON.parse(String(request?.init?.body ?? null)) };
}

describe("changing comments on GitHub", () => {
  it("edits a comment from the version it was loaded at, as GitHub's own edit form does", async () => {
    const { fetchFn, requests } = fakeGitHub({
      [changesUrl]: json(versionedRoute()),
      [editUrl("v1")]: json(edited),
    });
    const backend = createGitHubBackend(pr, fetchFn);
    const { thread, first } = await loadComments(backend);

    expect(await backend.editComment(thread, first, "Fixed")).toEqual(ok(undefined));
    expect(sent(requests, editUrl("v1"))).toEqual({
      method: "PUT",
      body: { body: "Fixed", commentId: "4115" },
    });
  });

  it("edits a comment GitHub gave no version for without naming one", async () => {
    const url = pageData("update_review_comment");
    const { fetchFn } = fakeGitHub({ [changesUrl]: json(routeWithThread()), [url]: json(edited) });
    const backend = createGitHubBackend(pr, fetchFn);
    const { thread, first } = await loadComments(backend);

    expect(await backend.editComment(thread, first, "Fixed")).toEqual(ok(undefined));
  });

  it("reports an edit of a comment changed since it was loaded as a conflict", async () => {
    const stale = {
      error:
        "This comment has been updated since you started editing. Please reload the page and try again.",
    };
    const { fetchFn } = fakeGitHub({
      [changesUrl]: json(versionedRoute()),
      [editUrl("v1")]: json(stale, 422),
    });
    const backend = createGitHubBackend(pr, fetchFn);
    const { thread, first } = await loadComments(backend);

    expect(await backend.editComment(thread, first, "Fixed")).toEqual(
      err({ kind: "editConflict" }),
    );
  });

  it("reports other refusals of an edit with the HTTP status", async () => {
    const { fetchFn } = fakeGitHub({
      [changesUrl]: json(versionedRoute()),
      [editUrl("v1")]: json({ error: "Forbidden" }, 403),
    });
    const backend = createGitHubBackend(pr, fetchFn);
    const { thread, first } = await loadComments(backend);

    expect(await backend.editComment(thread, first, "Fixed")).toEqual(
      err({ kind: "rejected", detail: "HTTP 403" }),
    );
  });

  it("deletes a comment by its database id", async () => {
    const { fetchFn, requests } = fakeGitHub({
      [changesUrl]: json(routeWithThread()),
      [deleteUrl]: () => new Response(null, { status: 204 }),
    });
    const backend = createGitHubBackend(pr, fetchFn);
    const { thread, second } = await loadComments(backend);

    expect(await backend.deleteComment(thread, second)).toEqual(ok(undefined));
    expect(sent(requests, deleteUrl)).toEqual({ method: "DELETE", body: null });
  });

  it("adds and removes a reaction, naming it as GitHub does", async () => {
    const { fetchFn, requests } = fakeGitHub({
      [changesUrl]: json(routeWithThread()),
      [addReactionUrl]: json({ reactionGroups }),
      [removeReactionUrl]: json({ reactionGroups: [] }),
    });
    const backend = createGitHubBackend(pr, fetchFn);
    const { thread, first } = await loadComments(backend);

    expect(await backend.setReaction(thread, first, "heart", true)).toEqual(ok(undefined));
    expect(await backend.setReaction(thread, first, "thumbsUp", false)).toEqual(ok(undefined));
    expect(sent(requests, addReactionUrl)).toEqual({
      method: "POST",
      body: { reaction: "HEART", commentId: 4115 },
    });
    expect(sent(requests, removeReactionUrl).body).toEqual({
      reaction: "THUMBS_UP",
      commentId: 4115,
    });
  });
});

describe("showing comment changes in GitHub's own UI", () => {
  it("passes on the text and version GitHub returned for an edit", async () => {
    const { fetchFn } = fakeGitHub({
      [changesUrl]: json(versionedRoute()),
      [editUrl("v1")]: json(edited),
    });
    const onHostChanged = vi.fn();
    const backend = createGitHubBackend(pr, fetchFn, { onHostChanged });
    const { thread, first } = await loadComments(backend);

    await backend.editComment(thread, first, "Fixed");

    expect(onHostChanged).toHaveBeenCalledWith({
      kind: "commentEdited",
      target: position,
      thread: { id: "5" },
      commentId: 4115,
      comment: { body: "Fixed", bodyHTML: "<p>Fixed</p>", bodyVersion: "v2" },
    });
  });

  it("passes on a deletion", async () => {
    const { fetchFn } = fakeGitHub({
      [changesUrl]: json(routeWithThread()),
      [deleteUrl]: () => new Response(null, { status: 204 }),
    });
    const onHostChanged = vi.fn();
    const backend = createGitHubBackend(pr, fetchFn, { onHostChanged });
    const { thread, second } = await loadComments(backend);

    await backend.deleteComment(thread, second);

    expect(onHostChanged).toHaveBeenCalledWith({
      kind: "commentDeleted",
      target: position,
      thread: { id: "5" },
      commentId: 4116,
    });
  });

  it("passes on the reactions GitHub returned", async () => {
    const { fetchFn } = fakeGitHub({
      [changesUrl]: json(routeWithThread()),
      [addReactionUrl]: json({ reactionGroups }),
    });
    const onHostChanged = vi.fn();
    const backend = createGitHubBackend(pr, fetchFn, { onHostChanged });
    const { thread, first } = await loadComments(backend);

    await backend.setReaction(thread, first, "heart", true);

    expect(onHostChanged).toHaveBeenCalledWith({
      kind: "reactionsChanged",
      target: position,
      thread: { id: "5" },
      commentId: 4115,
      reactionGroups,
    });
  });

  it("tells GitHub's UI nothing when GitHub refused the change", async () => {
    const { fetchFn } = fakeGitHub({ [changesUrl]: json(routeWithThread()) });
    const onHostChanged = vi.fn();
    const backend = createGitHubBackend(pr, fetchFn, { onHostChanged });
    const { thread, second } = await loadComments(backend);

    expect(await backend.deleteComment(thread, second)).toEqual(
      err({ kind: "rejected", detail: "HTTP 404" }),
    );
    expect(onHostChanged).not.toHaveBeenCalled();
  });
});
