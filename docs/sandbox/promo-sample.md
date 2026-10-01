# Session storage

A session expires after twenty-four hours without activity, and the
user has to sign in again. Sessions are kept in a single Redis primary,
so a failover drops every active session at once.

| Option         | Latency |
| -------------- | ------- |
| Redis          | 1 ms    |
| Managed KV     | 3 ms    |

セッションは、操作がないまま24時間たつと切れ、再ログインが必要になる。セッションは Redis のプライマリ1台に保存しているため、フェイルオーバーのたびにすべてのセッションが失われる。
