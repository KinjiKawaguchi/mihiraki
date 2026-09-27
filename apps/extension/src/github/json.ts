/** Narrowing helpers for responses of GitHub's undocumented endpoints, whose shapes can change at any time. */

export type JsonRecord = Readonly<Record<string, unknown>>;

export function asRecord(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

export function asArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asRecords(value: unknown): readonly JsonRecord[] {
  return asArray(value).flatMap((item) => {
    const record = asRecord(item);
    return record ? [record] : [];
  });
}

export function asString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return null;
}

export function pick(value: unknown, ...path: string[]): unknown {
  return path.reduce<unknown>((node, key) => asRecord(node)?.[key], value);
}
