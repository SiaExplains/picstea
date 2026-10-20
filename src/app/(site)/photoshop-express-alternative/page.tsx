import type { Metadata } from "next";
import Link from "next/link";
import { pageOpenGraph } from "@/lib/seo/root-metadata";
import { ComparisonTable } from "@/components/site/ComparisonTable";
import { LandingPage, type Faq } from "@/components/site/LandingPage";
import { RelatedTools } from "@/components/site/RelatedTools";

const PATH = "/photoshop-express-alternative";
const TITLE = "Picstea: a Photoshop Express alternative";
const DESCRIPTION =
  "Photoshop Express is a quick-edit app; Picstea is a free browser editor with full layers, masks and PSD files, on any computer. An honest comparison.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: pageOpenGraph({ url: PATH, title: TITLE, description: DESCRIPTION }),
};

const FAQS: Faq[] = [
  {
    q: "What is the difference between Photoshop Express and Picstea?",
    a: "Photoshop Express is Adobe's app for quick photo edits, available for iOS, Android and Windows. Picstea runs in any browser and works like full Photoshop, with layers, adjustment layers, masks and PSD files.",
  },
  {
    q: "Is Picstea free?",
    a: "Yes, completely: no premium tier, no account and no watermark. Photoshop Express is free to download, with premium features for advanced edits.",
  },
  {
    q: "Does Picstea work on a Mac or Chromebook?",
    a: "Yes. It runs in any current browser on Windows, macOS, Linux and ChromeOS.",
  },
  {
    q: "Does Picstea work on my phone?",
    a: "It opens on phones and the layout adapts, but it is designed for a mouse or trackpad and keyboard. For quick edits on a phone, Photoshop Express is the better fit.",
  },
];

export default function PhotoshopExpressAlternative() {
  return (
    <LandingPage
      path={PATH}
      title={TITLE}
      lead="Photoshop Express is Adobe's free app for quick photo fixes on mobile devices and Windows. When a quick fix isn't enough, Picstea gives you a full layer-based editor like Photoshop — free, in any browser, with nothing to install and nothing uploaded."
      faqs={FAQS}
    >
      <h2>How they differ</h2>
      <ComparisonTable
        other="Photoshop Express"
        checked="October 2026"
        rows={[
          ["Where it runs", "Any current browser", "Apps for iOS, Android and Windows"],
          ["Made for", "Detailed, layer-based editing", "Quick edits for mobile photography"],
          [
            "Price",
            "Free, nothing to unlock",
            "Free download; premium features for advanced edits",
          ],
          [
            "Editing style",
            "Full layers, masks, adjustment layers, layer styles",
            "Smart corrections, auto-masking and one-tap tools",
          ],
          ["Photos from", "Your device", "Your device, Google Photos, Dropbox and Facebook"],
        ]}
      />
      <h2>When Picstea is the better fit</h2>
      <ul>
        <li>You want to work in layers, masks, selections and adjustment layers.</li>
        <li>You need to open or deliver a layered Photoshop file.</li>
        <li>You&apos;re on a Mac, Linux computer or Chromebook, or can&apos;t install apps.</li>
        <li>You want everything free, without premium features or an account.</li>
      </ul>
      <h2>When Photoshop Express is the better fit</h2>
      <ul>
        <li>Quick fixes and looks on your phone, right after taking the photo.</li>
        <li>Smart one-tap corrections and auto-masking.</li>
        <li>Pulling photos straight from Google Photos, Dropbox or Facebook.</li>
      </ul>
      <p>
        Moving up from quick edits? Compare Picstea with{" "}
        <Link href="/photoshop-alternative">full Photoshop</Link>, or start with the{" "}
        <Link href="/docs/getting-started">getting started guide</Link>.
      </p>
      <RelatedTools current={PATH} />
    </LandingPage>
  );
}
