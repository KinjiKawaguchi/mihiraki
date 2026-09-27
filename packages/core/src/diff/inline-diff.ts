import { type ArrayChange, diffArrays } from "diff";
import { type HtmlToken, tokenizeHtml } from "./html-tokens";

export interface BlockHtmlDiff {
  readonly base: string;
  readonly head: string;
}

type Marker = "ins" | "del";

const MARKER_CLASS: Readonly<Record<Marker, string>> = {
  ins: "bgm-ins",
  del: "bgm-del",
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

/** Re-emits the tokens, wrapping each run of changed text (never tags) in a marker element. */
function renderWithMarkers(
  tokens: readonly HtmlToken[],
  flags: readonly boolean[],
  marker: Marker,
): string {
  const parts: string[] = [];
  let run: string[] = [];
  tokens.forEach((token, index) => {
    const isChangedText = token.kind === "text" && flags[index] === true;
    if (isChangedText) {
      run = [...run, token.value];
      return;
    }
    parts.push(wrapRun(run, marker), token.value);
    run = [];
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
