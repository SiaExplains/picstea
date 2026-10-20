import type { Metadata } from "next";
import Link from "next/link";
import { pageOpenGraph } from "@/lib/seo/root-metadata";
import { ComparisonTable } from "@/components/site/ComparisonTable";
import { LandingPage, type Faq } from "@/components/site/LandingPage";
import { RelatedTools } from "@/components/site/RelatedTools";

const PATH = "/gimp-alternative";
const TITLE = "Picstea: a GIMP alternative in your browser";
const DESCRIPTION =
  "Looking for a GIMP alternative with nothing to install? Picstea is a free browser editor with Photoshop-style layers and PSD support. An honest comparison.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: pageOpenGraph({ url: PATH, title: TITLE, description: DESCRIPTION }),
};

const FAQS: Faq[] = [
  {
    q: "Is Picstea better than GIMP?",
    a: "It depends on the job. Picstea needs no installation and works like Photoshop, so it's quick to pick up in any browser. GIMP is a mature desktop program with more advanced features, plugins and scripting.",
  },
  {
    q: "Are both free?",
    a: "Yes. GIMP is free and open-source software; Picstea is free to use in the browser with no account.",
  },
  {
    q: "Can I open my GIMP files in Picstea?",
    a: "Not GIMP's own .xcf files. Export from GIMP as PSD to keep the layers, or as PNG, and open that in Picstea.",
  },
  {
    q: "Does Picstea work on a Chromebook?",
    a: "Yes. It runs in any current browser, including on Chromebooks and computers where you can't install software.",
  },
];

export default function GimpAlternative() {
  return (
    <LandingPage
      path={PATH}
      title={TITLE}
      lead="GIMP is a powerful, free, open-source image editor you install on your computer. Picstea is a free editor that runs in your browser instead, with Photoshop-style layers, menus and shortcuts — useful when you can't or don't want to install software."
      faqs={FAQS}
    >
      <h2>What both do</h2>
      <ul>
        <li>Free layer-based photo editing: layers, masks, blend modes, selections and filters.</li>
        <li>Retouching tools such as clone and healing brushes.</li>
        <li>
          Opening and exporting PSD, PNG, JPEG and WebP files, with your files kept on your device.
        </li>
        <li>
          Filters you can change after applying them (smart filters in Picstea, non-destructive
          filters in GIMP 3).
        </li>
      </ul>
      <h2>How they differ</h2>
      <ComparisonTable
        other="GIMP"
        checked="October 2026"
        rows={[
          ["Where it runs", "Any current browser", "Desktop app for Windows, macOS and Linux"],
          ["Installing", "Nothing to install", "Download and install"],
          ["Price", "Free, no account", "Free, open source"],
          [
            "Workflow",
            "Photoshop-style menus, panels and shortcuts",
            "GIMP's own interface and shortcuts",
          ],
          [
            "Adjustment layers",
            "Yes (Levels, Curves and 13 more)",
            "Non-destructive filters on layers",
          ],
          ["Own project format", ".picstea", ".xcf"],
          [
            "Plugins and scripting",
            "Recorded actions only",
            "Plugins and scripts (Python, Scheme, C)",
          ],
        ]}
      />
      <h2>Why people choose Picstea</h2>
      <ul>
        <li>
          <strong>Nothing to install.</strong> Open a tab and edit — on a work laptop, a school
          Chromebook or someone else&apos;s computer. It also works offline once installed as an
          app.
        </li>
        <li>
          <strong>Feels like Photoshop.</strong> Menus, panels, adjustment layers, layer styles and
          shortcuts follow Photoshop, so tutorials and habits carry over.
        </li>
        <li>
          <strong>Private by design.</strong> Like GIMP, your images stay on your device: Picstea
          has no server that receives them.
        </li>
      </ul>
      <h2>Where GIMP is the better choice</h2>
      <ul>
        <li>Very large images and print work with colour management and CMYK export options.</li>
        <li>Extending the editor with plugins and scripts, and batch work with scripting.</li>
        <li>Fully open-source software you can inspect and modify.</li>
        <li>
          Advanced tools Picstea doesn&apos;t have yet, such as warp transforms and paths panels.
        </li>
      </ul>
      <p>
        Want to try the browser route? Start with the{" "}
        <Link href="/docs/getting-started">getting started guide</Link>.
      </p>
      <RelatedTools current={PATH} />
    </LandingPage>
  );
}
