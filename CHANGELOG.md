# Changelog

## [0.2.0](https://github.com/KinjiKawaguchi/mihiraki/compare/v0.1.0...v0.2.0) (2026-09-28)


### Features

* draw mermaid diagrams as GitHub does, before and after side by side ([#32](https://github.com/KinjiKawaguchi/mihiraki/issues/32)) ([3bbc39e](https://github.com/KinjiKawaguchi/mihiraki/commit/3bbc39e2c95914752ae43115547488d948b91271))
* **extension:** GitHubのrich diffとSplit/Unified設定に合わせて表示を自動で切り替える ([#26](https://github.com/KinjiKawaguchi/mihiraki/issues/26)) ([e6687a6](https://github.com/KinjiKawaguchi/mihiraki/commit/e6687a615b8dbefbb77fd845b7533aaa2e2459c4))
* **ui:** 1列でもレンダリングしたまま差分を見てコメントできるビューを加える ([#25](https://github.com/KinjiKawaguchi/mihiraki/issues/25)) ([3daf8d8](https://github.com/KinjiKawaguchi/mihiraki/commit/3daf8d804a2a2492796643e810147d84220bb902))
* コメントを相対時刻、作成者バッジ、リアクション、操作メニュー付きで表示する ([#27](https://github.com/KinjiKawaguchi/mihiraki/issues/27)) ([19e7d65](https://github.com/KinjiKawaguchi/mihiraki/commit/19e7d65a88d4d3de51f064c8ceff092576712b43))


### Bug Fixes

* **extension:** start the review on in-page navigation to Files changed ([#28](https://github.com/KinjiKawaguchi/mihiraki/issues/28)) ([33657f2](https://github.com/KinjiKawaguchi/mihiraki/commit/33657f2f8260774e801b4d0037d93fa35738cda0))


### Performance

* **extension:** show the rendered view sooner after switching to rich diff ([#30](https://github.com/KinjiKawaguchi/mihiraki/issues/30)) ([db807b3](https://github.com/KinjiKawaguchi/mihiraki/commit/db807b3f45301b390af7d9e9e1ebe0734ff02e2e))
* keep the Markdown renderer out of the main-world bridge script ([#31](https://github.com/KinjiKawaguchi/mihiraki/issues/31)) ([093ff4b](https://github.com/KinjiKawaguchi/mihiraki/commit/093ff4b770e59ebcb4ce510da95567187724297e))

## 0.1.0 (2026-09-27)


### Features

* **core:** Markdownの左右分割diffとレビューの窓口を実装する ([fc377e8](https://github.com/KinjiKawaguchi/mihiraki/commit/fc377e81a4b7e0b526a07c605e5a0a1e595d1005))
* **core:** コメント入力のプレビュー用にMarkdown描画を公開する ([bba9eb1](https://github.com/KinjiKawaguchi/mihiraki/commit/bba9eb14adf7f63416bc3a22ac55be67c2529fd2))
* **core:** 保留中のレビューを表現し、コメント先を選んだ行のまま扱う ([023ad8d](https://github.com/KinjiKawaguchi/mihiraki/commit/023ad8d7ef7c8ccac022c96c15da46cbd7ffc4d5))
* **extension:** GitHubのFiles changedに分割表示を組み込む ([dd9a53e](https://github.com/KinjiKawaguchi/mihiraki/commit/dd9a53e7ba0298049fba1ad2b5654137040a4f64))
* **extension:** 保留中のレビューへの追加に対応する ([4378a2c](https://github.com/KinjiKawaguchi/mihiraki/commit/4378a2cce8bb7f5cac9dbf350c33874a1b745d70))
* **extension:** 投稿したコメントをGitHub本体の表示に同期する ([ff9fb42](https://github.com/KinjiKawaguchi/mihiraki/commit/ff9fb42f494bc08431eb13bf37b0f7d4d4fca578))
* **extension:** 見開きの本をかたどったアイコンを追加する ([#21](https://github.com/KinjiKawaguchi/mihiraki/issues/21)) ([7cace44](https://github.com/KinjiKawaguchi/mihiraki/commit/7cace44f955ed83cd5d190b30672b47ce6a09989))
* **ui:** GitHubと同じ手順でブロックを選んでコメントできるようにする ([76610c3](https://github.com/KinjiKawaguchi/mihiraki/commit/76610c35e36fed0db3edc5de43409a906183a372))
* **ui:** レンダリングしたまま左右分割でレビューする画面を実装する ([2027a0a](https://github.com/KinjiKawaguchi/mihiraki/commit/2027a0a07f903a0256129ac72423fe1e7ed7f592))
* 表示をブラウザの言語設定に合わせて日本語と英語で切り替える ([#20](https://github.com/KinjiKawaguchi/mihiraki/issues/20)) ([66743c9](https://github.com/KinjiKawaguchi/mihiraki/commit/66743c95b9ee1459258ca88101319133bde0b2e8))


### Bug Fixes

* **ci:** リリースPRのワークフローに自リポジトリの読み取り権限を与える ([#8](https://github.com/KinjiKawaguchi/mihiraki/issues/8)) ([3174429](https://github.com/KinjiKawaguchi/mihiraki/commit/31744294c02c9ff8ce305ca2b022318ca829ef89))
* **extension:** GitHubの画面に反映できなかったコメントがあるとき再読み込みを案内する ([#15](https://github.com/KinjiKawaguchi/mihiraki/issues/15)) ([046c40c](https://github.com/KinjiKawaguchi/mihiraki/commit/046c40c366bce729d88e8fbd41e4a2d82fba54c4))
* **extension:** リネームされたファイルの変更前の版を読み込めるようにする ([#16](https://github.com/KinjiKawaguchi/mihiraki/issues/16)) ([3208491](https://github.com/KinjiKawaguchi/mihiraki/commit/3208491a998e67934c11a4c4aa32f530d9d00540))
* **extension:** 停止後に予約済みの同期が走り、ページを装飾し直す問題を直す ([#11](https://github.com/KinjiKawaguchi/mihiraki/issues/11)) ([ae32184](https://github.com/KinjiKawaguchi/mihiraki/commit/ae321848c9849855aaebbdb6605d535a0b6c0e36))
* PR更新後にコメントが別の行へ付く問題と、送信・再取得・起動の競合を直す ([#10](https://github.com/KinjiKawaguchi/mihiraki/issues/10)) ([3a98f30](https://github.com/KinjiKawaguchi/mihiraki/commit/3a98f30e2338b17477e98fdda08a2928e7fc5909))
* **ui:** 「+」へ移動する途中でホバーが外れて押せない問題を直す ([bc4def8](https://github.com/KinjiKawaguchi/mihiraki/commit/bc4def804f914f880d686a2ecc898f539df5e518))
* **ui:** 行番号をGitHubと同じL/R表記にする ([2555db9](https://github.com/KinjiKawaguchi/mihiraki/commit/2555db90050346508fd016e70d6d2b43e5777fca))
* 保留中のレビューがある間は単発コメントを送らない ([5fe274c](https://github.com/KinjiKawaguchi/mihiraki/commit/5fe274c6acd58fe1e145ee8d4b3d22cf173a415e))


### Refactoring

* **core:** 差分計算から型の嘘と黙った既定値をなくし、壊れたタグ分割を直す ([#18](https://github.com/KinjiKawaguchi/mihiraki/issues/18)) ([871614c](https://github.com/KinjiKawaguchi/mihiraki/commit/871614cb76d5668ffc691e1c57fa8f62264b1fa0))
* **ui:** 入力欄と「+」ボタンを小さな部品に分ける ([2853510](https://github.com/KinjiKawaguchi/mihiraki/commit/28535107f034d88b4d72bcb45310bdf8b0a82dfe))
* **ui:** 未読み込みのスレッド状態を1つの値にまとめ、ファイルごとに再マウントする ([#19](https://github.com/KinjiKawaguchi/mihiraki/issues/19)) ([2654478](https://github.com/KinjiKawaguchi/mihiraki/commit/2654478e8527b488c4d24bed5c2d1bd6f96d7911))
* コメント投稿の想定内の失敗を例外ではなく種類付きの値で返す ([#13](https://github.com/KinjiKawaguchi/mihiraki/issues/13)) ([c35c2a2](https://github.com/KinjiKawaguchi/mihiraki/commit/c35c2a2e394ab2be48d56bb405aa58c9682ec40b))
* ドメイン型で不正な状態を表せないようにし、語彙を base/head に揃える ([#12](https://github.com/KinjiKawaguchi/mihiraki/issues/12)) ([8ea059a](https://github.com/KinjiKawaguchi/mihiraki/commit/8ea059a5933502632dde0cc03782b0d422a6311e))
* プロダクト名を Mihiraki に改める ([#4](https://github.com/KinjiKawaguchi/mihiraki/issues/4)) ([4646101](https://github.com/KinjiKawaguchi/mihiraki/commit/46461019723fe53554bac03331c5709e7e3ffa3f))
* 保留中をコメント単位で持ち、取り込み時の検証とIDの扱いを厳密にする ([#17](https://github.com/KinjiKawaguchi/mihiraki/issues/17)) ([3100119](https://github.com/KinjiKawaguchi/mihiraki/commit/31001194bd9c0beb406ca2ea0bda96c00c96a5d2))
* 読み込みの想定内の失敗も種類付きの値で返し、文言をUIに寄せる ([#14](https://github.com/KinjiKawaguchi/mihiraki/issues/14)) ([75805ab](https://github.com/KinjiKawaguchi/mihiraki/commit/75805abb606f3428fdbf0894be6dbfa140ebac76))
