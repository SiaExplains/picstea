"use client";

/**
 * Save a Blob to the user's device. Uses the File System Access save dialog where available
 * (docs/19 progressive enhancement) and falls back to a download link. Purely local.
 */

type SaveFilePicker = (options: {
  suggestedName?: string;
  types?: { description?: string; accept: Record<string, string[]> }[];
}) => Promise<{
  createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }>;
}>;

export type SaveOutcome = "saved" | "cancelled" | "failed";

export async function saveFile(
  blob: Blob,
  filename: string,
  mime: string,
  description = "Image",
): Promise<SaveOutcome> {
  const picker = (window as Window & { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
  if (typeof picker === "function") {
    try {
      const extension = filename.slice(filename.lastIndexOf("."));
      const handle = await picker.call(window, {
        suggestedName: filename,
        types: [{ description, accept: { [mime]: [extension] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return "saved";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
      // Fall through to the download link (e.g. blocked in an iframe).
    }
  }
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    document.body.append(link);
    link.click();
    link.remove();
    // Give the browser time to start the download before releasing the URL.
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return "saved";
  } catch {
    return "failed";
  }
}
