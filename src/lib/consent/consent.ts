/**
 * Consent model and storage (docs/09, ADR-0013). Non-essential technologies are loaded only
 * after an explicit choice; "necessary" (security, the editor itself, remembering this choice)
 * is always on and needs no consent.
 */

export type ConsentCategory = "necessary" | "analytics" | "advertising";
export type OptionalCategory = Exclude<ConsentCategory, "necessary">;
export const OPTIONAL_CATEGORIES: readonly OptionalCategory[] = ["analytics", "advertising"];

export type ConsentChoices = Readonly<Record<OptionalCategory, boolean>>;

export interface StoredConsent {
  /** Bumped when the categories or vendors change materially, which asks everyone again. */
  readonly version: number;
  readonly choices: ConsentChoices;
  /** ISO timestamp of the decision. */
  readonly decidedAt: string;
}

export const CONSENT_VERSION = 1;
export const CONSENT_STORAGE_KEY = "picstea.consent";

export const NONE: ConsentChoices = { analytics: false, advertising: false };
export const ALL: ConsentChoices = { analytics: true, advertising: true };

export const CATEGORY_INFO: Record<ConsentCategory, { title: string; description: string }> = {
  necessary: {
    title: "Necessary",
    description:
      "Security, the editor itself and remembering this choice. Your projects are stored only in this browser. Always on.",
  },
  analytics: {
    title: "Analytics",
    description: "Counting visits to improve the website. Picstea currently uses no analytics.",
  },
  advertising: {
    title: "Advertising",
    description:
      "Google ads on the website and blog (never in the editor). Google may use cookies to show and measure ads.",
  },
};

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** The stored decision, or null if there is none, it is unreadable, or from an older version. */
export function readConsent(storage: StorageLike | null | undefined): StoredConsent | null {
  try {
    const raw = storage?.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredConsent> | null;
    if (!value || value.version !== CONSENT_VERSION || typeof value.decidedAt !== "string") {
      return null;
    }
    const choices = value.choices as Partial<Record<OptionalCategory, unknown>> | undefined;
    if (!choices) return null;
    return {
      version: CONSENT_VERSION,
      decidedAt: value.decidedAt,
      // Anything but an explicit `true` counts as no.
      choices: { analytics: choices.analytics === true, advertising: choices.advertising === true },
    };
  } catch {
    return null;
  }
}

export function writeConsent(
  storage: StorageLike | null | undefined,
  choices: ConsentChoices,
  now: Date = new Date(),
): StoredConsent {
  const stored: StoredConsent = {
    version: CONSENT_VERSION,
    choices: { analytics: choices.analytics, advertising: choices.advertising },
    decidedAt: now.toISOString(),
  };
  try {
    storage?.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage blocked: the choice applies to this page view only.
  }
  return stored;
}

export function allows(consent: StoredConsent | null, category: ConsentCategory): boolean {
  if (category === "necessary") return true;
  return consent?.choices[category] === true;
}
