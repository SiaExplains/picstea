import { publishedPosts } from "@/content/blog";
import { CONVERTER_IDS, converterFor } from "@/content/converters";
import { DOCS } from "@/content/docs";
import type { PageCopy, Translated } from "@/content/pages/types";
import { LOCALES, type Locale } from "@/i18n/locales";
import type { OgSection } from "./og-card";
import { copy as about } from "@/content/pages/about";
import { copy as addTextToPhoto } from "@/content/pages/add-text-to-photo";
import { copy as blackAndWhitePhoto } from "@/content/pages/black-and-white-photo";
import { copy as blurBackground } from "@/content/pages/blur-background";
import { copy as canvaAlternative } from "@/content/pages/canva-alternative";
import { copy as convert } from "@/content/pages/convert";
import { copy as faq } from "@/content/pages/faq";
import { copy as gimpAlternative } from "@/content/pages/gimp-alternative";
import { copy as imageCompressor } from "@/content/pages/image-compressor";
import { copy as imageResizer } from "@/content/pages/image-resizer";
import { copy as jpegEditor } from "@/content/pages/jpeg-editor";
import { copy as liquify } from "@/content/pages/liquify";
import { copy as makeBackgroundTransparent } from "@/content/pages/make-background-transparent";
import { copy as onlinePhotoEditor } from "@/content/pages/online-photo-editor";
import { copy as photoFilters } from "@/content/pages/photo-filters";
import { copy as photopeaAlternative } from "@/content/pages/photopea-alternative";
import { copy as photoshopAlternative } from "@/content/pages/photoshop-alternative";
import { copy as photoshopExpressAlternative } from "@/content/pages/photoshop-express-alternative";
import { copy as pixlrAlternative } from "@/content/pages/pixlr-alternative";
import { copy as pngEditor } from "@/content/pages/png-editor";
import { copy as psdEditor } from "@/content/pages/psd-editor";
import { copy as sharpenImage } from "@/content/pages/sharpen-image";
import { copy as webpEditor } from "@/content/pages/webp-editor";

/**
 * Every page that has its own social preview image (`/og/<locale>/<page>.png`): the translated
 * landing and converter pages in each language, and the English docs and blog. The editor home
 * keeps the site-wide /og-image.png. A unit test checks this covers the sitemap.
 */

export interface OgEntry {
  readonly locale: Locale;
  /** The page's English path, e.g. "/png-editor" or "/blog/some-post". */
  readonly path: string;
  readonly title: string;
  readonly section: OgSection;
  /** A cover photo under public/ (blog posts). */
  readonly cover?: string;
}

const LANDING: readonly (readonly [string, OgSection, Translated<PageCopy>])[] = [
  ["/about", "about", about],
  ["/add-text-to-photo", "guide", addTextToPhoto],
  ["/black-and-white-photo", "guide", blackAndWhitePhoto],
  ["/blur-background", "guide", blurBackground],
  ["/canva-alternative", "compare", canvaAlternative],
  ["/convert", "convert", convert],
  ["/faq", "about", faq],
  ["/gimp-alternative", "compare", gimpAlternative],
  ["/image-compressor", "guide", imageCompressor],
  ["/image-resizer", "guide", imageResizer],
  ["/jpeg-editor", "guide", jpegEditor],
  ["/liquify", "guide", liquify],
  ["/make-background-transparent", "guide", makeBackgroundTransparent],
  ["/online-photo-editor", "guide", onlinePhotoEditor],
  ["/photo-filters", "guide", photoFilters],
  ["/photopea-alternative", "compare", photopeaAlternative],
  ["/photoshop-alternative", "compare", photoshopAlternative],
  ["/photoshop-express-alternative", "compare", photoshopExpressAlternative],
  ["/pixlr-alternative", "compare", pixlrAlternative],
  ["/png-editor", "guide", pngEditor],
  ["/psd-editor", "guide", psdEditor],
  ["/sharpen-image", "guide", sharpenImage],
  ["/webp-editor", "guide", webpEditor],
];

export function ogEntries(): OgEntry[] {
  const out: OgEntry[] = [];
  for (const locale of LOCALES) {
    for (const [path, section, copy] of LANDING) {
      out.push({ locale, path, title: copy[locale].title, section });
    }
    for (const id of CONVERTER_IDS) {
      const page = converterFor(locale, id);
      if (page) out.push({ locale, path: `/convert/${id}`, title: page.title, section: "convert" });
    }
  }
  out.push({
    locale: "en",
    path: "/docs",
    title: "Picstea documentation and guides",
    section: "docs",
  });
  for (const doc of DOCS) {
    out.push({ locale: "en", path: `/docs/${doc.slug}`, title: doc.title, section: "docs" });
  }
  out.push({
    locale: "en",
    path: "/blog",
    title: "Guides and explanations about editing images in your browser",
    section: "blog",
  });
  for (const post of publishedPosts()) {
    out.push({
      locale: "en",
      path: `/blog/${post.slug}`,
      title: post.title,
      section: "blog",
      ...(post.image ? { cover: post.image } : {}),
    });
  }
  return out;
}

/** The URL of a page's preview image (relative; metadataBase makes it absolute). */
export const ogImagePath = (locale: Locale, path: string) => `/og/${locale}${path}.png`;

/** Open Graph `images` for a page with its own preview. */
export function ogImages(locale: Locale, path: string, title: string) {
  return [{ url: ogImagePath(locale, path), width: 1200, height: 630, alt: title }];
}
