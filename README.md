# Mihiraki

Mihiraki（見開き）は、GitHubのPull Requestで、Markdownを**レンダリングしたまま左右分割で比較**し、その場で**レビューコメントを付ける**ためのツールです。

GitHub標準のrich diffは、変更前後を1つの文書に重ねたunified表示で、しかもコメントを付けられません。
このツールはbase/headをそれぞれ描画してブロック単位で左右に揃え、変更されたブロックの中は語単位（日本語は文字単位）で差分をハイライトします。
コメントはGitHubの通常のレビューコメントとして投稿されるので、PRの会話にそのまま残ります。
表示言語は、はじめはブラウザの言語設定に従います（日本語と英語。それ以外の言語では英語）。ツールバーのMihirakiのアイコンから、日本語か英語に固定することもできます。

[Chrome ウェブストアで入手](https://chromewebstore.google.com/detail/aonhhghpakchakdddehflcpdobnhofij)

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

1. [Chrome ウェブストア](https://chromewebstore.google.com/detail/aonhhghpakchakdddehflcpdobnhofij)から追加する（開発版を試すときは、`pnpm build:extension` のあと `chrome://extensions` の「パッケージ化されていない拡張機能を読み込む」で `apps/extension/.output/chrome-mv3` を選ぶ）
2. GitHubにログインした状態でPRの Files changed を開く
3. Markdownファイルの見出しにある、ソース/rich diffの切り替えでrich diffを選ぶ。GitHubの表示設定がSplitなら左右分割、Unifiedなら1列のレンダリング表示に置き換わり、どちらでもコメントできる（ソース表示に戻すと元に戻る）
4. ブロックにマウスを乗せると左端に「+」が出る。左（変更前）に付けたコメントは削除側、右（変更後）は追加側の行に付く
5. 既存のスレッドには、その下の「返信」「解決済みにする」から返信と解決ができる（解決済みのスレッドは折りたたまれ、見出しを押すと開いて「未解決に戻す」を選べる）
6. コメントの「…」メニューから、引用して返信、編集、削除ができる（編集と削除はGitHubが許可したコメントだけ）。リアクションはコメントの下のボタンで付け外しする

## 仕組みと制約

- **認証**: ログイン中のgithub.comのセッションで、GitHub自身のUIと同じ内部エンドポイントを呼ぶ。トークンは不要で、権限もGitHubの画面と同じになる。
  - `GET /:owner/:repo/pull/:n/changes`（JSON）: 比較対象のコミット、変更ファイル、レビュースレッド
  - `GET /:owner/:repo/blob/:sha/:path`: ファイルの生テキスト（ページに埋め込まれたJSONから取り出す）
  - `POST /:owner/:repo/pull/:n/page_data/create_review_comment`: コメント投稿（返信は `inReplyTo` にスレッドの最後のコメントのIDを付ける。GitHub自身の返信欄と同じ）
  - `POST /:owner/:repo/pull/:n/page_data/resolve_thread` / `unresolve_thread`: スレッドの解決と取り消し
  - `PUT /:owner/:repo/pull/:n/page_data/update_review_comment?body_version=…`: コメントの編集（編集を始めた時点の版を付け、その後にGitHubの画面で変わっていれば422で拒否される。GitHub自身の編集欄と同じ）
  - `DELETE /:owner/:repo/pull/:n/page_data/review_comments/:id`: コメントの削除
  - `POST /:owner/:repo/pull/:n/page_data/add_comment_reaction` / `remove_comment_reaction`: リアクションの付け外し
  - 非公開の仕様なので、GitHub側の変更で壊れうる。直す場所は `apps/extension/src/github/` に閉じている。
- **GitHub本体の表示との同期**: 拡張から投稿したコメント・返信、スレッドの解決、コメントの編集・削除・リアクションを、再読み込みせずにGitHub本体の表示（Submit reviewの件数、差分内のスレッド、ファイルツリーのコメント数、未解決の数）に反映する。GitHub本体で付いたコメントは分割ビューに反映する。
  - ページのmain worldで動く小さなスクリプト（`apps/extension/src/host-sync/`）が、Reactの内部構造から `PullRequestStoreProvider` と `LayoutStoreProvider` のZustandストアを見つける。そのうえで、GitHub自身がそれぞれの操作の後に呼ぶ更新関数（`addPendingComment` / `updateThread` / `onCommentThreadAdded` / `increment`・`decrementUnresolvedConversationCount` / `updateThreadComment` / `deleteThreadComment` / `onCommentThreadDeleted` など）を同じ引数で呼ぶ。
  - GitHub内部の仕様に依存するため、見つからない・形が違うときは何もせず、再読み込みを促す案内を出す方式に自動で戻る。
- **組み込み先のDOM**: ファイル枠 `div#diff-<パスのSHA-256>`、見出し `[data-diff-header-wrapper]`、切り替え `[data-component="SegmentedControl"]` だけに依存する（ハッシュ化されたクラス名は使わない）。前提は `apps/extension/src/inline/github-file-dom.ts` に集約している。GitHub側が変わったときは `apps/extension/harness/` のスクリプトをPlaywrightで注入して確かめられる。
- **配色**: github.com上ではGitHubのテーマ変数をそのまま使うので、dark dimmedやハイコントラストにも追従する。
- **描画**: markdown-itによる自前描画。GitHubとの差として、シンタックスハイライト、数式の描画、脚注には未対応。mermaidの図はGitHub自身と同じ描画サービス（viewscreen.githubusercontent.com）のフレームで描き、Splitでは変更前後を左右に並べる。相対パスの画像も表示されない。
- **コメント可能な行**: 変更されたファイルなら、差分のhunkの外の行にもコメントできる（github.comで確認）。
- **未検証**: 左側（変更前）への複数行コメント。

## 謝辞

GitHub内部エンドポイントの仕様は、[chienyuanchang/rich-diff-comments](https://github.com/chienyuanchang/rich-diff-comments)（MIT）の `docs/github/DEV_NOTES.md` を参考にしました。

## プライバシー

拡張機能はデータを収集せず、通信先はGitHub（github.com と、mermaidの図を描くGitHubの描画サービス）だけです。詳しくは [PRIVACY_POLICY.md](PRIVACY_POLICY.md) を参照してください。

## ライセンス

[MIT](LICENSE)
