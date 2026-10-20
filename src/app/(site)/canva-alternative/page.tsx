import type { Metadata } from "next";
import Link from "next/link";
import { pageOpenGraph } from "@/lib/seo/root-metadata";
import { ComparisonTable } from "@/components/site/ComparisonTable";
import { LandingPage, type Faq } from "@/components/site/LandingPage";
import { RelatedTools } from "@/components/site/RelatedTools";

const PATH = "/canva-alternative";
const TITLE = "Picstea vs Canva: when you need a photo editor";
const DESCRIPTION =
  "Canva is for designing from templates; Picstea is for editing photos with layers, masks and PSD files, free and without an account. An honest comparison.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: pageOpenGraph({ url: PATH, title: TITLE, description: DESCRIPTION }),
};

const FAQS: Faq[] = [
  {
    q: "Is Picstea a replacement for Canva?",
    a: "Not for everything. Canva is a design platform with templates, presentations, video and team collaboration. Picstea is a photo editor: it's the better tool for retouching, layered editing and Photoshop files.",
  },
  {
    q: "Do I need an account?",
    a: "Not for Picstea. Canva needs an account to create and save designs, which are stored in Canva's cloud.",
  },
  {
    q: "Can I use both?",
    a: "Yes. Edit or retouch a photo in Picstea, export a PNG or JPEG, and upload it to Canva for your layout.",
  },
  {
    q: "Where are my files stored?",
    a: "In Picstea, on your own device: projects are saved in your browser and exports go to your downloads. Nothing is uploaded.",
  },
];

export default function CanvaAlternative() {
  return (
    <LandingPage
      path={PATH}
      title={TITLE}
      lead="Canva is a design platform for making social posts, presentations and more from templates. Picstea is a photo editor: layers, masks, adjustment layers, retouching and PSD files, free in your browser with no account and nothing uploaded. Use Canva to lay out a design; use Picstea when the photo itself needs work."
      faqs={FAQS}
    >
      <h2>How they differ</h2>
      <ComparisonTable
        other="Canva"
        checked="October 2026"
        rows={[
          ["Made for", "Editing photos and images", "Designing from templates"],
          ["Account", "None", "Required"],
          [
            "Where your work is kept",
            "On your device",
            "In your Canva account (5 GB on the free plan)",
          ],
          ["Templates", "Ready-made document sizes", "Over a million templates"],
          [
            "Layers and masks",
            "Full layer workflow, masks, blend modes",
            "Arrange elements on a page",
          ],
          [
            "Photoshop files",
            "Opens and saves layered PSD",
            "Imports PSD on the desktop website; some parts become images",
          ],
          ["Price", "Free", "Free plan; paid Pro, Business and Enterprise plans"],
        ]}
      />
      <h2>When Picstea is the better fit</h2>
      <ul>
        <li>
          <strong>The photo needs editing:</strong> exposure, colour, curves, retouching blemishes,
          sharpening, blurring the background.
        </li>
        <li>
          <strong>Precise work:</strong> selections, masks, blend modes and layer styles like in
          Photoshop.
        </li>
        <li>
          <strong>Privacy:</strong> no account, and your images never leave your device.
        </li>
        <li>
          <strong>Photoshop files:</strong> open a PSD with its layers and editable text, and save a
          layered PSD again.
        </li>
      </ul>
      <h2>When Canva is the better fit</h2>
      <ul>
        <li>Social posts, presentations, flyers and videos built quickly from templates.</li>
        <li>Teams working on the same designs, with brand kits and sharing.</li>
        <li>A large library of stock photos, graphics and fonts.</li>
      </ul>
      <p>
        Many people use both. See how to <Link href="/add-text-to-photo">add text to a photo</Link>{" "}
        or <Link href="/blur-background">blur a background</Link> in Picstea.
      </p>
      <RelatedTools current={PATH} />
    </LandingPage>
  );
}
