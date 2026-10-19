/**
 * Service worker registration and the "Install Picstea" prompt (ADR-0029). Browser only.
 *
 * The worker is registered in production builds only: in `next dev` it would fight hot reload.
 * Chromium browsers fire `beforeinstallprompt` when the app can be installed; the event is kept
 * so the editor can offer its own Install button. Other browsers install from their own menu.
 */

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface InstallState {
  /** The browser offered installation (Chromium): our button can show its dialog. */
  readonly canPrompt: boolean;
  /** Running as the installed app, or just installed. */
  readonly installed: boolean;
}

const NOT_INSTALLABLE: InstallState = { canPrompt: false, installed: false };

let deferred: InstallPromptEvent | null = null;
let state: InstallState = NOT_INSTALLABLE;
const listeners = new Set<() => void>();
let started = false;

function set(next: Partial<InstallState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export const installStore = {
  get: () => state,
  server: () => NOT_INSTALLABLE,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** Show the browser's install dialog; false when the browser doesn't offer one. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  set({ canPrompt: false });
  await event.prompt();
  const choice = await event.userChoice;
  if (choice.outcome === "accepted") set({ installed: true });
  return true;
}

/**
 * Tell the worker which same-origin app files (scripts, styles, images, fonts) this page loads,
 * so a second visit works offline even for files that loaded before the worker took control.
 *
 * A one-off snapshot is not enough: a resource only appears in the performance timeline once its
 * response has finished, so a file requested just before the worker took control (the menu bar
 * logo, rendered after `load`) would be missing from it and never cached. Later entries are
 * reported as they finish; the worker skips files it already has.
 */
function shareLoadedFiles(worker: ServiceWorker): void {
  const seen = new Set<string>();
  const send = (entries: PerformanceEntryList, page?: string) => {
    const urls = entries
      .map((e) => e.name)
      .filter((url) => url.startsWith(location.origin) && !seen.has(url));
    urls.forEach((url) => seen.add(url));
    if (urls.length === 0 && !page) return;
    (navigator.serviceWorker.controller ?? worker).postMessage({ type: "cache-urls", urls, page });
  };
  send(performance.getEntriesByType("resource"), location.href);
  if (typeof PerformanceObserver === "undefined") return;
  new PerformanceObserver((list) => send(list.getEntries())).observe({
    type: "resource",
    buffered: true,
  });
}

async function registerWorker(): Promise<void> {
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
    const ready = await navigator.serviceWorker.ready;
    if (ready.active) shareLoadedFiles(ready.active);
  } catch {
    // Unsupported or blocked (private mode, policies): the site simply works online only.
  }
}

/** Start once per page: register the worker and listen for the install prompt. */
export function startPwa(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  if (window.matchMedia?.("(display-mode: standalone)").matches) set({ installed: true });
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    set({ canPrompt: true });
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    set({ canPrompt: false, installed: true });
  });
  if (document.readyState === "complete") void registerWorker();
  else window.addEventListener("load", () => void registerWorker(), { once: true });
}
