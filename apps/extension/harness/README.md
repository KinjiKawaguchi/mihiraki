# harness

拡張と同じ組み込み処理を、拡張の外で動く1本のスクリプトにしたものです。
PlaywrightなどでログインしたGitHubのページに注入し、実際のDOMに対する挙動を確かめるために使います。

```sh
pnpm --filter @better-gh-md/extension build:harness   # harness/dist/harness.js
```

GitHubのCSPはインラインスクリプトを禁止しているため、注入の前にCDPの `Page.setBypassCSP` でCSPを無効にしてからページを再読み込みします。
