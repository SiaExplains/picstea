import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { hasLocale, type Locale } from "@/i18n/locales";

/**
 * Per-page social preview images (Open Graph / X). Each public route colocates an
 * `opengraph-image.tsx` that calls `ogCard`; Next prerenders them at build time and the file-based
 * image overrides the site-wide `/og-image.png` in that route's metadata. Server only: no client
 * JavaScript is added.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

export type OgSection = "guide" | "compare" | "convert" | "docs" | "blog" | "about";

const SECTION_LABEL: Record<Locale, Record<OgSection, string>> = {
  en: {
    guide: "Guide",
    compare: "Comparison",
    convert: "Converter",
    docs: "Documentation",
    blog: "Blog",
    about: "Picstea",
  },
  es: {
    guide: "Guía",
    compare: "Comparación",
    convert: "Conversor",
    docs: "Documentación",
    blog: "Blog",
    about: "Picstea",
  },
  "pt-br": {
    guide: "Guia",
    compare: "Comparação",
    convert: "Conversor",
    docs: "Documentação",
    blog: "Blog",
    about: "Picstea",
  },
  de: {
    guide: "Anleitung",
    compare: "Vergleich",
    convert: "Konverter",
    docs: "Dokumentation",
    blog: "Blog",
    about: "Picstea",
  },
};

const FOOTER: Record<Locale, string> = {
  en: "Free photo editor in your browser · nothing is uploaded",
  es: "Editor de fotos gratis en el navegador · no se sube nada",
  "pt-br": "Editor de fotos grátis no navegador · nada é enviado",
  de: "Kostenloser Foto-Editor im Browser · nichts wird hochgeladen",
};

let iconData: Promise<string> | null = null;
/** The Picstea mark as a data URL (read once from public/brand at build time). */
function brandIcon(): Promise<string> {
  iconData ??= readFile(join(process.cwd(), "public", "brand", "picstea-icon.png")).then(
    (bytes) => `data:image/png;base64,${bytes.toString("base64")}`,
  );
  return iconData;
}

/** A cover image under public/ as a data URL, or null when there is none. */
async function publicImage(path: string | undefined): Promise<string | null> {
  if (!path || !path.startsWith("/") || path.includes("..")) return null;
  try {
    const bytes = await readFile(join(process.cwd(), "public", path));
    const type = path.endsWith(".png") ? "image/png" : "image/jpeg";
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

/** The route's language from its `lang` param (English for anything unexpected). */
export async function ogLocale(params: Promise<{ lang?: string }>): Promise<Locale> {
  const { lang } = await params;
  return hasLocale(lang) ? lang : "en";
}

/** A 1200 × 630 card: Picstea mark, section label, the page title and a short footer. */
export async function ogCard({
  title,
  section,
  locale = "en",
  cover,
}: {
  title: string;
  section: OgSection;
  locale?: Locale;
  /** A photo under public/ shown on the right (blog post covers). */
  cover?: string;
}): Promise<ImageResponse> {
  const [icon, photo] = await Promise.all([brandIcon(), publicImage(cover)]);
  const size = title.length > 60 ? 54 : title.length > 40 ? 62 : 70;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#1e1f22",
        color: "#e6e6e8",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flex: 1,
          padding: "64px 72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              backgroundImage: `url(${icon})`,
              backgroundSize: "56px 56px",
            }}
          />
          <div style={{ fontSize: 34, fontWeight: 700 }}>Picstea</div>
          <div
            style={{
              marginLeft: 12,
              padding: "6px 16px",
              fontSize: 24,
              color: "#8fd3c9",
              border: "2px solid #4da297",
              borderRadius: 999,
            }}
          >
            {SECTION_LABEL[locale][section]}
          </div>
        </div>
        <div style={{ fontSize: size, fontWeight: 700, lineHeight: 1.15, display: "flex" }}>
          {title}
        </div>
        <div style={{ fontSize: 26, color: "#a4a5ab", display: "flex" }}>{FOOTER[locale]}</div>
      </div>
      {photo && (
        <div
          style={{
            display: "flex",
            width: 420,
            height: "100%",
            backgroundImage: `url(${photo})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}
    </div>,
    OG_SIZE,
  );
}
