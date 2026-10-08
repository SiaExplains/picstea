import type { ConsentVendor } from "../consent/vendors";

/**
 * Google AdSense as a consent vendor (docs/08, ADR-0013). Configured only through public build
 * variables; without a valid publisher ID nothing from Google is ever referenced. Ads are
 * requested as non-personalised: personalised ads in the EEA/UK need a Google-certified consent
 * platform (IAB TCF), which MYLPER does not use yet.
 */

const CLIENT_PATTERN = /^ca-pub-\d{16}$/;
const SLOT_PATTERN = /^\d{5,20}$/;

export function parseAdsenseClient(value: string | undefined): string | null {
  const v = value?.trim();
  return v && CLIENT_PATTERN.test(v) ? v : null;
}

export function parseAdsenseSlot(value: string | undefined): string | null {
  const v = value?.trim();
  return v && SLOT_PATTERN.test(v) ? v : null;
}

export const ADSENSE_CLIENT = parseAdsenseClient(process.env.NEXT_PUBLIC_ADSENSE_CLIENT);
/** A responsive display ad unit used by every website placement. */
export const ADSENSE_SLOT = parseAdsenseSlot(process.env.NEXT_PUBLIC_ADSENSE_SLOT);

export const ADSENSE_SCRIPT_ORIGIN = "https://pagead2.googlesyndication.com";

/** Origins Google's ad code needs, for the website's Content-Security-Policy (not the editor). */
export const ADSENSE_CSP = {
  script: [
    ADSENSE_SCRIPT_ORIGIN,
    "https://*.googlesyndication.com",
    "https://*.google.com",
    "https://*.gstatic.com",
    "https://*.doubleclick.net",
    "https://*.adtrafficquality.google",
  ],
  frame: [
    "https://*.googlesyndication.com",
    "https://*.doubleclick.net",
    "https://*.google.com",
    "https://*.adtrafficquality.google",
  ],
  connect: [
    "https://*.googlesyndication.com",
    "https://*.google.com",
    "https://*.doubleclick.net",
    "https://*.adtrafficquality.google",
  ],
  img: ["https:"],
} as const;

type AdsWindow = Window & { adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number } };

export function adsenseVendor(client: string): ConsentVendor {
  return {
    id: "google-adsense",
    name: "Google AdSense",
    category: "advertising",
    load: () =>
      new Promise<void>((resolve, reject) => {
        const w = window as AdsWindow;
        w.adsbygoogle = w.adsbygoogle ?? [];
        w.adsbygoogle.requestNonPersonalizedAds = 1;
        const script = document.createElement("script");
        script.async = true;
        script.crossOrigin = "anonymous";
        script.src = `${ADSENSE_SCRIPT_ORIGIN}/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
        script.dataset.vendor = "google-adsense";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("AdSense was blocked."));
        document.head.appendChild(script);
      }),
  };
}
