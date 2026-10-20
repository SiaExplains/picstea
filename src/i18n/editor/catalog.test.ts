import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { translate } from "./catalog";
import { collectEditorKeys, placeholders, templateLiteralCalls } from "./collect-keys";
import { de } from "./de";
import { es } from "./es";
import { ptBr } from "./pt-br";

const CATALOGUES = { es, "pt-br": ptBr, de };

describe("editor translations", () => {
  const keys = collectEditorKeys();

  // `KEYS_OUT=path pnpm vitest run src/i18n/editor` lists every key for translators.
  if (process.env.KEYS_OUT)
    writeFileSync(process.env.KEYS_OUT, JSON.stringify([...keys].sort(), null, 1));

  it("finds the editor's texts", () => {
    for (const key of ["Gaussian Blur", "Export", "Editor menu", "Layer via Copy", "Liquify"]) {
      expect(keys, key).toContain(key);
    }
  });

  it("only translates literal keys", () => {
    expect(templateLiteralCalls()).toEqual([]);
  });

  for (const [locale, catalogue] of Object.entries(CATALOGUES)) {
    it(`${locale} translates every text`, () => {
      expect([...keys].filter((key) => !(key in catalogue))).toEqual([]);
    });

    it(`${locale} keeps every {placeholder}`, () => {
      const broken = Object.entries(catalogue).filter(
        ([key, text]) => placeholders(key).join() !== placeholders(text).join(),
      );
      expect(broken).toEqual([]);
    });
  }

  it("fills placeholders in the user's number format and falls back to English", () => {
    const catalog = { "{count} file(s)": "{count} Datei(en)", Blur: "Weichzeichnen" };
    expect(translate(catalog, "de", "{count} file(s)", { count: 1200 })).toBe("1.200 Datei(en)");
    expect(translate(catalog, "de", "Blur…")).toBe("Weichzeichnen…");
    expect(translate(catalog, "de", "Unknown")).toBe("Unknown");
    expect(translate({}, "en", "Hi {name}", { name: "Blur" })).toBe("Hi Blur");
  });
});
