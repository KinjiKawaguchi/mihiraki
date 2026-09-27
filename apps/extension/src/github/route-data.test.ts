import { describe, expect, it } from 'vitest';
import { parseRouteData } from './route-data';

const response = {
  payload: {
    pullRequestsChangesRoute: {
      comparison: { fullDiff: { baseOid: 'b'.repeat(40), headOid: 'h'.repeat(40) } },
      diffSummaries: [
        {
          path: 'docs/design.md',
          changeType: 'MODIFIED',
          markersMap: {
            R12: { threads: [{ id: 101 }], annotations: [] },
            R68: { threads: [{ id: 102, start: 'R57' }] },
            L4: { threads: [{ id: 103 }] },
          },
        },
        { path: 'src/app.ts', changeType: 'MODIFIED', markersMap: {} },
        { path: 'docs/new.markdown', changeType: 'ADDED' },
      ],
      markers: {
        threads: {
          '101': {
            id: 101,
            subjectType: 'LINE',
            isResolved: false,
            commentsData: {
              comments: [
                {
                  databaseId: 9001,
                  author: { login: 'alice', avatarUrl: 'https://avatars.example/alice' },
                  bodyHTML: '<p>Why?</p>',
                  createdAt: '2026-09-01T00:00:00Z',
                  url: 'https://github.com/acme/docs/pull/1#discussion_r9001',
                },
              ],
            },
          },
          '102': { id: 102, subjectType: 'LINE', isResolved: true, commentsData: { comments: [] } },
          '103': {
            id: 103,
            subjectType: 'LINE',
            isResolved: false,
            isOutdated: true,
            commentsData: { comments: [{ databaseId: 9003, state: 'pending', author: { login: 'me' }, bodyHTML: '<p>draft</p>' }] },
          },
          '104': { id: 104, subjectType: 'FILE', isResolved: false, commentsData: { comments: [] } },
        },
      },
    },
  },
};

describe('parseRouteData', () => {
  it('reads the commits being compared', () => {
    const route = parseRouteData(response);

    expect(route.baseOid).toBe('b'.repeat(40));
    expect(route.headOid).toBe('h'.repeat(40));
  });

  it('lists changed files with their change type', () => {
    expect(parseRouteData(response).files).toEqual([
      { path: 'docs/design.md', previousPath: null, changeType: 'MODIFIED' },
      { path: 'src/app.ts', previousPath: null, changeType: 'MODIFIED' },
      { path: 'docs/new.markdown', previousPath: null, changeType: 'ADDED' },
    ]);
  });

  it('locates line threads through the markers map', () => {
    const threads = parseRouteData(response).threads;

    expect(threads.map((t) => [t.id, t.path, t.side, t.line, t.startLine, t.isResolved, t.isOutdated])).toEqual([
      ['101', 'docs/design.md', 'RIGHT', 12, null, false, false],
      ['102', 'docs/design.md', 'RIGHT', 68, 57, true, false],
      ['103', 'docs/design.md', 'LEFT', 4, null, false, true],
    ]);
  });

  it('marks threads whose comments belong to an unsubmitted review as pending', () => {
    const threads = parseRouteData(response).threads;

    expect(threads.map((t) => [t.id, t.isPending])).toEqual([
      ['101', false],
      ['102', false],
      ['103', true],
    ]);
  });

  it('maps comment authors and rendered bodies', () => {
    const [first] = parseRouteData(response).threads;

    expect(first?.comments).toEqual([
      {
        id: '9001',
        author: 'alice',
        avatarUrl: 'https://avatars.example/alice',
        bodyHtml: '<p>Why?</p>',
        createdAt: '2026-09-01T00:00:00Z',
        url: 'https://github.com/acme/docs/pull/1#discussion_r9001',
      },
    ]);
  });

  it('rejects a response without the comparison commits', () => {
    expect(() => parseRouteData({ payload: {} })).toThrow(/pull request/);
  });
});
