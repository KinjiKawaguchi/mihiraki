/**
 * The item at an index that exists by construction (e.g. inside a table sized for the
 * loop). A missing one is a bug, so it throws instead of standing in a default value.
 */
export function itemAt<T>(items: readonly T[], index: number): T {
  if (index < 0 || index >= items.length) {
    throw new RangeError(`No item at ${index} of ${items.length}`);
  }
  return items[index] as T;
}
