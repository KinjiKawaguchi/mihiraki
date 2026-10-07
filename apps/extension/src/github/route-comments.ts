import type { Reaction, ReactionKind, ReviewComment } from "@mihiraki/core";
import { asArray, asRecord, asString, pick } from "./json";

/** GitHub's name for each reaction (its `ReactionContent`). */
const REACTION_CONTENTS: Readonly<Record<ReactionKind, string>> = {
  thumbsUp: "THUMBS_UP",
  thumbsDown: "THUMBS_DOWN",
  laugh: "LAUGH",
  hooray: "HOORAY",
  confused: "CONFUSED",
  heart: "HEART",
  rocket: "ROCKET",
  eyes: "EYES",
};

const REACTION_KINDS: ReadonlyMap<string, ReactionKind> = new Map(
  Object.entries(REACTION_CONTENTS).map(([kind, content]) => [content, kind as ReactionKind]),
);

export function reactionContentOf(kind: ReactionKind): string {
  return REACTION_CONTENTS[kind];
}

/** Reactions somebody gave; GitHub lists every kind, with a count of zero for the rest. */
function toReactions(groups: unknown): Reaction[] {
  return asArray(groups).flatMap((group) => {
    const kind = REACTION_KINDS.get(asString(pick(group, "reaction", "content")) ?? "");
    const count = Number(pick(group, "totalCount"));
    if (!kind || !Number.isSafeInteger(count) || count <= 0) return [];
    return [{ kind, count, isByViewer: pick(group, "reaction", "viewerHasReacted") === true }];
  });
}

const PULL_REQUEST_URL = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/\d+/;

/** GitHub's "Reference in a new issue": a new issue in the same repository quoting the comment. */
function newIssueUrlOf(url: string, author: string, body: string): string | null {
  const match = PULL_REQUEST_URL.exec(url);
  if (!match) return null;
  const quote = body
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  const text = `${quote}\n\n_Originally posted by @${author} in ${url}_`;
  return `https://github.com/${match[1]}/${match[2]}/issues/new?body=${encodeURIComponent(text)}`;
}

/**
 * A review comment from a thread of the route data. `changeAuthor` is the login of the
 * pull request's author, for marking their comments.
 */
export function toComment(raw: unknown, changeAuthor: string | null): ReviewComment | null {
  const comment = asRecord(raw);
  const id = asString(comment?.databaseId) ?? asString(comment?.id);
  // Without an id a view could not tell comments apart.
  if (!comment || !id) return null;
  const login = asString(pick(comment, "author", "login"));
  const author = login ?? "unknown";
  const url = asString(comment.url) ?? "";
  const bodyMarkdown = asString(comment.body) ?? "";
  return {
    id,
    // Comments of an unsubmitted review are returned with `state: "pending"`.
    isPending: comment.state === "pending",
    author,
    avatarUrl: asString(pick(comment, "author", "avatarUrl")) ?? "",
    isByChangeAuthor: login !== null && login === changeAuthor,
    bodyHtml: asString(comment.bodyHTML) ?? "",
    bodyMarkdown,
    createdAt: asString(comment.createdAt) ?? "",
    url,
    reactions: toReactions(comment.reactionGroups),
    newIssueUrl: newIssueUrlOf(url, author, bodyMarkdown),
    version: asString(comment.bodyVersion),
    // Only what GitHub grants; its endpoints would refuse the rest anyway.
    canEdit: comment.viewerCanUpdate === true,
    canDelete: comment.viewerCanDelete === true,
    canReact: comment.viewerCanReact === true,
  };
}
