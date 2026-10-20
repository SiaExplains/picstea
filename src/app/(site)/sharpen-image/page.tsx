import type { Metadata } from "next";
import Link from "next/link";
import { pageOpenGraph } from "@/lib/seo/root-metadata";
import { LandingPage, type Faq } from "@/components/site/LandingPage";
import { RelatedTools } from "@/components/site/RelatedTools";

const PATH = "/sharpen-image";
const TITLE = "How to sharpen an image online";
const DESCRIPTION =
  "Sharpen a soft photo in your browser with Unsharp Mask, Smart Sharpen or High Pass, with a live preview. Free, no sign-up, and your image is never uploaded.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: pageOpenGraph({ url: PATH, title: TITLE, description: DESCRIPTION }),
};

const FAQS: Faq[] = [
  {
    q: "Can sharpening fix a blurry photo?",
    a: "Only a slightly soft one. Sharpening raises contrast along edges; it can't recover detail that was never recorded, such as a badly out-of-focus or shaken photo. Picstea has no AI 'unblur'.",
  },
  {
    q: "Which filter should I use?",
    a: "Unsharp Mask for most photos, Smart Sharpen when the softness comes from lens or motion blur, and High Pass when you want to adjust sharpening later with layer opacity.",
  },
  {
    q: "Why does my photo look grainy after sharpening?",
    a: "Sharpening also sharpens noise. Lower the amount, raise Unsharp Mask's Threshold, or use Smart Sharpen's Reduce noise.",
  },
  {
    q: "Is my image uploaded?",
    a: "No. Sharpening runs in your browser. Picstea has no server that receives images.",
  },
];

export default function SharpenImage() {
  return (
    <LandingPage
      path={PATH}
      title={TITLE}
      lead="To sharpen an image in Picstea, open it and choose Filter → Sharpen → Unsharp Mask…. Raise the Amount while watching the live preview, keep the Radius small, and press OK. It's free, works in your browser, and nothing is uploaded."
      faqs={FAQS}
    >
      <h2>Sharpen a photo in four steps</h2>
      <ol>
        <li>Open the editor and drop your image on the page.</li>
        <li>Choose View → 100% so you see real pixels while you sharpen.</li>
        <li>
          Choose Filter → Sharpen → Unsharp Mask…: start with Amount 100%, Radius 1–2 px and
          Threshold 0, then adjust until edges look crisp without bright halos.
        </li>
        <li>Press OK, then export with File → Export As….</li>
      </ol>
      <h2>Three ways to sharpen</h2>
      <ul>
        <li>
          <strong>Unsharp Mask</strong> — Amount (strength), Radius (how wide the edge is) and
          Threshold (skip small differences, which protects skin and sky from grain).
        </li>
        <li>
          <strong>Smart Sharpen</strong> — choose what to remove (Gaussian, lens or motion blur,
          with an angle for motion) and reduce noise at the same time.
        </li>
        <li>
          <strong>High Pass</strong> (Filter → Other) on a duplicate layer (Cmd/Ctrl+J), with the
          layer&apos;s blend mode set to Overlay or Soft Light. Lower the layer&apos;s opacity to
          tune the sharpening at any time.
        </li>
      </ul>
      <h2>Tips</h2>
      <ul>
        <li>
          Sharpen last, after resizing: shrinking a photo softens it, and Unsharp Mask brings the
          edges back. See the <Link href="/image-resizer">image resizer</Link> guide.
        </li>
        <li>Select an area first to sharpen only the eyes or the subject.</li>
        <li>
          On a smart object the filter becomes a smart filter you can change later — see the{" "}
          <Link href="/blog/smart-objects-explained">smart objects guide</Link>.
        </li>
      </ul>
      <h2>Limitations</h2>
      <p>
        Sharpening can&apos;t rebuild missing detail, and there is no AI upscaling or deblurring.
        Images can be up to 12,000 pixels per side (36 megapixels).
      </p>
      <RelatedTools current={PATH} />
    </LandingPage>
  );
}
