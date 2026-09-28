import { type ArrayChange, diffArrays } from "diff";
import { type HtmlToken, tokenizeHtml } from "./html-tokens";

export interface BlockHtmlDiff {
  readonly base: string;
  readonly head: string;
}

type Marker = "ins" | "del";

const MARKER_CLASS: Readonly<Record<Marker, string>> = {
  ins: "mhr-ins",
  del: "mhr-del",
};

/** Per-token "changed" flags for one side of a diff. */
function changedFlags(changes: readonly ArrayChange<string>[], side: "base" | "head"): boolean[] {
  const ownChange = side === "base" ? "removed" : "added";
  const otherChange = side === "base" ? "added" : "removed";
  return changes.flatMap((change) =>
    change[otherChange]
      ? []
      : Array.from({ length: change.value.length }, () => Boolean(change[ownChange])),
  );
}

function wrapRun(run: readonly string[], marker: Marker): string {
  const text = run.join("");
  if (text.trim() === "") return text;
  return `<${marker} class="${MARKER_CLASS[marker]}">${text}</${marker}>`;
}

/**
 * Re-emits the tokens, wrapping each run of changed text (never tags) in a marker element.
 * Builds its output in local arrays only.
 */
function renderWithMarkers(
  tokens: readonly HtmlToken[],
  flags: readonly boolean[],
  marker: Marker,
): string {
  const parts: string[] = [];
  const run: string[] = [];
  tokens.forEach((token, index) => {
    if (token.kind === "text" && flags[index] === true) {
      run.push(token.value);
      return;
    }
    parts.push(wrapRun(run, marker), token.value);
    run.length = 0;
  });
  parts.push(wrapRun(run, marker));
  return parts.join("");
}

/** Highlights word / character level changes between two renderings of the same block. */
export function diffBlockHtml(baseHtml: string, headHtml: string): BlockHtmlDiff {
  const baseTokens = tokenizeHtml(baseHtml);
  const headTokens = tokenizeHtml(headHtml);
  const changes = diffArrays(
    baseTokens.map((token) => token.key),
    headTokens.map((token) => token.key),
  );
  return {
    base: renderWithMarkers(baseTokens, changedFlags(changes, "base"), "del"),
    head: renderWithMarkers(headTokens, changedFlags(changes, "head"), "ins"),
  };
}

/** Removed text to put back into the head version; whitespace alone is left out, the head has its own. */
function removedText(tokens: readonly HtmlToken[]): string {
  const text = tokens
    .filter((token) => token.kind === "text")
    .map((token) => token.value)
    .join("");
  return text.trim() === "" ? "" : `<del class="${MARKER_CLASS.del}">${text}</del>`;
}

/**
 * One rendering of a modified block for a single-column view: the head version, with
 * inserted text marked and removed text put back where it was. Only the head's tags are
 * emitted, so the result keeps the head's structure and source lines.
 */
export function mergeBlockHtml(baseHtml: string, headHtml: string): string {
  const baseTokens = tokenizeHtml(baseHtml);
  const headTokens = tokenizeHtml(headHtml);
  const changes = diffArrays(
    baseTokens.map((token) => token.key),
    headTokens.map((token) => token.key),
  );
  const parts: string[] = [];
  let baseIndex = 0;
  let headIndex = 0;
  for (const change of changes) {
    const count = change.value.length;
    if (change.removed) {
      parts.push(removedText(baseTokens.slice(baseIndex, baseIndex + count)));
      baseIndex += count;
    } else if (change.added) {
      const added = headTokens.slice(headIndex, headIndex + count);
      parts.push(
        renderWithMarkers(
          added,
          added.map(() => true),
          "ins",
        ),
      );
      headIndex += count;
    } else {
      parts.push(...headTokens.slice(headIndex, headIndex + count).map((token) => token.value));
      baseIndex += count;
      headIndex += count;
    }
  }
  return parts.join("");
}
