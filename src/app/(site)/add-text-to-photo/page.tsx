import type { Metadata } from "next";
import Link from "next/link";
import { pageOpenGraph } from "@/lib/seo/root-metadata";
import { LandingPage, type Faq } from "@/components/site/LandingPage";
import { RelatedTools } from "@/components/site/RelatedTools";

const PATH = "/add-text-to-photo";
const TITLE = "How to add text to a photo online";
const DESCRIPTION =
  "Add editable text to a photo in your browser: pick a font, size and colour, add a shadow or outline, then export. Free, no watermark, nothing uploaded.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: pageOpenGraph({ url: PATH, title: TITLE, description: DESCRIPTION }),
};

const FAQS: Faq[] = [
  {
    q: "Can I change the text later?",
    a: "Yes. Text stays on its own editable layer until you export. Save the project (or a PSD) to keep editing it another day.",
  },
  {
    q: "Which fonts can I use?",
    a: "Common fonts that every computer has: Arial, Helvetica, Verdana, Trebuchet MS, Georgia, Times New Roman, Courier New, Impact and your system font. Uploading your own fonts isn't possible yet.",
  },
  {
    q: "How do I make text readable on a busy photo?",
    a: "Add a drop shadow or a stroke in the Layer Style dialog, or put a shape behind the text and lower its opacity.",
  },
  {
    q: "Is there a watermark?",
    a: "No. Picstea never adds a watermark, and your photo is never uploaded.",
  },
];

export default function AddTextToPhoto() {
  return (
    <LandingPage
      path={PATH}
      title={TITLE}
      lead="To add text to a photo in Picstea, open the photo, choose the Type tool (T), click where the text should go and type. Change the font, size and colour in the options bar, then export. It's free, adds no watermark, and your photo stays on your device."
      faqs={FAQS}
    >
      <h2>Add text in four steps</h2>
      <ol>
        <li>Open the editor and drop your photo on the page.</li>
        <li>
          Press T (or pick the Type tool), click on the photo and type. Press Enter for a new line.
        </li>
        <li>
          In the options bar, choose the font, size, bold or italic, colour, alignment, line height
          and letter spacing. Move the text with the Move tool (V).
        </li>
        <li>Choose File → Export As… and save a JPEG, PNG or WebP.</li>
      </ol>
      <h2>Make the text stand out</h2>
      <ul>
        <li>
          Double-click the text layer (or Layer → Blending Options…) to open Layer Style: add a{" "}
          <strong>drop shadow</strong>, a <strong>stroke</strong> (outline), an outer glow, or a
          gradient overlay.
        </li>
        <li>
          Draw a rectangle under the text with the shape tools and lower its opacity for a caption
          bar.
        </li>
        <li>Lower the text layer&apos;s opacity for a subtle watermark of your own.</li>
        <li>Rotate or scale the text with Free Transform (Cmd/Ctrl+T); it stays editable.</li>
      </ul>
      <h2>Good to know</h2>
      <ul>
        <li>
          Need the same text on many photos? Text can&apos;t be recorded in an action yet, so add it
          to each photo.
        </li>
        <li>
          Text in a Photoshop file opens as editable text too; see the{" "}
          <Link href="/psd-editor">PSD editor</Link>.
        </li>
      </ul>
      <h2>Limitations</h2>
      <p>
        Text is point text: lines break where you press Enter, with no automatic wrapping in a box.
        There is no text on a curve or vertical text yet, and only the common fonts listed in the
        questions below are available.
      </p>
      <RelatedTools current={PATH} />
    </LandingPage>
  );
}
