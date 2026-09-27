# Mihiraki

Mihiraki（見開き）は、GitHubのPull Requestで、Markdownを**レンダリングしたまま左右分割で比較**し、その場で**レビューコメントを付ける**ためのツールです。

GitHub標準のrich diffは、変更前後を1つの文書に重ねたunified表示で、しかもコメントを付けられません。
このツールはbase/headをそれぞれ描画してブロック単位で左右に揃え、変更されたブロックの中は語単位（日本語は文字単位）で差分をハイライトします。
コメントはGitHubの通常のレビューコメントとして投稿されるので、PRの会話にそのまま残ります。
表示言語はブラウザの言語設定に従います（日本語と英語。それ以外の言語では英語）。

## 構成

| パス | 役割 |
|---|---|
| `packages/core` | プラットフォーム非依存の中核。Markdown→行範囲付きブロック、左右の整列、HTMLを壊さない差分、スレッドの配置、`ReviewBackend`（アダプタが実装する窓口） |
| `packages/ui` | Preact製の分割ビュー（`ReviewApp` / `SplitReview`） |
| `apps/extension` | Chrome拡張（WXT, MV3）。GitHubアダプタと、Files changed への組み込み |
| `apps/playground` | メモリ上のバックエンドで動く開発用ページ |

ローカルアプリやWebアプリは、`ReviewBackend` を実装すれば `core` と `ui` をそのまま使えます。

## 開発

```sh
pnpm install
pnpm test               # 全パッケージのテスト
pnpm test:e2e           # ホバーやドラッグなど、実際のレイアウトに依存する操作をブラウザで確認（初回は npx playwright install chromium-headless-shell）
pnpm typecheck
pnpm dev:playground     # http://localhost:5178 でサンプル文書を表示
pnpm build:extension    # apps/extension/.output/chrome-mv3 に出力
```

## 拡張の使い方

1. `pnpm build:extension` を実行する
2. `chrome://extensions` で「デベロッパーモード」を有効にし、「パッケージ化されていない拡張機能を読み込む」で `apps/extension/.output/chrome-mv3` を選ぶ
3. GitHubにログインした状態でPRの Files changed を開く
4. Markdownファイルの見出しにある、ソース/rich diff切り替えの隣の「分割」を押す。そのファイルの差分が左右分割のレンダリング表示に置き換わる（もう一度押すと元に戻る）
5. ブロックにマウスを乗せると左端に「+」が出る。左（変更前）に付けたコメントは削除側、右（変更後）は追加側の行に付く

## 仕組みと制約

- **認証**: ログイン中のgithub.comのセッションで、GitHub自身のUIと同じ内部エンドポイントを呼ぶ。トークンは不要で、権限もGitHubの画面と同じになる。
  - `GET /:owner/:repo/pull/:n/changes`（JSON）: 比較対象のコミット、変更ファイル、レビュースレッド
  - `GET /:owner/:repo/blob/:sha/:path`: ファイルの生テキスト（ページに埋め込まれたJSONから取り出す）
  - `POST /:owner/:repo/pull/:n/page_data/create_review_comment`: コメント投稿
  - 非公開の仕様なので、GitHub側の変更で壊れうる。直す場所は `apps/extension/src/github/` に閉じている。
- **GitHub本体の表示との同期**: 拡張から投稿したコメントを、再読み込みせずにGitHub本体の表示（Submit reviewの件数、差分内のスレッド、ファイルツリーのコメント数）に反映する。GitHub本体で付いたコメントは分割ビューに反映する。
  - ページのmain worldで動く小さなスクリプト（`apps/extension/src/host-sync/`）が、Reactの内部構造から `PullRequestStoreProvider` と `LayoutStoreProvider` のZustandストアを見つける。そのうえで、GitHub自身がコメント投稿後に呼ぶ更新関数（`addPendingComment` / `updateThread` / `onCommentThreadAdded` / `incrementUnresolvedConversationCount`）を同じ引数で呼ぶ。
  - GitHub内部の仕様に依存するため、見つからない・形が違うときは何もせず、再読み込みを促す案内を出す方式に自動で戻る。
- **組み込み先のDOM**: ファイル枠 `div#diff-<パスのSHA-256>`、見出し `[data-diff-header-wrapper]`、切り替え `[data-component="SegmentedControl"]` だけに依存する（ハッシュ化されたクラス名は使わない）。前提は `apps/extension/src/inline/github-file-dom.ts` に集約している。GitHub側が変わったときは `apps/extension/harness/` のスクリプトをPlaywrightで注入して確かめられる。
- **配色**: github.com上ではGitHubのテーマ変数をそのまま使うので、dark dimmedやハイコントラストにも追従する。
- **描画**: markdown-itによる自前描画。GitHubとの差として、シンタックスハイライト、mermaid・数式の描画、脚注には未対応。相対パスの画像も表示されない。
- **コメント可能な行**: 変更されたファイルなら、差分のhunkの外の行にもコメントできる（github.comで確認）。
- **未検証**: 左側（変更前）への複数行コメント。

## 謝辞

GitHub内部エンドポイントの仕様は、[chienyuanchang/rich-diff-comments](https://github.com/chienyuanchang/rich-diff-comments)（MIT）の `docs/github/DEV_NOTES.md` を参考にしました。

## プライバシー

拡張機能はデータを収集せず、通信先は github.com だけです。詳しくは [PRIVACY_POLICY.md](PRIVACY_POLICY.md) を参照してください。

## ライセンス

[MIT](LICENSE)
