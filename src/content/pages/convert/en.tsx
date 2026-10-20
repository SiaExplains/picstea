import { ConverterList } from "@/components/site/ConverterList";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Free image converter that never uploads your files",
  description:
    "Convert HEIC, WebP, PNG, JPG, SVG and PSD images to PNG, JPG or WebP in your browser. Free, no sign-up, batch-friendly; files never leave your device.",
  lead: "Picstea converts images between PNG, JPG and WebP — and turns iPhone HEIC photos, SVG and Photoshop PSD files into JPG or PNG — right in your browser. Pick a converter below, or open the converter directly; your files never leave your device.",
  faqs: [
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
  ],
  body: () => (
    <>
      <h2>Converters</h2>
      <ConverterList />
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
    </>
  ),
};

export default copy;
