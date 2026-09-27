import type { ChangedFile, ReviewBackend } from '@better-gh-md/core';
import { buildCreateCommentPayload } from './comment-payload';
import { fetchFileSource, fetchRouteData, postReviewComment, type FetchFn } from './github-client';
import type { PullRequestLocation } from './pr-location';
import type { RouteData } from './route-data';

const MARKDOWN_PATH = /\.(?:md|markdown)$/i;

/**
 * ReviewBackend for a github.com pull request. Uses the same internal endpoints and
 * session cookies as GitHub's own UI, so no token is needed and permissions match.
 */
export function createGitHubBackend(
  pr: PullRequestLocation,
  fetchFn: FetchFn = (input, init) => fetch(input, init),
): ReviewBackend {
  let cachedRoute: Promise<RouteData> | null = null;

  const refreshRoute = (): Promise<RouteData> => {
    const request = fetchRouteData(fetchFn, pr);
    cachedRoute = request;
    request.catch(() => {
      if (cachedRoute === request) cachedRoute = null;
    });
    return request;
  };
  const currentRoute = (): Promise<RouteData> => cachedRoute ?? refreshRoute();

  return {
    listChangedMarkdownFiles: async () => (await currentRoute()).files.filter((file) => MARKDOWN_PATH.test(file.path)),

    loadFileVersions: async (file: ChangedFile) => {
      const { baseOid, headOid } = await currentRoute();
      const [base, head] = await Promise.all([
        file.changeType === 'ADDED' ? '' : fetchFileSource(fetchFn, pr, baseOid, file.previousPath ?? file.path),
        file.changeType === 'REMOVED' ? '' : fetchFileSource(fetchFn, pr, headOid, file.path),
      ]);
      return { base, head };
    },

    // Always refetched so comments posted elsewhere (or just now) show up.
    loadThreads: async () => (await refreshRoute()).threads,

    postComment: async (target, body, mode) => {
      const payload = buildCreateCommentPayload(target, body, await currentRoute(), mode);
      await postReviewComment(fetchFn, pr, target, payload);
    },
  };
}
