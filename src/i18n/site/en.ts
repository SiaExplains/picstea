/**
 * Website chrome and shared phrases, in English (ADR-0039). Every other language implements the
 * same shape (`SiteMessages`), so a missing phrase fails the typecheck. `{name}` placeholders are
 * filled by `fill()`.
 */
export const en = {
  header: {
    editorAria: "{name} editor",
    docs: "Docs",
    blog: "Blog",
    openEditor: "Open editor",
    language: "Language",
  },
  footer: {
    tools: "Tools",
    howTo: "How-to guides",
    comparisons: "Comparisons",
    more: "More",
    faq: "FAQ",
    about: "About",
    documentation: "Documentation",
    blog: "Blog",
    privacy: "Privacy",
    cookies: "Cookies",
    terms: "Terms",
    imprint: "Imprint",
    sponsorship: "Advertising & sponsorship",
    tagline: "Images are edited on your device and never uploaded.",
    englishOnly: "(in English)",
  },
  page: {
    home: "Home",
    breadcrumb: "Breadcrumb",
    advertising: "Advertising",
    openEditor: "Open the editor — free, no sign-up",
    questions: "Questions",
    otherComparisons: "Other comparisons",
    howTo: "How-to guides",
    relatedTools: "Related tools",
    factsChecked:
      "Facts about {other} checked in {month} on its official website. Products change; check there for the latest.",
    october2026: "October 2026",
  },
  /** Link labels for the tool, how-to and comparison lists (RelatedTools, footer). */
  links: {
    "/online-photo-editor": "Online photo editor",
    "/psd-editor": "PSD editor",
    "/png-editor": "PNG editor",
    "/jpeg-editor": "JPEG editor",
    "/webp-editor": "WebP editor",
    "/image-resizer": "Image resizer",
    "/image-compressor": "Image compressor",
    "/photo-filters": "Photo filters",
    "/convert": "Image converter",
    "/blur-background": "Blur a photo background",
    "/make-background-transparent": "Make a background transparent",
    "/add-text-to-photo": "Add text to a photo",
    "/black-and-white-photo": "Make a photo black and white",
    "/sharpen-image": "Sharpen an image",
    "/liquify": "Liquify a photo",
    "/photoshop-alternative": "Picstea vs Photoshop",
    "/photopea-alternative": "Picstea vs Photopea",
    "/gimp-alternative": "Picstea vs GIMP",
    "/pixlr-alternative": "Picstea vs Pixlr",
    "/canva-alternative": "Picstea vs Canva",
    "/photoshop-express-alternative": "Picstea vs Photoshop Express",
  },
  converter: {
    cta: "Convert {label} now — free",
    hubCta: "Open the converter — free",
    howTo: "How to convert {label}",
    step1: "Click Convert {label} now. Picstea's editor opens with the converter ready.",
    step2: "Drop your files on the converter, or click to choose them.",
    step3: "Check the output format and, for JPG or WebP, the quality.",
    step4: "Click Convert and save the file (several files are saved as one ZIP).",
    others: "Other converters",
    converters: "Converters",
  },
};

type Shape<T> = { readonly [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
export type SiteMessages = Shape<typeof en>;
