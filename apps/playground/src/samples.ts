import type { ReviewThread } from "@mihiraki/core";
import type { MemoryFile } from "@mihiraki/core/memory";

const designDocBase = `---
title: キャッシュ設計
status: draft
---

# キャッシュ設計

## 背景

APIの応答が遅いため、読み取り結果をキャッシュする。
キャッシュの有効期限は10分とする。

## 方針

- Redisを使う
- キーは \`user:{id}\` 形式
- 失効はTTLに任せる

| 項目 | 値 |
|---|---|
| TTL | 600秒 |
| 最大サイズ | 1GB |

\`\`\`ts
const ttlSeconds = 600;
\`\`\`

## 未決事項

特になし。
`;

const designDocHead = `---
title: キャッシュ設計
status: review
---

# キャッシュ設計

## 背景

APIの応答が遅いため、読み取り結果をキャッシュする。
キャッシュの有効期限は5分とし、設定で変更できるようにする。

> [!NOTE]
> 有効期限は負荷試験の結果を見て再調整する。

## 方針

- Redisを使う
- キーは \`user:{id}:v2\` 形式
- 失効はTTLに任せる
- 更新時は明示的に削除する

| 項目 | 値 |
|---|---|
| TTL | 300秒 |
| 最大サイズ | 1GB |

\`\`\`ts
const ttlSeconds = Number(process.env.CACHE_TTL ?? 300);
\`\`\`
`;

const readmeBase = `# Project

Install with npm.
`;

const readmeHead = `# Project

Install with pnpm. Node 24 or later is required.

## Usage

Run \`pnpm dev\`.
`;

export const sampleFiles: Readonly<Record<string, MemoryFile>> = {
  "docs/cache-design.md": { base: designDocBase, head: designDocHead },
  "README.md": { base: readmeBase, head: readmeHead },
};

export const sampleThreads: readonly ReviewThread[] = [
  {
    id: "sample-1",
    path: "docs/cache-design.md",
    side: "head",
    lines: { start: 10, end: 11 },
    isResolved: false,
    isOutdated: false,
    canReply: true,
    comments: [
      {
        id: "sample-1-1",
        isPending: false,
        author: "reviewer",
        avatarUrl: "",
        bodyHtml: "<p>5分にした根拠を書いておいてほしいです。</p>",
        createdAt: "2026-09-26T10:00:00Z",
        url: "",
        isByChangeAuthor: false,
        bodyMarkdown: "",
        reactions: [],
        newIssueUrl: null,
      },
    ],
  },
];
