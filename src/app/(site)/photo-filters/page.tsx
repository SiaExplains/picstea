import type { Metadata } from "next";
import Link from "next/link";
import { pageOpenGraph } from "@/lib/seo/root-metadata";
import { LandingPage, type Faq } from "@/components/site/LandingPage";
import { RelatedTools } from "@/components/site/RelatedTools";

const PATH = "/photo-filters";
const TITLE = "Free photo filters and effects online";
const DESCRIPTION =
  "Apply 60+ photo filters in your browser with a live preview: blur, sharpen, noise, oil paint, halftone, Camera Raw, Liquify and more. Free, nothing uploaded.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: pageOpenGraph({ url: PATH, title: TITLE, description: DESCRIPTION }),
};

const FAQS: Faq[] = [
  {
    q: "Can I change a filter after applying it?",
    a: "Yes, if you apply it as a smart filter: convert the layer with Layer → Smart Object → Convert to Smart Object, then apply the filter. You can change or remove it at any time.",
  },
  {
    q: "Can I apply a filter to part of a photo?",
    a: "Yes. Select an area first; only the selection changes, and feathered edges blend smoothly.",
  },
  {
    q: "Are these the same filters as in Photoshop?",
    a: "The Filter menu follows Photoshop and Photopea, so filters are where you expect them. They are Picstea's own implementations, so results can differ slightly.",
  },
  {
    q: "Are there Instagram-style one-click presets?",
    a: "Not as a preset list. For a quick look, use Camera Raw, Photo Filter or Gradient Map adjustment layers, or the artistic effects in the Filter Gallery.",
  },
  {
    q: "Are my photos uploaded?",
    a: "No. Every filter runs in your browser. Picstea has no server that receives images.",
  },
];

export default function PhotoFilters() {
  return (
    <LandingPage
      path={PATH}
      title={TITLE}
      lead="Picstea has more than 60 photo filters, laid out like Photoshop's Filter menu, each with a live preview on your photo: blurs, sharpening, noise reduction, distortions, artistic effects, Camera Raw and Liquify. They're free and run in your browser, so your photos are never uploaded."
      faqs={FAQS}
    >
      <h2>Apply a filter in four steps</h2>
      <ol>
        <li>Open the editor and drop your photo on the page.</li>
        <li>
          Optional: right-click the layer and convert it to a smart object, so the filter stays
          editable.
        </li>
        <li>Choose a filter from the Filter menu and adjust it while watching the canvas.</li>
        <li>Press OK, then File → Export As… to save the result.</li>
      </ol>
      <h2>Popular filters</h2>
      <ul>
        <li>
          <strong>Camera Raw</strong> — white balance, exposure, contrast, highlights, shadows,
          clarity, dehaze, vibrance and saturation in one dialog.
        </li>
        <li>
          <strong>Blur</strong> — Gaussian, Motion, Radial, Lens (bokeh) and Surface, plus the Blur
          Gallery&apos;s Tilt-Shift, Iris and Field blur for a shallow depth of field.
        </li>
        <li>
          <strong>Sharpen</strong> — Unsharp Mask and Smart Sharpen for crisp detail.
        </li>
        <li>
          <strong>Noise</strong> — Reduce Noise and Dust &amp; Scratches for night shots and old
          scans, or Add Noise for film grain.
        </li>
        <li>
          <strong>Filter Gallery</strong> — artistic looks such as Watercolor, Dry Brush, Cutout,
          Poster Edges and Film Grain.
        </li>
        <li>
          <strong>Stylize and Pixelate</strong> — Oil Paint, Emboss, Find Edges, Color Halftone,
          Mosaic and Crystallize.
        </li>
        <li>
          <strong>Distort</strong> — Twirl, Spherize, Ripple, Wave and Polar Coordinates.
        </li>
        <li>
          <strong>Liquify</strong> — push, twirl, pucker and bloat pixels with a brush.
        </li>
        <li>
          <strong>Lens Correction</strong> — fix barrel distortion, colour fringes and vignetting.
        </li>
      </ul>
      <p>
        The <Link href="/docs/filters">filters guide</Link> lists every filter in the menu.
      </p>
      <h2>Colour looks with adjustment layers</h2>
      <p>
        For colour grading rather than effects, use adjustment layers: Photo Filter for warm or cool
        tones, Gradient Map for duotones, Black &amp; White, Hue/Saturation and Curves. They sit on
        their own layer, so the photo underneath never changes.
      </p>
      <h2>Limitations</h2>
      <p>
        Filters work on pixel layers and smart objects. Images can be up to 12,000 pixels per side
        (36 megapixels), and there are no AI filters such as sky replacement or style transfer.
      </p>
      <RelatedTools current={PATH} />
    </LandingPage>
  );
}
