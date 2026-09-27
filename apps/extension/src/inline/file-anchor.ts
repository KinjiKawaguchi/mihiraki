/** GitHub identifies each file block of the Files changed page as `diff-<sha256 of path>`. */
export async function fileContainerId(path: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(path));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
  return `diff-${hex}`;
}
