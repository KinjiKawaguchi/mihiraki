import type { ChangedFile } from "./backend";

/** Where the base version of the file is, or null when it has none (it was added). */
export function basePathOf(file: ChangedFile): string | null {
  if (file.changeType === "ADDED") return null;
  return file.changeType === "RENAMED" ? file.previousPath : file.path;
}

/** Where the head version of the file is, or null when it has none (it was removed). */
export function headPathOf(file: ChangedFile): string | null {
  return file.changeType === "REMOVED" ? null : file.path;
}
