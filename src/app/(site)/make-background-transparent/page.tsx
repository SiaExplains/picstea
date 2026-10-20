import type { Metadata } from "next";
import Link from "next/link";
import { pageOpenGraph } from "@/lib/seo/root-metadata";
import { LandingPage, type Faq } from "@/components/site/LandingPage";
import { RelatedTools } from "@/components/site/RelatedTools";

const PATH = "/make-background-transparent";
const TITLE = "How to make a background transparent online";
const DESCRIPTION =
  "Remove a plain background by hand with the Magic Eraser or Background Eraser, then save a transparent PNG or WebP. Free, in your browser, nothing uploaded.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: pageOpenGraph({ url: PATH, title: TITLE, description: DESCRIPTION }),
};

const FAQS: Faq[] = [
  {
    q: "Does Picstea remove backgrounds automatically?",
    a: "No, not yet. There is no AI background removal; you remove the background with the erasers or a selection. That works best on plain, evenly coloured backgrounds such as product shots and logos.",
  },
  {
    q: "Which format keeps the transparency?",
    a: "PNG (lossless) or WebP (smaller). JPEG has no transparency, so transparent areas become white there.",
  },
  {
    q: "How do I know the background is really gone?",
    a: "Transparent areas show a grey and white checkerboard on the canvas. Anything still visible over the checkerboard will be in the exported image.",
  },
  {
    q: "Is my image uploaded?",
    a: "No. Everything happens in your browser. Picstea has no server that receives images.",
  },
];

export default function MakeBackgroundTransparent() {
  return (
    <LandingPage
      path={PATH}
      title={TITLE}
      lead="Picstea makes a background transparent by hand, not with AI: click a plain background with the Magic Eraser, clean the edges with the Background Eraser, and export a PNG. It's free, works in your browser, and nothing is uploaded."
      faqs={FAQS}
    >
      <h2>Remove a plain background in four steps</h2>
      <ol>
        <li>Open the editor and drop your image on the page.</li>
        <li>
          Choose the Magic Eraser (in the eraser group of the toolbar) and click the background.
          Every connected pixel of a similar colour becomes transparent; raise the tolerance in the
          options bar if some of it stays.
        </li>
        <li>
          Clean up what&apos;s left along the edges with the Background Eraser, which erases colours
          close to the one under the centre of the brush and keeps the rest.
        </li>
        <li>Choose File → Export As…, pick PNG or WebP, and save.</li>
      </ol>
      <h2>For busy backgrounds: select the subject instead</h2>
      <ol>
        <li>
          Trace the subject with the Lasso or Polygonal Lasso (or select the background with the
          Magic Wand or Color Range and choose Select → Inverse).
        </li>
        <li>Choose Select → Inverse so the background is selected, then press Delete.</li>
        <li>
          Prefer to keep the background for later? Use a layer mask instead of deleting: everything
          the mask hides becomes transparent in the export, and you can repaint it any time.
        </li>
      </ol>
      <h2>Tips</h2>
      <ul>
        <li>Zoom in on the edges; a 1–2 pixel Feather avoids hard, jagged outlines.</li>
        <li>
          Logos on white: Filter → Other → Color to Alpha turns white into transparency while
          keeping soft edges.
        </li>
        <li>
          Layer masks are explained in{" "}
          <Link href="/blog/layers-and-masks-explained">layers and masks explained</Link>.
        </li>
      </ul>
      <h2>Limitations</h2>
      <p>
        Without AI, hair, fur and backgrounds that share colours with the subject take patience.
        There is no refine-edge or &quot;select subject&quot; tool yet.
      </p>
      <RelatedTools current={PATH} />
    </LandingPage>
  );
}
