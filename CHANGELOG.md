# Changelog

## [0.2.0](https://github.com/KinjiKawaguchi/better-gh-md/compare/v0.1.0...v0.2.0) (2026-09-27)


### Features

* **core:** Markdownの左右分割diffとレビューの窓口を実装する ([fc377e8](https://github.com/KinjiKawaguchi/better-gh-md/commit/fc377e81a4b7e0b526a07c605e5a0a1e595d1005))
* **core:** コメント入力のプレビュー用にMarkdown描画を公開する ([bba9eb1](https://github.com/KinjiKawaguchi/better-gh-md/commit/bba9eb14adf7f63416bc3a22ac55be67c2529fd2))
* **core:** 保留中のレビューを表現し、コメント先を選んだ行のまま扱う ([023ad8d](https://github.com/KinjiKawaguchi/better-gh-md/commit/023ad8d7ef7c8ccac022c96c15da46cbd7ffc4d5))
* **extension:** GitHubのFiles changedに分割表示を組み込む ([dd9a53e](https://github.com/KinjiKawaguchi/better-gh-md/commit/dd9a53e7ba0298049fba1ad2b5654137040a4f64))
* **extension:** 保留中のレビューへの追加に対応する ([4378a2c](https://github.com/KinjiKawaguchi/better-gh-md/commit/4378a2cce8bb7f5cac9dbf350c33874a1b745d70))
* **extension:** 投稿したコメントをGitHub本体の表示に同期する ([ff9fb42](https://github.com/KinjiKawaguchi/better-gh-md/commit/ff9fb42f494bc08431eb13bf37b0f7d4d4fca578))
* **ui:** GitHubと同じ手順でブロックを選んでコメントできるようにする ([76610c3](https://github.com/KinjiKawaguchi/better-gh-md/commit/76610c35e36fed0db3edc5de43409a906183a372))
* **ui:** レンダリングしたまま左右分割でレビューする画面を実装する ([2027a0a](https://github.com/KinjiKawaguchi/better-gh-md/commit/2027a0a07f903a0256129ac72423fe1e7ed7f592))


### Bug Fixes

* **ui:** 「+」へ移動する途中でホバーが外れて押せない問題を直す ([bc4def8](https://github.com/KinjiKawaguchi/better-gh-md/commit/bc4def804f914f880d686a2ecc898f539df5e518))
* **ui:** 行番号をGitHubと同じL/R表記にする ([2555db9](https://github.com/KinjiKawaguchi/better-gh-md/commit/2555db90050346508fd016e70d6d2b43e5777fca))
* 保留中のレビューがある間は単発コメントを送らない ([5fe274c](https://github.com/KinjiKawaguchi/better-gh-md/commit/5fe274c6acd58fe1e145ee8d4b3d22cf173a415e))


### Refactoring

* **ui:** 入力欄と「+」ボタンを小さな部品に分ける ([2853510](https://github.com/KinjiKawaguchi/better-gh-md/commit/28535107f034d88b4d72bcb45310bdf8b0a82dfe))
