import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/marketing/JsonLd";
import { SITE } from "@/lib/seo/site";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: { absolute: `${SITE.name} — Free online image editor, private by design` },
  description: SITE.description,
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    title: `${SITE.name} — Free online image editor`,
    description: SITE.description,
  },
};

/* Only features that exist today are listed (docs/10_SEO_AEO.md: no filler, no overclaiming). */
const FEATURES = [
  {
    title: "Your images never leave your device",
    body: "Editing happens entirely in your browser. There is no upload step and no server that sees your files.",
  },
  {
    title: "Layers and blend modes",
    body: "Stack images and colour fills, reorder them, change opacity and choose from 16 blend modes.",
  },
  {
    title: "Undo history",
    body: "Every change can be undone and redone, including layer edits and renames.",
  },
  {
    title: "Automatic local saving",
    body: "Projects are saved in your browser's storage as you work and appear in your recent list after a reload.",
  },
  {
    title: "Open PNG, JPEG and WebP",
    body: "Open images from your computer, drag and drop them, or paste them from the clipboard.",
  },
  {
    title: "Familiar workspace",
    body: "Menus, tools, a layers panel and keyboard shortcuts that feel natural if you have used a professional editor.",
  },
];

const FAQ = [
  {
    q: "Is MYLPER free?",
    a: "Yes. MYLPER is free to use in your browser, with no account required.",
  },
  {
    q: "Are my images uploaded to a server?",
    a: "No. MYLPER is local-first: images and projects are processed and stored in your browser on your own device.",
  },
  {
    q: "Where are my projects saved?",
    a: "In your browser's local storage (IndexedDB). Browsers can clear this storage, so keep important work exported as files.",
  },
  {
    q: "Which file types can I open?",
    a: "PNG, JPEG and WebP today. Export, PSD and more formats are on the roadmap.",
  },
];

export default function HomePage() {
  return (
    <div className={styles.page}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": `${SITE.url}/#website`,
              name: SITE.name,
              url: SITE.url,
            },
            {
              "@type": "Organization",
              "@id": `${SITE.url}/#organization`,
              name: SITE.name,
              url: SITE.url,
            },
            {
              "@type": "SoftwareApplication",
              name: SITE.name,
              url: `${SITE.url}/editor`,
              applicationCategory: "MultimediaApplication",
              operatingSystem: "Any (web browser)",
              description: SITE.description,
              offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
              publisher: { "@id": `${SITE.url}/#organization` },
            },
          ],
        }}
      />
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          MYLPER
        </Link>
        <Link href="/editor">Open editor</Link>
      </header>

      <main>
        <section className={styles.hero}>
          <h1>Edit images in your browser. Keep them on your device.</h1>
          <p className={styles.lead}>
            MYLPER is a free online image editor with layers, blend modes and full undo history. It
            runs entirely in your browser, so your photos are never uploaded anywhere.
          </p>
          <Link href="/editor" className={styles.cta}>
            Start editing — free
          </Link>
        </section>

        <section className={styles.section} aria-labelledby="features">
          <h2 id="features">What you can do today</h2>
          <ul className={styles.grid}>
            {FEATURES.map((f) => (
              <li key={f.title} className={styles.card}>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="faq">
          <h2 id="faq">Questions</h2>
          <dl className={styles.faq}>
            {FAQ.map((item) => (
              <div key={item.q}>
                <dt>{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>© {SITE.name}. Images are processed locally in your browser.</p>
      </footer>
    </div>
  );
}
