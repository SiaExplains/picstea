import { describe, expect, it } from "vitest";
import { hasLocale, localizedPath, splitLocale } from "./locales";

describe("locales", () => {
  it("splits a URL into its language and path", () => {
    expect(splitLocale("/png-editor")).toEqual({
      locale: "en",
      path: "/png-editor",
      explicitDefault: false,
    });
    expect(splitLocale("/de/png-editor")).toEqual({
      locale: "de",
      path: "/png-editor",
      explicitDefault: false,
    });
    expect(splitLocale("/pt-br")).toEqual({ locale: "pt-br", path: "/", explicitDefault: false });
    expect(splitLocale("/en/faq")).toEqual({ locale: "en", path: "/faq", explicitDefault: true });
    // Not a language code: an English path.
    expect(splitLocale("/fr/faq").locale).toBe("en");
  });

  it("builds localized paths, with English unprefixed", () => {
    expect(localizedPath("/", "en")).toBe("/");
    expect(localizedPath("/", "de")).toBe("/de");
    expect(localizedPath("/png-editor", "es")).toBe("/es/png-editor");
    expect(localizedPath("/png-editor", "en")).toBe("/png-editor");
  });

  it("knows its languages", () => {
    expect(hasLocale("pt-br")).toBe(true);
    expect(hasLocale("pt-BR")).toBe(false);
    expect(hasLocale(undefined)).toBe(false);
  });
});

describe("translated paths", () => {
  it("match the translated content exactly", async () => {
    const { readdirSync, statSync } = await import("node:fs");
    const { join } = await import("node:path");
    const { TRANSLATED_PATHS } = await import("./translated-paths");
    const { CONVERTER_IDS } = await import("@/content/converters");
    const dir = join(__dirname, "..", "content", "pages");
    const pages = readdirSync(dir).filter(
      (d) => d !== "home" && statSync(join(dir, d)).isDirectory(),
    );
    expect([...TRANSLATED_PATHS].sort()).toEqual(
      ["/", ...pages.map((p) => `/${p}`), ...CONVERTER_IDS.map((id) => `/convert/${id}`)].sort(),
    );
  });
});
