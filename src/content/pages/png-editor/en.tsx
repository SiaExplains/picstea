import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Free online PNG editor with transparency",
  description:
    "Edit PNG images in your browser: layers, transparent backgrounds, text and effects, then export a lossless PNG. Free, no sign-up, nothing uploaded.",
  lead: "Picstea opens PNG files in your browser, keeps their transparency, and lets you edit them with layers, text, shapes and effects before exporting a lossless PNG again. It is free, needs no account, and your images never leave your device.",
  faqs: [
    {
      q: "Does Picstea keep PNG transparency?",
      a: "Yes. Transparent areas stay transparent while you edit and when you export as PNG or WebP. JPEG has no transparency, so transparent areas become white there.",
    },
    {
      q: "Is PNG export lossless?",
      a: "Yes. PNG export keeps every pixel exactly as it looks on the canvas. There is no quality setting because nothing is thrown away.",
    },
    {
      q: "Can I make a PNG background transparent?",
      a: "Yes, by hand: use the Magic Eraser to remove a plain background with one click, the Background Eraser for edges, or a selection and Delete. There is no automatic AI background removal yet.",
    },
    {
      q: "Is my PNG uploaded anywhere?",
      a: "No. The file is opened, edited and exported on your device. Picstea has no server that receives images.",
    },
    {
      q: "Can I turn a PNG into a JPEG or WebP?",
      a: "Yes. Open the PNG, then choose JPEG or WebP in File → Export As…. WebP keeps the transparency and is usually much smaller.",
    },
  ],
  body: () => (
    <>
      <h2>Edit a PNG in four steps</h2>
      <ol>
        <li>Open the editor and drop your PNG on the page, or click Open image.</li>
        <li>
          Add what you need on new layers: text with the Type tool, shapes, or another image with
          File → Place Image as Layer.
        </li>
        <li>
          Clean up the background with the Magic Eraser or Background Eraser, or select an area and
          press Delete to make it transparent.
        </li>
        <li>Choose File → Export As…, pick PNG and save.</li>
      </ol>
      <h2>Why PNG</h2>
      <p>
        PNG is lossless and supports transparency, which makes it the right format for logos, icons,
        screenshots, illustrations and anything with sharp edges or text. Photos are usually much
        smaller as JPEG or WebP; see the <Link href="/jpeg-editor">JPEG editor</Link> and{" "}
        <Link href="/webp-editor">WebP editor</Link> pages, and the guide{" "}
        <Link href="/blog/png-vs-jpeg-vs-webp">PNG vs JPEG vs WebP</Link>. To change the format
        without editing, use the <Link href="/convert/png-to-jpg">PNG to JPG</Link> or{" "}
        <Link href="/convert/png-to-webp">PNG to WebP</Link> converter.
      </p>
      <h2>What you can do with a PNG</h2>
      <ul>
        <li>Work with layers, groups, 16 blend modes, opacity and layer masks.</li>
        <li>Add editable text, shapes and paths with the pen tool.</li>
        <li>
          Give text or logos drop shadows, glows, strokes and colour, gradient or pattern overlays.
        </li>
        <li>Erase backgrounds with the Magic Eraser and Background Eraser.</li>
        <li>Recolour with Hue/Saturation, Color Balance and other adjustment layers.</li>
        <li>Resize the image or the canvas, crop, rotate and flip.</li>
        <li>Save the layered work as a PSD or .picstea project to edit again later.</li>
      </ul>
      <h2>Limitations</h2>
      <p>
        Images can be up to 12,000 pixels per side (36 megapixels). Picstea works in 8-bit colour,
        so 16-bit PNGs are reduced to 8 bits. Animated PNGs open as a single image. There is no
        automatic background removal yet. See <Link href="/docs/file-formats">file formats</Link>{" "}
        for the details.
      </p>
    </>
  ),
};

export default copy;
