import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/site/ContentPage";
import { EditorLink } from "@/components/site/EditorLink";
import { softwareApplication } from "@/lib/seo/jsonld";
import { pageOpenGraph } from "@/lib/seo/root-metadata";
import styles from "@/components/site/site.module.css";
import pkg from "../../../../package.json";

const PATH = "/about";
const TITLE = "About Picstea";
const DESCRIPTION =
  "Picstea is a free, layer-based photo editor that runs entirely in your browser. Your images stay on your device: nothing is uploaded.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: pageOpenGraph({ url: PATH, title: TITLE, description: DESCRIPTION }),
};

export default function AboutPage() {
  return (
    <ContentPage
      crumbs={[
        { name: "Home", path: "/" },
        { name: TITLE, path: PATH },
      ]}
      title={TITLE}
      lead="A free, layer-based image editor in your browser, built so your pictures never leave your device."
      structuredData={[softwareApplication(PATH)]}
      ad={null}
    >
      <EditorLink className={styles.ctaLarge}>Open the editor — free, no sign-up</EditorLink>

      <h2>What Picstea is</h2>
      <p>
        Picstea is a photo editor that works like the desktop tools you may know: layers and groups,
        masks, blend modes, adjustment layers, a full Layer Style dialog, selections, retouching
        brushes, text, shapes and paths, smart objects and filters. It opens and saves Photoshop
        files (PSD) with their layers, and exports PNG, JPEG, WebP, SVG and PDF. The{" "}
        <Link href="/docs">documentation</Link> covers every tool.
      </p>

      <h2>Your images stay on your device</h2>
      <p>
        Everything happens in your browser. Picstea has no server that receives images, and the
        editor page is set up so it cannot send document data anywhere. Your work is saved
        automatically in this browser&apos;s storage; download a <code>.picstea</code> project or
        export an image whenever you want a copy elsewhere. After the first visit the editor also
        works offline, and in Chrome and Edge you can install it as an app.
      </p>

      <h2>Free, with no account</h2>
      <p>
        There is no sign-up, no watermark and no limit on exports. Picstea is paid for by
        advertising on the website and blog, and by clearly labelled sponsorships beside the canvas
        — never over your work; the <Link href="/sponsorship">sponsorship page</Link> explains how.
        The <Link href="/privacy">privacy policy</Link> and{" "}
        <Link href="/cookies">cookie policy</Link> list exactly what is stored and why.
      </p>

      <h2>How it is made</h2>
      <p>
        Picstea is written in TypeScript with React and Next.js. The editor itself — documents,
        rendering, file formats and tools — is plain code that runs in the browser and in a
        background worker, with no third-party services. Changes are listed release by release, and
        the <Link href="/blog">blog</Link> explains new features.
      </p>
      <p>
        <small>Version {pkg.version}</small>
      </p>

      <h2>Open-source software</h2>
      <p>
        To open HEIC photos, Picstea uses{" "}
        <a href="https://github.com/strukturag/libheif" rel="noopener">
          libheif
        </a>{" "}
        (GNU LGPL 3.0), compiled to WebAssembly by{" "}
        <a href="https://github.com/catdad-experiments/libheif-js" rel="noopener">
          libheif-js
        </a>{" "}
        1.23.5. It is served unmodified as its own file, loaded only when you open a HEIC photo, and
        runs on your device. Licences:{" "}
        <a href="/vendor/libheif/1.23.5/LICENSE-libheif.txt">libheif</a>,{" "}
        <a href="/vendor/libheif/1.23.5/LICENSE-libheif-js.txt">libheif-js</a>. You can replace that
        file with your own build of the library.
      </p>

      <h2>Contact</h2>
      <p>
        Who runs Picstea and how to reach them is in the <Link href="/imprint">imprint</Link>. For
        questions about using the editor, start with the <Link href="/faq">FAQ</Link>.
      </p>
    </ContentPage>
  );
}
