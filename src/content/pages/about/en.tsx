import { LocalLink as Link } from "@/components/site/LocalLink";
import pkg from "../../../../package.json";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "About Picstea",
  description:
    "Picstea is a free, layer-based photo editor that runs entirely in your browser. Your images stay on your device: nothing is uploaded.",
  lead: "A free, layer-based image editor in your browser, built so your pictures never leave your device.",
  faqs: [],
  body: () => (
    <>
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

      <h2>Who makes Picstea</h2>
      <p>
        Picstea is built by <Link href="/authors/siavash-ghanbari">Siavash Ghanbari</Link>, who also
        explains technology and software on the SiaBarry YouTube channel. Every guide on the{" "}
        <Link href="/blog">blog</Link> is written and checked against the editor itself.
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

      <h2>Languages</h2>
      <p>
        Picstea is available in English, Spanish, Portuguese (Brazil) and German. The translations
        of the editor and of these pages were made with machine translation and haven&apos;t been
        reviewed by native speakers yet; corrections are welcome. The documentation, blog and legal
        pages are in English.
      </p>

      <h2>Contact</h2>
      <p>
        Who runs Picstea and how to reach them is in the <Link href="/imprint">imprint</Link>. For
        questions about using the editor, start with the <Link href="/faq">FAQ</Link>.
      </p>
    </>
  ),
};

export default copy;
