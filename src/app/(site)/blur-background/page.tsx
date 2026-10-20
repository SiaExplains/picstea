import type { Metadata } from "next";
import Link from "next/link";
import { pageOpenGraph } from "@/lib/seo/root-metadata";
import { LandingPage, type Faq } from "@/components/site/LandingPage";
import { RelatedTools } from "@/components/site/RelatedTools";

const PATH = "/blur-background";
const TITLE = "How to blur a photo background online";
const DESCRIPTION =
  "Blur a photo background in your browser: select the subject and blur the rest with Lens Blur, or use Tilt-Shift and Iris Blur. Free, nothing uploaded.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: pageOpenGraph({ url: PATH, title: TITLE, description: DESCRIPTION }),
};

const FAQS: Faq[] = [
  {
    q: "Can Picstea select the person automatically?",
    a: "Not yet — there is no AI subject selection. Select the subject by hand with the lasso, polygonal lasso or magic wand; Color Range helps when the background is one colour.",
  },
  {
    q: "Which blur looks most like a real camera?",
    a: "Lens Blur: it imitates an out-of-focus lens and can make bright spots glow like bokeh. Gaussian Blur is smoother and more even.",
  },
  {
    q: "Can I change the blur later?",
    a: "Yes, if you blur a copy: press Cmd/Ctrl+J to duplicate the layer first, blur the copy, then hide or delete it to go back. Every filter is also one undo step.",
  },
  {
    q: "Is my photo uploaded?",
    a: "No. The blur is calculated in your browser. Picstea has no server that receives images.",
  },
];

export default function BlurBackground() {
  return (
    <LandingPage
      path={PATH}
      title={TITLE}
      lead="To blur a photo background in Picstea, select the subject, choose Select → Inverse so the background is selected, then apply Filter → Blur → Lens Blur. It works in your browser, it's free, and your photo is never uploaded."
      faqs={FAQS}
    >
      <h2>Blur the background in five steps</h2>
      <ol>
        <li>Open the editor and drop your photo on the page.</li>
        <li>
          Select the subject: trace it with the Lasso or Polygonal Lasso, or click the background
          with the Magic Wand and use Select → Inverse to swap.
        </li>
        <li>
          Choose Select → Feather… with a few pixels, so the edge between sharp and blurred is soft.
        </li>
        <li>
          With the background selected, choose Filter → Blur → Lens Blur… and raise the Radius while
          watching the photo. Specular brightness makes highlights glow like bokeh.
        </li>
        <li>Press OK, deselect, and export with File → Export As….</li>
      </ol>
      <h2>Without a selection: Blur Gallery</h2>
      <p>
        For a quick depth-of-field look, Filter → Blur Gallery keeps part of the photo sharp without
        selecting anything:
      </p>
      <ul>
        <li>
          <strong>Tilt-Shift</strong> keeps a horizontal band sharp and blurs above and below — the
          &quot;miniature&quot; look for landscapes and streets.
        </li>
        <li>
          <strong>Iris Blur</strong> keeps an oval sharp around the subject and blurs the rest —
          good for portraits.
        </li>
        <li>
          <strong>Field Blur</strong> blurs the whole picture evenly.
        </li>
      </ul>
      <p>Where Photoshop uses pins on the canvas, Picstea sets the centre and size with sliders.</p>
      <h2>Tips</h2>
      <ul>
        <li>
          Hair and fuzzy edges are the hardest part. Feather a little more, and zoom in to check the
          edge before you blur.
        </li>
        <li>To keep the original, duplicate the layer (Cmd/Ctrl+J) and blur the copy.</li>
        <li>
          More about selecting: <Link href="/docs/selections">selections guide</Link>. Every blur is
          in the <Link href="/docs/filters">filters guide</Link>.
        </li>
      </ul>
      <h2>Limitations</h2>
      <p>
        There is no automatic subject or portrait-mode detection yet, and no depth map: the blur is
        the same strength everywhere it applies, rather than growing with distance.
      </p>
      <RelatedTools current={PATH} />
    </LandingPage>
  );
}
