import type { Metadata } from "next";
import Link from "next/link";
import { pageOpenGraph } from "@/lib/seo/root-metadata";
import { LandingPage, type Faq } from "@/components/site/LandingPage";
import { RelatedTools } from "@/components/site/RelatedTools";

const PATH = "/jpeg-editor";
const TITLE = "Free online JPEG editor";
const DESCRIPTION =
  "Edit JPG and JPEG photos in your browser with layers, adjustments, retouching and filters, then export a JPEG at the quality you choose. Free, nothing uploaded.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: pageOpenGraph({ url: PATH, title: TITLE, description: DESCRIPTION }),
};

const FAQS: Faq[] = [
  {
    q: "Is JPG the same as JPEG?",
    a: "Yes. JPG and JPEG are two names for the same format. Picstea opens both and saves exports with the .jpg extension.",
  },
  {
    q: "Will editing make my JPEG lose quality?",
    a: "Not while you edit: Picstea works on the decoded pixels, and adjustment layers never change the original. Quality is only reduced once, when you export a JPEG. Choose a high quality (90 is the default) to keep it sharp.",
  },
  {
    q: "Are my photos uploaded?",
    a: "No. Photos are opened, edited and exported on your device. Picstea has no server that receives your images.",
  },
  {
    q: "Is the photo the right way up?",
    a: "Yes. Picstea follows the orientation the camera stored in the file, so photos from phones open upright.",
  },
  {
    q: "Can a JPEG have a transparent background?",
    a: "No, the format has no transparency, so transparent areas become white on export. Export as PNG or WebP to keep transparency.",
  },
];

export default function JpegEditor() {
  return (
    <LandingPage
      path={PATH}
      title={TITLE}
      lead="Picstea is a free JPEG editor that runs in your browser. Open a JPG photo, fix its light and colour with adjustment layers, retouch it, and export a new JPEG at the quality you choose. Your photos never leave your device."
      faqs={FAQS}
    >
      <h2>Edit a JPEG in four steps</h2>
      <ol>
        <li>Open the editor and drop your JPG or JPEG photo on the page.</li>
        <li>
          Fix exposure and colour with Layer → New Adjustment Layer: Levels, Curves,
          Brightness/Contrast, Hue/Saturation, Vibrance or Color Balance. Or use Filter → Camera Raw
          for everything in one dialog.
        </li>
        <li>
          Remove spots with the Spot Healing Brush or Clone Stamp, and crop or straighten with the
          Crop tool.
        </li>
        <li>Choose File → Export As…, pick JPEG, set the quality and save.</li>
      </ol>
      <h2>What you can do with a JPEG</h2>
      <ul>
        <li>Correct light and colour with adjustment layers you can change at any time.</li>
        <li>
          Retouch with the Healing Brush, Spot Healing Brush, Clone Stamp, Red Eye, Dodge, Burn and
          Sponge.
        </li>
        <li>Sharpen, reduce noise or blur the background with the Filter menu.</li>
        <li>Add text, shapes, logos and watermarks on their own layers.</li>
        <li>Resize the photo with Image → Image Size… or add a border with Canvas Size….</li>
        <li>
          Apply the same edits to many photos: record an action, then use File → Automate → Batch…
          to get the results as one ZIP file.
        </li>
      </ul>
      <h2>When to use JPEG</h2>
      <p>
        JPEG is the standard format for photos: files are small and every device can open them. For
        graphics, text or transparency use <Link href="/png-editor">PNG</Link>; for the smallest
        files on a website, try <Link href="/webp-editor">WebP</Link>. To make a JPEG smaller, see
        the <Link href="/image-compressor">image compressor</Link> guide, and to compare the
        formats, read <Link href="/blog/png-vs-jpeg-vs-webp">PNG vs JPEG vs WebP</Link>.
      </p>
      <h2>Limitations</h2>
      <p>
        Images can be up to 12,000 pixels per side (36 megapixels). Camera RAW files cannot be
        opened yet, and camera details such as the date and location are not copied into exported
        files.
      </p>
      <RelatedTools current={PATH} />
    </LandingPage>
  );
}
