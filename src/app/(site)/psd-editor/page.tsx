import type { Metadata } from "next";
import Link from "next/link";
import { LandingPage, type Faq } from "@/components/site/LandingPage";

const PATH = "/psd-editor";
const TITLE = "Online PSD editor — open Photoshop files in your browser";
const DESCRIPTION =
  "Open and edit PSD files online with their layers, groups and masks, and save them back as PSD. The file stays on your computer — nothing is uploaded.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { url: PATH, title: TITLE, description: DESCRIPTION },
};

const FAQS: Faq[] = [
  {
    q: "Can I open a PSD without Photoshop?",
    a: "Yes. MYLPER opens 8-bit RGB and greyscale PSD files in the browser, with their layers, groups, masks, blend modes, editable text, adjustment layers, shape layers, smart objects and common layer styles.",
  },
  {
    q: "Is my PSD uploaded to a server?",
    a: "No. The file is read inside your browser and never leaves your device.",
  },
  {
    q: "Can I save as PSD again?",
    a: "Yes. File → Export As… → PSD writes a layered PSD with groups, masks, vector masks, clipping masks, adjustment layers, opacity and blend modes.",
  },
  {
    q: "What doesn't come across?",
    a: "Some Photoshop features have no MYLPER equivalent yet: adjustments such as Vibrance or Color Balance, bevel and inner shadow styles, warped text and smart filters keep their look as pixels or are left out. Text may need a font check. MYLPER lists what changed when the file opens.",
  },
];

export default function PsdEditor() {
  return (
    <LandingPage
      path={PATH}
      title={TITLE}
      lead="MYLPER opens Photoshop (PSD) files directly in your browser, keeps their layers, and lets you save them back as PSD — without uploading the file anywhere."
      faqs={FAQS}
    >
      <h2>How to edit a PSD online</h2>
      <ol>
        <li>Open the editor and choose Open image, or drop the .psd file on the page.</li>
        <li>Your layers appear in the Layers panel, including groups and masks.</li>
        <li>Edit: move and transform layers, paint, mask, add adjustment layers.</li>
        <li>Save with File → Export As… → PSD, or export PNG, JPEG, WebP or PDF.</li>
      </ol>
      <h2>Supported</h2>
      <ul>
        <li>8-bit RGB and greyscale PSD files up to 12,000 pixels per side.</li>
        <li>Pixel layers, groups, layer names, opacity, visibility and blend modes.</li>
        <li>Layer masks, including masks on groups; vector masks and clipping masks.</li>
        <li>Editable text layers (first style of each layer; fonts mapped to common fonts).</li>
        <li>
          Adjustment layers: Levels, Curves, Brightness/Contrast, Hue/Saturation, Exposure, Invert,
          Posterize, Threshold, Black &amp; White.
        </li>
        <li>Shape and solid colour fill layers, embedded smart objects.</li>
        <li>Layer styles: drop shadow, outer glow, stroke and colour overlay.</li>
      </ul>
      <h2>Not supported yet</h2>
      <ul>
        <li>PSB (large document) files, 16/32-bit colour and CMYK.</li>
        <li>
          Vibrance, Color Balance and other adjustments; bevel, inner shadow, gradient and pattern
          styles; warped text; Photoshop smart filters and linked smart objects.
        </li>
        <li>
          Saving text, shapes, smart objects and styles back to PSD keeps their look as pixels.
        </li>
      </ul>
      <p>
        More detail in <Link href="/docs/file-formats">file formats</Link>.
      </p>
    </LandingPage>
  );
}
