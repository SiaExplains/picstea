import type { Metadata } from "next";
import Link from "next/link";
import { pageOpenGraph } from "@/lib/seo/root-metadata";
import { LandingPage, type Faq } from "@/components/site/LandingPage";
import { RelatedTools } from "@/components/site/RelatedTools";
import { CONVERTERS, conversionLabel } from "@/content/converters";

const PATH = "/convert";
const TITLE = "Free image converter that never uploads your files";
const DESCRIPTION =
  "Convert HEIC, WebP, PNG, JPG, SVG and PSD images to PNG, JPG or WebP in your browser. Free, no sign-up, batch-friendly; files never leave your device.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: pageOpenGraph({ url: PATH, title: TITLE, description: DESCRIPTION }),
};

const FAQS: Faq[] = [
  {
    q: "Which formats can I convert?",
    a: "Picstea reads PNG, JPEG, WebP, GIF (first frame), SVG, HEIC (iPhone photos) and PSD files and converts them to PNG, JPG or WebP.",
  },
  {
    q: "Are my files uploaded?",
    a: "No. Converting happens in your browser, in Picstea's editor, which has no server that receives files. Nothing is saved in the browser either.",
  },
  {
    q: "How many files can I convert at once?",
    a: "Up to 200. One file is saved directly; several are saved together as one ZIP file.",
  },
  {
    q: "Is there a size limit?",
    a: "Files can be up to 200 MB and images up to 12,000 pixels per side (36 megapixels).",
  },
];

export default function ConvertHub() {
  return (
    <LandingPage
      path={PATH}
      title={TITLE}
      lead="Picstea converts images between PNG, JPG and WebP — and turns iPhone HEIC photos, SVG and Photoshop PSD files into JPG or PNG — right in your browser. Pick a converter below, or open the converter directly; your files never leave your device."
      faqs={FAQS}
      cta={{ href: "/?convert=images", label: "Open the converter — free" }}
    >
      <h2>Converters</h2>
      <ul>
        {CONVERTERS.map((c) => (
          <li key={c.id}>
            <Link href={`/convert/${c.id}`}>{conversionLabel(c.id)}</Link> — {c.description}
          </li>
        ))}
      </ul>
      <h2>Why convert in the browser?</h2>
      <p>
        Most online converters upload your image to a server, convert it there and send it back.
        Picstea does the work on your own computer or phone, so private photos and work files stay
        private, and it keeps working offline once installed as an app.
      </p>
      <p>
        Need to change the picture too? Open it in the editor, edit it, then use File → Export As….
        In the editor, File → Convert… opens the same converter.
      </p>
      <RelatedTools current={PATH} />
    </LandingPage>
  );
}
