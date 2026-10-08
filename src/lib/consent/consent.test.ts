import { describe, expect, it, vi } from "vitest";
import {
  allows,
  ALL,
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  NONE,
  readConsent,
  writeConsent,
} from "./consent";
import { VendorLoader, type ConsentVendor } from "./vendors";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

describe("consent storage", () => {
  it("has no decision until one is made, then remembers it", () => {
    const storage = memoryStorage();
    expect(readConsent(storage)).toBeNull();
    writeConsent(
      storage,
      { analytics: false, advertising: true },
      new Date("2026-10-09T10:00:00Z"),
    );
    expect(readConsent(storage)).toEqual({
      version: CONSENT_VERSION,
      choices: { analytics: false, advertising: true },
      decidedAt: "2026-10-09T10:00:00.000Z",
    });
  });

  it("asks again after a version change and treats damaged values as no decision", () => {
    const old = memoryStorage({
      [CONSENT_STORAGE_KEY]: JSON.stringify({ version: 0, choices: ALL, decidedAt: "x" }),
    });
    expect(readConsent(old)).toBeNull();
    expect(readConsent(memoryStorage({ [CONSENT_STORAGE_KEY]: "{not json" }))).toBeNull();
    const sneaky = memoryStorage({
      [CONSENT_STORAGE_KEY]: JSON.stringify({
        version: CONSENT_VERSION,
        decidedAt: "x",
        choices: { advertising: "yes", analytics: 1 },
      }),
    });
    expect(readConsent(sneaky)?.choices).toEqual(NONE);
  });

  it("survives blocked storage", () => {
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {},
    };
    expect(readConsent(throwing)).toBeNull();
    expect(writeConsent(throwing, ALL).choices).toEqual(ALL);
  });

  it("always allows necessary, others only when chosen", () => {
    expect(allows(null, "necessary")).toBe(true);
    expect(allows(null, "advertising")).toBe(false);
    expect(allows(writeConsent(null, ALL), "advertising")).toBe(true);
  });
});

describe("vendor loader", () => {
  const vendor = (load: () => Promise<void>): ConsentVendor => ({
    id: "ads",
    name: "Ads",
    category: "advertising",
    load,
  });

  it("loads only after consent, once, and asks for a reload when consent is withdrawn", async () => {
    const load = vi.fn(async () => {});
    const loader = new VendorLoader([vendor(load)]);
    expect(await loader.apply(null)).toEqual({ needsReload: false });
    expect(load).not.toHaveBeenCalled();
    await loader.apply(writeConsent(null, ALL));
    await loader.apply(writeConsent(null, ALL));
    expect(load).toHaveBeenCalledTimes(1);
    expect(await loader.apply(writeConsent(null, NONE))).toEqual({ needsReload: true });
  });

  it("keeps working when a vendor is blocked", async () => {
    const loader = new VendorLoader([vendor(() => Promise.reject(new Error("blocked")))]);
    await expect(loader.apply(writeConsent(null, ALL))).resolves.toEqual({ needsReload: false });
  });
});
