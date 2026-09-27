import { asArray, asRecord } from "./json";

const MAX_SEARCH_DEPTH = 10;

function findSource(node: unknown, depth: number): string | null {
  const record = asRecord(node);
  if (!record && !Array.isArray(node)) return null;
  if (record && Array.isArray(record.rawLines))
    return asArray(record.rawLines).map(String).join("\n");
  if (record && typeof record.rawBlob === "string") return record.rawBlob;
  if (depth >= MAX_SEARCH_DEPTH) return null;
  const children = record ? Object.values(record) : asArray(node);
  for (const child of children) {
    const found = findSource(child, depth + 1);
    if (found !== null) return found;
  }
  return null;
}

/**
 * Extracts a file's raw text from a `/blob/:sha/:path` page. The location inside the
 * embedded JSON has changed several times, so the whole tree is searched.
 */
export function extractBlobSource(html: string): string | null {
  const document = new DOMParser().parseFromString(html, "text/html");
  for (const script of Array.from(document.querySelectorAll('script[type="application/json"]'))) {
    const text = script.textContent ?? "";
    if (!text.includes("rawLines") && !text.includes("rawBlob")) continue;
    try {
      const found = findSource(JSON.parse(text), 0);
      if (found !== null) return found;
    } catch {
      // Not the payload we are looking for; keep scanning.
    }
  }
  return null;
}
