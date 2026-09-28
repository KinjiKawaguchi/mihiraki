# Session storage

## Session lifetime

| Role  | Idle timeout | Max lifetime |
| ----- | ------------ | ------------ |
| User  | **30 min**   | 12 h         |
| Admin | **30 min**   | 12 h         |

- The store is chosen in [ADR-012](../adr/012-session-store.md).
- Tokens are rotated by `session.refresh()`.
