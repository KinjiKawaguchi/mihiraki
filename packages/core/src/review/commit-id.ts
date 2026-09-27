declare const commitIdBrand: unique symbol;

/** A commit hash. A distinct type, so it cannot be mixed up with a path or another string. */
export type CommitId = string & { readonly [commitIdBrand]: true };

/** Abbreviated (7+) or full hashes, SHA-1 (40) or SHA-256 (64), as git prints them. */
const COMMIT_ID = /^[0-9a-f]{7,64}$/;

/** Reads a commit hash from outside input; null when the value cannot be one. */
export function parseCommitId(value: unknown): CommitId | null {
  return typeof value === "string" && COMMIT_ID.test(value) ? (value as CommitId) : null;
}

/** For values known to be valid, such as constants and fixtures. Throws otherwise. */
export function commitId(value: string): CommitId {
  const id = parseCommitId(value);
  if (id === null) throw new Error(`Not a commit hash: ${value}`);
  return id;
}
