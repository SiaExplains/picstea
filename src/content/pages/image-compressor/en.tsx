import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Compress an image online without uploading it",
  description:
    "Make images smaller in your browser by resizing them and exporting JPEG or WebP at a lower quality. Free, private, and nothing is uploaded to a server.",
  lead: "Picstea makes images smaller in your browser: resize them to the size you need, then export them as JPEG or WebP at a lower quality. Unlike most online compressors, your image is never uploaded to a server.",
  faqs: [
    {
      q: "What quality should I choose?",
      a: "For photos on the web, 70–85 usually looks the same as the original at a fraction of the size. Go lower only for thumbnails; check the result before using it.",
    },
    {
      q: "Is WebP smaller than JPEG?",
      a: "Usually, yes: at the same visual quality a WebP file is often noticeably smaller than a JPEG, and it can keep transparency.",
    },
    {
      q: "Can I compress a PNG?",
      a: "PNG export is always lossless, so it has no quality setting. To make a PNG smaller, resize it, or export it as WebP (which keeps transparency) or JPEG.",
    },
    {
      q: "Can I compress to an exact file size, like under 100 KB?",
      a: "Not automatically. Picstea has no target-size setting and doesn't show the file size before saving; lower the quality or the dimensions and export again until it fits.",
    },
    {
      q: "Is it private?",
      a: "Yes. Compression happens in your browser. Unlike most online compressors, Picstea never uploads your image to a server.",
    },
  ],
  body: () => (
    <>
      <h2>Compress an image in four steps</h2>
      <ol>
        <li>Open the editor and drop your image on the page.</li>
        <li>
          If it is larger than you need, choose Image → Image Size… and reduce the width. Halving
          the width cuts the number of pixels to a quarter, which is the biggest saving.
        </li>
        <li>Choose File → Export As… and pick JPEG (photos) or WebP (photos and graphics).</li>
        <li>Lower the quality slider, for example to 80, and save.</li>
      </ol>
      <h2>What makes an image file smaller</h2>
      <ul>
        <li>
          <strong>Fewer pixels.</strong> A 4,000-pixel-wide phone photo shown 1,200 pixels wide on a
          website wastes most of its bytes.
        </li>
        <li>
          <strong>Lossy formats.</strong> JPEG and WebP drop detail the eye barely notices. The
          quality setting (1–100, default 90) controls how much.
        </li>
        <li>
          <strong>The right format.</strong> Photos as JPEG or WebP; logos and screenshots as PNG or
          WebP. A photo saved as PNG is often several times larger than the same photo as JPEG.
        </li>
      </ul>
      <h2>Why compress in the browser</h2>
      <p>
        Most image compressors upload your file to their server, process it there and send it back.
        Picstea does the work on your own device, so private photos, documents and screenshots stay
        private, and it works offline once the app is installed.
      </p>
      <h2>Limitations</h2>
      <p>
        Picstea is an image editor, not a dedicated optimiser: it has no lossless PNG optimiser, no
        target file size and no preview of the file size before saving. To compress many images at
        once, record an action and use File → Automate → Batch… to export them as JPEG or WebP in
        one ZIP file (batch processing can&apos;t resize yet). Learn more about{" "}
        <Link href="/docs/file-formats">file formats</Link>.
      </p>
    </>
  ),
};

export default copy;
