import { safeFilename } from "../formats/export/raster-export";

/** Batch processing limits (ADR-0018): the ZIP is built in memory. */
export const MAX_BATCH_FILES = 200;
export const MAX_BATCH_OUTPUT_BYTES = 1024 * 1024 * 1024;

/**
 * File names inside the batch ZIP: no path separators or control characters (so extracting can't
 * write outside the target folder), and unique — "photo.png", "photo (2).png", …
 */
export function uniqueEntryName(name: string, extension: string, taken: Set<string>): string {
  const first = safeFilename(name, extension);
  const stem = first.slice(0, first.length - extension.length - 1);
  let candidate = first;
  for (let i = 2; taken.has(candidate.toLowerCase()); i++) {
    candidate = `${stem} (${i}).${extension}`;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}
