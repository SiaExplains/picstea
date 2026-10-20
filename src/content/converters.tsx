import Link from "next/link";
import type { ReactNode } from "react";
import type { Faq } from "@/components/site/LandingPage";
import { CONVERSIONS } from "@/editor/formats/convert";

/**
 * The converter pages (`/convert/<id>`). Each explains one conversion; the "Convert now" button
 * opens the editor at `/?convert=<id>`, where the file is converted under the editor's strict
 * security policy, never on a page that may run ad code (ADR-0013). Every claim must hold for
 * `convertFile` in src/editor/formats/convert.ts.
 */
export interface ConverterPage {
  /** Matches an id in CONVERSIONS. */
  readonly id: string;
  readonly title: string;
  /** 50–160 characters (site audit). */
  readonly description: string;
  readonly lead: string;
  readonly body: () => ReactNode;
  readonly faqs: readonly Faq[];
}

const PRIVATE: Faq = {
  q: "Is my file uploaded?",
  a: "No. The conversion runs in your browser, in Picstea's editor, which has no server to receive files and blocks sending them anywhere. Nothing is saved in the browser either.",
};

const MANY: Faq = {
  q: "Can I convert several files at once?",
  a: "Yes. Pick or drop up to 200 files; one file is saved directly, several are saved together in one ZIP file.",
};

