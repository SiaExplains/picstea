"use client";

import { ADSENSE_CLIENT, adsenseVendor } from "../ads/adsense";
import { readConsent, writeConsent, type ConsentChoices, type StoredConsent } from "./consent";
import { VendorLoader, type ConsentVendor } from "./vendors";

/**
 * The page's consent state and vendor loading (browser only). Components subscribe with
 * `useSyncExternalStore`; the footer's "Privacy settings" reopens the preferences.
 */

const VENDORS: ConsentVendor[] = ADSENSE_CLIENT ? [adsenseVendor(ADSENSE_CLIENT)] : [];

export const OPEN_PRIVACY_SETTINGS = "picstea:privacy-settings";

const storage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

let state: StoredConsent | null | undefined;
const listeners = new Set<() => void>();
const loader = new VendorLoader(VENDORS);

export const consentRuntime = {
  /** Vendors needing consent exist; without any, no banner is shown. */
  needsConsent: VENDORS.length > 0,

  get(): StoredConsent | null {
    if (state === undefined) state = readConsent(storage());
    return state;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Load what the stored decision allows (call once after the page hydrates). */
  async start(): Promise<void> {
    await loader.apply(consentRuntime.get());
  },

  async decide(choices: ConsentChoices): Promise<void> {
    state = writeConsent(storage(), choices);
    listeners.forEach((l) => l());
    const { needsReload } = await loader.apply(state);
    // Scripts that already ran cannot be unloaded: reload so they are gone.
    if (needsReload) window.location.reload();
  },
};

export function openPrivacySettings(): void {
  window.dispatchEvent(new Event(OPEN_PRIVACY_SETTINGS));
}
