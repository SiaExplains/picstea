import { allows, type ConsentCategory, type StoredConsent } from "./consent";

/**
 * Third-party technologies are only ever loaded through this registry (docs/09 "Do not hardcode
 * vendor assumptions"), and only after consent for their category.
 */
export interface ConsentVendor {
  readonly id: string;
  readonly name: string;
  readonly category: Exclude<ConsentCategory, "necessary">;
  load(): Promise<void>;
}

export class VendorLoader {
  private readonly loaded = new Set<string>();

  constructor(private readonly vendors: readonly ConsentVendor[]) {}

  get hasOptionalVendors(): boolean {
    return this.vendors.length > 0;
  }

  isLoaded(id: string): boolean {
    return this.loaded.has(id);
  }

  /**
   * Load every vendor the consent allows that is not loaded yet. Returns true when a loaded
   * vendor is no longer allowed: scripts cannot be unloaded, so the page must be reloaded.
   */
  async apply(consent: StoredConsent | null): Promise<{ needsReload: boolean }> {
    let needsReload = false;
    for (const vendor of this.vendors) {
      const allowed = allows(consent, vendor.category);
      if (allowed && !this.loaded.has(vendor.id)) {
        this.loaded.add(vendor.id);
        try {
          await vendor.load();
        } catch {
          // Blocked (e.g. by an ad blocker): the site keeps working without it.
        }
      } else if (!allowed && this.loaded.has(vendor.id)) {
        needsReload = true;
      }
    }
    return { needsReload };
  }
}
