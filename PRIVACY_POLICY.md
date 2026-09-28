# Privacy Policy — Mihiraki for GitHub

Effective: September 28, 2026 ([日本語](#プライバシーポリシー--mihiraki-for-github))

Mihiraki for GitHub (the "extension") does not collect, store or share any personal data.

## What the extension does with data

- **Where it runs**: only on pages of `https://github.com`. It requests no browser permissions.
- **What it reads**: on a pull request's "Files changed" page, it reads the changed files, their contents and the review threads from github.com, using the GitHub session already signed in in your browser — the same requests GitHub's own page makes.
- **What it sends**: when you post a comment or reply, or resolve a thread, from the extension, it sends that to github.com, as GitHub's own comment form and Resolve button do. To draw a mermaid diagram in a Markdown file, it sends the diagram's code to `viewscreen.githubusercontent.com`, GitHub's rendering service, which GitHub's own rich diff uses for the same diagram. It sends nothing to the developer or to any other party.
- **What it stores**: nothing. It keeps no data on your device or elsewhere after you leave the page.
- **Tracking**: none. No analytics, advertising or telemetry.

## Images in the Markdown being reviewed

Images referenced by a Markdown file (for example `![](https://example.com/a.png)`) are loaded from the address written in the file when the extension shows it, as when the file is opened anywhere else. The site hosting such an image can see your IP address, as with any image on the web.

## Changes and contact

Changes to this policy are published in this file, and its history is kept in the repository. Questions: [open an issue](https://github.com/KinjiKawaguchi/mihiraki/issues).

---

# プライバシーポリシー — Mihiraki for GitHub

施行日: 2026年9月28日

Mihiraki for GitHub（以下「本拡張機能」）は、個人情報を収集・保存・共有しません。

## 本拡張機能によるデータの扱い

- **動作する場所**: `https://github.com` のページだけです。ブラウザの権限は要求しません。
- **読み取るもの**: プルリクエストの「Files changed」ページで、変更されたファイル、その内容、レビューのスレッドを github.com から読み取ります。ブラウザでサインイン済みのGitHubのセッションを使い、GitHub自身のページと同じリクエストを送ります。
- **送信するもの**: 本拡張機能からコメントや返信を投稿したり、スレッドを解決したりすると、GitHub自身のコメント欄や解決ボタンと同じように、その内容を github.com に送ります。Markdownファイル中のmermaidの図を描くときは、図のコードをGitHubの描画サービス `viewscreen.githubusercontent.com` に送ります。GitHub自身のrich diffが同じ図を描くときに使うサービスです。開発者やその他の第三者には何も送りません。
- **保存するもの**: ありません。ページを離れた後、端末にもどこにもデータを残しません。
- **追跡**: 行いません。アクセス解析、広告、テレメトリはありません。

## レビュー中のMarkdownに含まれる画像

Markdownファイルが参照している画像（例: `![](https://example.com/a.png)`）は、本拡張機能で表示するとき、ファイルに書かれたアドレスから読み込まれます。ほかの場所でそのファイルを開いた場合と同じです。画像を置いているサイトには、ウェブ上のほかの画像と同様に、あなたのIPアドレスが伝わります。

## 変更と問い合わせ

本ポリシーの変更はこのファイルで公開し、その履歴はリポジトリに残ります。お問い合わせは [issue](https://github.com/KinjiKawaguchi/mihiraki/issues) からお願いします。
