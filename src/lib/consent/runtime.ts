"use client";

import {
  ADSENSE_CLIENT,
  ADSENSE_CMP,
  adsenseVendor,
  showGoogleConsentMessage,
} from "../ads/adsense";
import { readConsent, writeConsent, type ConsentChoices, type StoredConsent } from "./consent";
import { VendorLoader, type ConsentVendor } from "./vendors";

/**
 * The page's consent state and vendor loading (browser only). Components subscribe with
 * `useSyncExternalStore`; the footer's "Privacy settings" reopens the preferences.
 */

/** Google's CMP asks for ad consent itself, so AdSense is not one of our banner's vendors. */
export const GOOGLE_CMP = !!ADSENSE_CLIENT && ADSENSE_CMP === "google";

const VENDORS: ConsentVendor[] =
  ADSENSE_CLIENT && !GOOGLE_CMP ? [adsenseVendor(ADSENSE_CLIENT)] : [];
/** Google mode: the ad code (which carries the CMP) loads once per page, however often asked. */
let googleAds: Promise<void> | undefined;

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
    if (GOOGLE_CMP && ADSENSE_CLIENT) {
      // Google's CMP is delivered by the ad code: load it now; it asks and enforces consent.
      googleAds ??= adsenseVendor(ADSENSE_CLIENT, "google")
        .load()
        .catch(() => {
          // Blocked (e.g. by an ad blocker): the site keeps working without it.
        });
      return googleAds;
    }
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

/** Reopen the consent choices; false when Google's CMP owns them but its code is unavailable. */
export function openPrivacySettings(): boolean {
  if (GOOGLE_CMP) return showGoogleConsentMessage();
  window.dispatchEvent(new Event(OPEN_PRIVACY_SETTINGS));
  return true;
}
