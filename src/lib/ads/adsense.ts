import type { ConsentVendor } from "../consent/vendors";

/**
 * Google AdSense (docs/08, ADR-0013, ADR-0024). Configured only through public build variables;
 * without a valid publisher ID nothing from Google is ever referenced.
 *
 * Two consent modes (`NEXT_PUBLIC_ADSENSE_CMP`):
 * - `own` (default): AdSense is a vendor of Picstea's own consent banner, loaded only after
 *   "Accept", and asks for non-personalised ads (personalised ads in the EEA/UK/CH need a
 *   Google-certified IAB TCF platform).
 * - `google`: Google's certified "Privacy & messaging" CMP, delivered by the AdSense code itself,
 *   asks for consent on website pages; the ad code loads straight away and follows its TCF
 *   signal. Only correct once the European regulations message is published in AdSense.
 */

const CLIENT_PATTERN = /^ca-pub-\d{16}$/;
/** Google's certification authority ID for its ads.txt entry (AdSense help: "ads.txt guide"). */
const GOOGLE_ADS_TXT_CERT = "f08c47fec0942fa0";

export type AdsenseCmp = "own" | "google";
const SLOT_PATTERN = /^\d{5,20}$/;

export function parseAdsenseClient(value: string | undefined): string | null {
  const v = value?.trim();
  return v && CLIENT_PATTERN.test(v) ? v : null;
}

export function parseAdsenseSlot(value: string | undefined): string | null {
  const v = value?.trim();
  return v && SLOT_PATTERN.test(v) ? v : null;
}

export function parseAdsenseCmp(value: string | undefined): AdsenseCmp {
  return value?.trim().toLowerCase() === "google" ? "google" : "own";
}

/** The ads.txt body authorising Google to sell this publisher's inventory. */
export function adsTxt(client: string): string {
  return `google.com, ${client.replace(/^ca-/, "")}, DIRECT, ${GOOGLE_ADS_TXT_CERT}\n`;
}

export const ADSENSE_CLIENT = parseAdsenseClient(process.env.NEXT_PUBLIC_ADSENSE_CLIENT);
export const ADSENSE_CMP = parseAdsenseCmp(process.env.NEXT_PUBLIC_ADSENSE_CMP);
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

type AdsWindow = Window & {
  adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number };
  googlefc?: { callbackQueue?: unknown[]; showRevocationMessage?: () => void };
};

/**
 * Reopen Google's consent message (google mode). Returns false when Google's code is not
 * available (blocked or not loaded), so the caller can fall back.
 */
export function showGoogleConsentMessage(): boolean {
  const w = window as AdsWindow;
  const fc = w.googlefc;
  if (!fc?.callbackQueue) return false;
  fc.callbackQueue.push(() => fc.showRevocationMessage?.());
  return true;
}

/** In `google` mode personalisation follows Google's CMP; otherwise non-personalised only. */
export function adsenseVendor(client: string, cmp: AdsenseCmp = "own"): ConsentVendor {
  return {
    id: "google-adsense",
    name: "Google AdSense",
    category: "advertising",
    load: () =>
      new Promise<void>((resolve, reject) => {
        const w = window as AdsWindow;
        w.adsbygoogle = w.adsbygoogle ?? [];
        if (cmp === "own") w.adsbygoogle.requestNonPersonalizedAds = 1;
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
