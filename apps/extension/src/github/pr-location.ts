export interface PullRequestLocation {
  readonly owner: string;
  readonly repo: string;
  readonly number: number;
}

const PULL_REQUEST_PATH = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\/|$)/;

export function parsePullRequestLocation(href: string): PullRequestLocation | null {
  const url = new URL(href);
  if (url.hostname !== "github.com") return null;
  const match = PULL_REQUEST_PATH.exec(url.pathname);
  if (!match?.[1] || !match[2] || !match[3]) return null;
  return { owner: match[1], repo: match[2], number: Number(match[3]) };
}

export function pullRequestUrl(pr: PullRequestLocation, suffix: string): string {
  return `https://github.com/${encodeURIComponent(pr.owner)}/${encodeURIComponent(pr.repo)}/pull/${pr.number}/${suffix}`;
}

const FILES_TAB_PATH = /^\/[^/]+\/[^/]+\/pull\/\d+\/(?:changes|files)(?:\/|$)/;

/** The Files changed tab, at its current (`/changes`) or legacy (`/files`) URL. */
export function isFilesTab(href: string): boolean {
  const url = new URL(href);
  return url.hostname === "github.com" && FILES_TAB_PATH.test(url.pathname);
}
