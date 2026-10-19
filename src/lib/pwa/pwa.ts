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

/** Same-origin app files this page already loaded (scripts, styles, images, fonts). */
function loadedAppFiles(): string[] {
  return performance
    .getEntriesByType("resource")
    .map((e) => e.name)
    .filter((url) => url.startsWith(location.origin));
}

async function registerWorker(): Promise<void> {
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
    const ready = await navigator.serviceWorker.ready;
    ready.active?.postMessage({ type: "cache-urls", urls: loadedAppFiles(), page: location.href });
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
