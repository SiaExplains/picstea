import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Free online WebP editor and converter",
  description:
    "Open, edit and export WebP images in your browser, or convert WebP to PNG or JPEG and back. Free, no sign-up, and your images never leave your device.",
  lead: "Picstea opens WebP images in your browser, lets you edit them with layers, text and adjustments, and exports WebP, PNG or JPEG. Use it to convert WebP files you downloaded, or to make small WebP images for your website. Nothing is uploaded.",
  faqs: [
    {
      q: "How do I convert WebP to PNG or JPEG?",
      a: "Open the WebP file in Picstea, then choose File → Export As… and pick PNG or JPEG. The conversion happens in your browser.",
    },
    {
      q: "How do I convert a PNG or JPEG to WebP?",
      a: "Open the image, choose File → Export As…, pick WebP and set the quality. WebP keeps transparency, unlike JPEG.",
    },
    {
      q: "Why are WebP files smaller?",
      a: "WebP compresses images more efficiently than JPEG and PNG, so the same picture usually needs fewer bytes. That makes web pages load faster.",
    },
    {
      q: "Are my images uploaded to convert them?",
      a: "No. Opening, editing and converting all happen on your device. Picstea has no server that receives images.",
    },
    {
      q: "Can I edit animated WebP files?",
      a: "No. Picstea opens a still image; animated WebP files are not supported as animations.",
    },
  ],
  body: () => (
    <>
      <h2>Convert or edit a WebP image</h2>
      <ol>
        <li>Open the editor and drop the WebP file on the page.</li>
        <li>Edit it if you like: crop, resize, adjust colours, add text or remove spots.</li>
        <li>
          Choose File → Export As… and pick the format: WebP for small web images, PNG for a
          lossless copy, or JPEG for the widest compatibility.
        </li>
        <li>For WebP and JPEG, set the quality, then save.</li>
      </ol>
      <h2>WebP, PNG or JPEG?</h2>
      <ul>
        <li>
          <strong>WebP</strong> — small files with transparency. Supported by all current browsers;
          some older apps cannot open it.
        </li>
        <li>
          <strong>PNG</strong> — lossless with transparency, but larger. Best for logos, icons and
          screenshots.
        </li>
        <li>
          <strong>JPEG</strong> — small photos that open everywhere, without transparency.
        </li>
      </ul>
      <p>
        The guide <Link href="/blog/png-vs-jpeg-vs-webp">PNG vs JPEG vs WebP</Link> compares them in
        more detail. Only need to change the format? Use the{" "}
        <Link href="/convert/webp-to-png">WebP to PNG</Link> or{" "}
        <Link href="/convert/png-to-webp">PNG to WebP</Link> converter.
      </p>
      <h2>What you can do with a WebP image</h2>
      <ul>
        <li>
          Everything Picstea does for any image: layers, masks, adjustment layers and filters.
        </li>
        <li>Add text, shapes and effects such as drop shadows and strokes.</li>
        <li>Resize with Image → Image Size… before exporting a lighter file.</li>
        <li>
          Process many images at once: record an action (for example Unsharp Mask), then File →
          Automate → Batch… plays it on the files you pick and exports them as WebP in one ZIP file.
        </li>
      </ul>
      <h2>Limitations</h2>
      <p>
        Images can be up to 12,000 pixels per side (36 megapixels), and animated WebP is not
        supported. To shrink files further, see the{" "}
        <Link href="/image-compressor">image compressor</Link> guide.
      </p>
    </>
  ),
};

export default copy;
