import { ComparisonTable } from "@/components/site/ComparisonTable";
import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Picstea: a Pixlr alternative with no save limits",
  description:
    "Looking for a Pixlr alternative? Picstea is a free browser photo editor with layers and PSD support, no account, no save limits and no ads in the editor.",
  lead: "Pixlr is a popular browser photo editor with a free version and paid plans that add AI tools. Picstea is a free browser editor with Photoshop-style layers and PSD support — with no save limits, no account and no ads inside the editor.",
  faqs: [
    {
      q: "How is Picstea different from Pixlr?",
      a: "Both are browser photo editors with layers. Pixlr has a free version with ads and limited saves, and paid plans with AI tools. Picstea is free without limits or ads in the editor, but has no AI tools.",
    },
    {
      q: "Does Picstea limit how many images I can save?",
      a: "No. There is no save or export limit, no watermark and no account.",
    },
    {
      q: "Does Picstea have AI background removal like Pixlr?",
      a: "Not yet. Picstea removes backgrounds by hand with the Magic Eraser, Background Eraser or a selection. Pixlr's AI tools are the better choice if you need that.",
    },
    {
      q: "Are my photos uploaded?",
      a: "Not with Picstea: the editor has no server that receives images, and its security policy blocks sending document data anywhere.",
    },
  ],
  body: () => (
    <>
      <h2>What both do</h2>
      <ul>
        <li>Edit photos in the browser with layers, masks, blend modes and adjustments.</li>
        <li>Open and save PSD files and export PNG, JPEG and WebP.</li>
        <li>Retouch, add text, crop, resize and apply filters.</li>
      </ul>
      <h2>How they differ</h2>
      <ComparisonTable
        other="Pixlr"
        rows={[
          ["Price", "Free", "Free version; paid plans (Plus, Premium, Ultra)"],
          ["Ads", "None in the editor", "In the free version; paid plans are ad-free"],
          [
            "Saving",
            "Unlimited, no account",
            "Limited in the free version; unlimited on paid plans",
          ],
          ["AI tools", "None", "AI tools with monthly credits on paid plans"],
          [
            "Workflow",
            "Photoshop-style layers, adjustment layers, layer styles",
            "Pixlr's own editors",
          ],
          ["Platforms", "Any current browser", "Browser, desktop apps and mobile apps"],
        ]}
      />
      <h2>Why people choose Picstea</h2>
      <ul>
        <li>
          <strong>No limits to work around.</strong> Save and export as often as you like, at full
          size, with no watermark and no sign-up.
        </li>
        <li>
          <strong>No ads where you work.</strong> The editor page runs no third-party code at all;
          Picstea&apos;s own sponsorships sit beside the canvas as a plain image and link.
        </li>
        <li>
          <strong>Professional layer workflow.</strong> Adjustment layers, smart objects with smart
          filters, Blend If and all ten Photoshop layer styles.
        </li>
      </ul>
      <h2>Where Pixlr is the better choice</h2>
      <ul>
        <li>AI tools, such as AI image generation and automatic cut-outs.</li>
        <li>Mobile apps for iPhone and Android.</li>
      </ul>
      <p>
        If you edit by hand and want no limits,{" "}
        <Link href="/docs/getting-started">get started with Picstea</Link>. Removing a background by
        hand is explained in{" "}
        <Link href="/make-background-transparent">make a background transparent</Link>.
      </p>
    </>
  ),
};

export default copy;