export const CONVERTERS: readonly ConverterPage[] = [
  {
    id: "webp-to-png",
    title: "Convert WebP to PNG online",
    description:
      "Turn WebP images into PNG files in your browser, with transparency kept and no quality loss. Free, no sign-up, and your images are never uploaded.",
    lead: "To convert WebP to PNG, click Convert now, drop your .webp files and save the PNGs. Transparency is kept, the PNG is lossless, and the conversion happens on your own device.",
    body: () => (
      <>
        <h2>Why convert WebP to PNG?</h2>
        <p>
          Websites serve WebP because it is small, but some apps, older image viewers and upload
          forms still only accept PNG or JPEG. PNG opens everywhere and keeps transparent
          backgrounds, so it is the safe choice for logos, icons and screenshots saved from the web.
        </p>
        <h2>What to expect</h2>
        <ul>
          <li>Transparent areas stay transparent.</li>
          <li>
            PNG is lossless, so the result looks exactly like the WebP — but it is usually larger,
            often several times for photos.
          </li>
          <li>Animated WebP files are converted as a single still image.</li>
        </ul>
        <p>
          Need a smaller file instead? <Link href="/convert/webp-to-jpg">Convert WebP to JPG</Link>.
        </p>
      </>
    ),
    faqs: [
      {
        q: "Will the PNG look worse than the WebP?",
        a: "No. PNG keeps every pixel exactly, so the PNG looks the same as the WebP. It can't restore detail a lossy WebP already dropped.",
      },
      PRIVATE,
      MANY,
      {
        q: "Can I edit the image before converting?",
        a: "Yes. Open it in the editor instead (File → Open), make your changes, then choose File → Export As… and pick PNG.",
      },
    ],
  },
  {
    id: "webp-to-jpg",
    title: "Convert WebP to JPG online",
    description:
      "Convert WebP images to JPG in your browser and choose the quality. Free, private and nothing is uploaded — works for single files or a batch.",
    lead: "To convert WebP to JPG, click Convert now, drop your .webp files, set the quality and save. The JPGs open in every app, and the conversion happens on your device.",
    body: () => (
      <>
        <h2>Why convert WebP to JPG?</h2>
        <p>
          JPG (JPEG) is the format every phone, camera app, printer service and email client
          understands. Converting a WebP photo to JPG keeps the file small while making sure anyone
          can open it.
        </p>
        <h2>What to expect</h2>
        <ul>
          <li>
            JPG has no transparency: transparent areas become white. Use{" "}
            <Link href="/convert/webp-to-png">WebP to PNG</Link> to keep them.
          </li>
          <li>Quality 80–90 keeps photos looking the same at a small size; 90 is the default.</li>
          <li>Animated WebP files are converted as a single still image.</li>
        </ul>
      </>
    ),
    faqs: [
      {
        q: "Is JPG the same as JPEG?",
        a: "Yes, they are two names for the same format. Picstea saves converted files with the .jpg extension.",
      },
      {
        q: "Why is my background white?",
        a: "JPG can't store transparency, so transparent pixels are filled with white. Convert to PNG or keep WebP if you need transparency.",
      },
      PRIVATE,
      MANY,
    ],
  },
  {
    id: "png-to-jpg",
    title: "Convert PNG to JPG online",
    description:
      "Convert PNG images to smaller JPG files in your browser and pick the quality. Free, no sign-up, nothing uploaded; transparent areas become white.",
    lead: "To convert PNG to JPG, click Convert now, drop your PNG files, choose a quality and save. Photos usually shrink to a fraction of their PNG size, and nothing leaves your device.",
    body: () => (
      <>
        <h2>Why convert PNG to JPG?</h2>
        <p>
          PNG is lossless, which makes photos and screenshots of photos very large. JPG compresses
          photos far better, so converting is the quickest way to make an image small enough for
          email, a website or an upload form with a size limit.
        </p>
        <h2>What to expect</h2>
        <ul>
          <li>Transparent areas become white, because JPG has no transparency.</li>
          <li>
            Text, logos and flat graphics can show soft edges in JPG. For those,{" "}
            <Link href="/convert/png-to-webp">PNG to WebP</Link> is usually the better choice.
          </li>
          <li>Lower quality means a smaller file; check the result before using it.</li>
        </ul>
        <p>
          To make the file smaller still, resize it first — see the{" "}
          <Link href="/image-compressor">image compressor</Link> guide.
        </p>
      </>
    ),
    faqs: [
      {
        q: "How much smaller will the JPG be?",
        a: "It depends on the image. A photo saved as PNG often becomes several times smaller as a JPG at quality 80–90; flat graphics shrink less.",
      },
      {
        q: "Can I keep a transparent background?",
        a: "Not in JPG. Convert to WebP instead, which is small and keeps transparency.",
      },
      PRIVATE,
      MANY,
    ],
  },
  {
    id: "jpg-to-png",
    title: "Convert JPG to PNG online",
    description:
      "Convert JPG or JPEG photos to lossless PNG files in your browser. Free, no sign-up, private: your photos are never uploaded to a server.",
    lead: "To convert JPG to PNG, click Convert now, drop your JPG or JPEG files and save the PNGs. The PNG keeps the picture exactly as it is, and the conversion happens on your device.",
    body: () => (
      <>
        <h2>Why convert JPG to PNG?</h2>
        <p>
          Some tools and upload forms ask for PNG, and PNG is the better starting point when you
          want to edit an image repeatedly: it never loses quality when saved again, while every new
          JPG save compresses the picture once more.
        </p>
        <h2>What to expect</h2>
        <ul>
          <li>The PNG looks exactly like the JPG, including any compression artefacts.</li>
          <li>The file gets larger, because PNG is lossless.</li>
          <li>
            Converting doesn&apos;t add transparency. To remove a background, open the photo in the
            editor and use the Magic Eraser or Background Eraser, then export a PNG.
          </li>
          <li>
            Phone photos are turned the right way up, using the orientation the camera stored.
          </li>
        </ul>
      </>
    ),
    faqs: [
      {
        q: "Does converting to PNG improve quality?",
        a: "No. PNG preserves the image exactly but can't bring back detail JPEG compression removed. It stops further loss when you save again.",
      },
      {
        q: "Is the camera information kept?",
        a: "No. Details such as the date, camera model and location are not copied into the PNG.",
      },
      PRIVATE,
      MANY,
    ],
  },
  {
    id: "png-to-webp",
    title: "Convert PNG to WebP online",
    description:
      "Convert PNG images to small WebP files for the web, with transparency kept and an adjustable quality. Free, private, and nothing is uploaded.",
    lead: "To convert PNG to WebP, click Convert now, drop your PNG files, choose a quality and save. WebP files keep transparency and are usually much smaller, which makes web pages load faster.",
    body: () => (
      <>
        <h2>Why convert PNG to WebP?</h2>
        <p>
          Images are often the heaviest part of a web page. WebP stores the same picture in fewer
          bytes than PNG or JPEG and, unlike JPEG, keeps transparent backgrounds — so it is a good
          fit for product photos, illustrations and logos on a website.
        </p>
        <h2>What to expect</h2>
        <ul>
          <li>Transparency is kept.</li>
          <li>
            WebP export is lossy: quality 80–90 looks the same for most images. Use 100 for
            screenshots with small text.
          </li>
          <li>
            Every current browser shows WebP; some older desktop apps can&apos;t open it. Convert
            back with <Link href="/convert/webp-to-png">WebP to PNG</Link> if needed.
          </li>
        </ul>
      </>
    ),
    faqs: [
      {
        q: "Will my website show WebP images?",
        a: "Yes. All current versions of Chrome, Edge, Firefox and Safari display WebP.",
      },
      {
        q: "Can I make a lossless WebP?",
        a: "Not yet. Picstea's WebP export is lossy; for an exact copy keep the PNG.",
      },
      PRIVATE,
      MANY,
    ],
  },
  {
    id: "svg-to-png",
    title: "Convert SVG to PNG online",
    description:
      "Turn SVG vector graphics into PNG images with transparency in your browser. Free, safe — scripts in SVG files never run — and nothing is uploaded.",
    lead: "To convert SVG to PNG, click Convert now, drop your .svg files and save. Each SVG is drawn at its own size with a transparent background, entirely on your device.",
    body: () => (
      <>
        <h2>Why convert SVG to PNG?</h2>
        <p>
          SVG is perfect for icons and logos on the web, but many places — social networks,
          presentations, messaging apps, app stores — only accept pixel images. PNG keeps the sharp
          edges and the transparent background.
        </p>
        <h2>What to expect</h2>
        <ul>
          <li>
            The PNG has the size the SVG declares (its width and height, or its viewBox). For a
            larger PNG, open the SVG in the editor, use Image → Image Size…, then export.
          </li>
          <li>Transparent areas stay transparent.</li>
          <li>
            The SVG is drawn by your browser&apos;s image decoder: scripts in it never run and
            external files it links to are not loaded, so those parts are left out.
          </li>
        </ul>
      </>
    ),
    faqs: [
      {
        q: "Is it safe to convert an SVG from the internet?",
        a: "Yes. Picstea draws SVGs as images, a mode in which browsers don't run scripts or load other files.",
      },
      {
        q: "Why is part of my SVG missing?",
        a: "Fonts or images the SVG loads from other files or websites can't be fetched in image mode. Embed them in the SVG, or turn text into outlines before converting.",
      },
      PRIVATE,
      MANY,
    ],
  },
  {
    id: "psd-to-png",
    title: "Convert PSD to PNG online",
    description:
      "Convert Photoshop PSD files to PNG in your browser without Photoshop. Free, no sign-up, and your PSD is never uploaded to a server.",
    lead: "To convert a PSD to PNG, click Convert now, drop your .psd files and save. Picstea uses the flattened image saved inside the PSD, so the PNG looks the way the file looked in Photoshop.",
    body: () => (
      <>
        <h2>Why convert PSD to PNG?</h2>
        <p>
          PSD is Photoshop&apos;s working format: large, layered and unreadable for most apps. A PNG
          of the finished picture can be shared, previewed, uploaded or placed in a document, with
          transparency kept.
        </p>
        <h2>What to expect</h2>
        <ul>
          <li>
            The PNG is the flattened image Photoshop stores in the file. PSDs saved with
            &quot;Maximize Compatibility&quot; turned off have none; open those in the{" "}
            <Link href="/psd-editor">PSD editor</Link> and export from there.
          </li>
          <li>
            8-bit RGB and greyscale PSDs work. PSB, 16/32-bit and CMYK files can&apos;t be read yet.
          </li>
          <li>To change layers or text first, open the PSD in the editor instead.</li>
        </ul>
      </>
    ),
    faqs: [
      {
        q: "Do I need Photoshop?",
        a: "No. Picstea reads the PSD in your browser. To edit layers, open the file in Picstea's editor.",
      },
      {
        q: "Why does it say my PSD has no flattened image?",
        a: "Photoshop only stores one when Maximize Compatibility is on. Open the PSD in the editor (File → Open) and export a PNG from there.",
      },
      PRIVATE,
      MANY,
    ],
  },
  {
    id: "heic-to-jpg",
    title: "Convert HEIC to JPG online",
    description:
      "Convert iPhone HEIC photos to JPG in your browser, one at a time or in a batch. Free, no sign-up, and your photos are never uploaded to a server.",
    lead: "To convert HEIC to JPG, click Convert now, drop your .heic photos, choose a quality and save. The JPGs open on Windows, Android and every app, and your photos never leave your device.",
    body: () => (
      <>
        <h2>Why convert HEIC to JPG?</h2>
        <p>
          iPhones and iPads save photos as HEIC (High Efficiency Image File) to save space. Apple
          devices open them, but many Windows PCs, Android phones, websites and upload forms
          don&apos;t. JPG works everywhere.
        </p>
        <h2>What to expect</h2>
        <ul>
          <li>Photos are turned the right way up, as stored in the file.</li>
          <li>Quality 85–90 keeps photos looking the same; 90 is the default.</li>
          <li>
            The first HEIC file loads a 2 MB decoder from Picstea&apos;s own site; after that it is
            cached, and works offline once Picstea is installed.
          </li>
          <li>
            Only the main photo is converted: Live Photo videos, depth maps and burst frames are
            left out, and camera details such as location are not copied.
          </li>
          <li>
            Need transparency or editing? Open the HEIC in the editor (File → Open) or use{" "}
            <Link href="/convert">another converter</Link>.
          </li>
        </ul>
      </>
    ),
    faqs: [
      {
        q: "Are my iPhone photos uploaded?",
        a: "No. The HEIC file is decoded in your browser with an open-source decoder (libheif) that Picstea serves from its own site. Your photos never leave your device.",
      },
      {
        q: "Can I convert HEIC to PNG instead?",
        a: "Yes. In the converter, choose PNG under Convert to. PNG files are larger but lossless.",
      },
      {
        q: "Can I edit a HEIC photo?",
        a: "Yes. Open it with File → Open in the editor like any other photo, then export it as JPG, PNG or WebP.",
      },
      MANY,
    ],
  },
];

export const converterById = (id: string) => CONVERTERS.find((c) => c.id === id);

/** The conversion label ("WebP to PNG") for a page; every page has one (unit test). */
export const conversionLabel = (id: string) => CONVERSIONS.find((c) => c.id === id)?.label ?? id;
