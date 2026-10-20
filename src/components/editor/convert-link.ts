import { parseConvertParam, type Conversion } from "@/editor/formats/convert";

/**
 * The conversion a converter page linked to (`/?convert=webp-to-png`), read once per page load so
 * the editor and the welcome dialog agree on it whichever mounts first. Not a document link: the
 * value only picks a dialog, and unknown values are ignored.
 */
let initial: Conversion | null | undefined;

export function initialConversion(): Conversion | null {
  if (initial === undefined) {
    initial =
      typeof window === "undefined"
        ? null
        : parseConvertParam(new URLSearchParams(window.location.search).get("convert"));
  }
  return initial;
}

/** Drop `?convert=` from the address bar so a reload opens the plain editor. */
export function clearConvertParam(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("convert")) return;
  url.searchParams.delete("convert");
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
}
