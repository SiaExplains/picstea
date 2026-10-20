import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Resize an image online",
  description:
    "Resize images to exact pixel dimensions in your browser, keep proportions, change the canvas or crop to a size. Free, no sign-up, and nothing is uploaded.",
  lead: "To resize an image online with Picstea, open it in the editor, choose Image → Image Size…, type the new width or height in pixels and export. The proportions stay correct, it is free, and the image never leaves your device.",
  faqs: [
    {
      q: "How do I resize an image without stretching it?",
      a: "In Image → Image Size…, keep Constrain proportions ticked and type only the width or the height; the other value follows.",
    },
    {
      q: "What is the difference between Image Size and Canvas Size?",
      a: "Image Size scales the whole picture. Canvas Size keeps the picture as it is and adds or removes space around it, for example to add a border or make it square.",
    },
    {
      q: "Can I make an image smaller and then bigger again without losing quality?",
      a: "Yes, inside Picstea: pixel layers keep their original pixels and are only drawn at the new size, so scaling back up restores the detail. The exported file has the size you chose.",
    },
    {
      q: "Can I resize many images at once?",
      a: "Not yet. Image Size cannot be recorded in an action, so batch processing can't resize. Resize images one at a time for now.",
    },
    {
      q: "Are my images uploaded?",
      a: "No. Resizing and exporting happen on your device. Picstea has no server that receives images.",
    },
  ],
  body: () => (
    <>
      <h2>Resize an image in four steps</h2>
      <ol>
        <li>Open the editor and drop your image (PNG, JPEG, WebP, GIF or PSD) on the page.</li>
        <li>Choose Image → Image Size….</li>
        <li>
          With Constrain proportions ticked, type the new width or height in pixels. You can also
          set the resolution (ppi) for printing.
        </li>
        <li>Choose File → Export As…, pick a format and save.</li>
      </ol>
      <h2>Other ways to change the size</h2>
      <ul>
        <li>
          <strong>Canvas Size…</strong> (Image menu) adds or removes space around the picture.
          Choose one of nine anchors to say which side grows, or tick Relative to add a fixed
          amount, for example 20 pixels on every side.
        </li>
        <li>
          <strong>Crop tool</strong> cuts the picture to the area you drag. Cropping is
          non-destructive, so you can change it later.
        </li>
        <li>
          <strong>Trim…</strong> removes transparent or single-colour borders automatically.
        </li>
        <li>
          <strong>New document presets</strong> — about 80 ready-made sizes for social posts, print,
          photos, screens and icons, in pixels, inches, centimetres or millimetres. Place your image
          into one with File → Place Image as Layer and scale it to fit.
        </li>
      </ul>
      <h2>Tips for good results</h2>
      <ul>
        <li>
          Make images smaller rather than larger: enlarging cannot add detail that isn&apos;t there.
        </li>
        <li>After shrinking a photo, Filter → Sharpen → Unsharp Mask brings back crisp edges.</li>
        <li>
          For the web, export as WebP or JPEG to keep the file small; see the{" "}
          <Link href="/image-compressor">image compressor</Link> guide.
        </li>
      </ul>
      <h2>Limitations</h2>
      <p>
        Images can be up to 12,000 pixels per side (36 megapixels). Batch resizing isn&apos;t
        available yet, and there is no AI upscaling.
      </p>
    </>
  ),
};

export default copy;
