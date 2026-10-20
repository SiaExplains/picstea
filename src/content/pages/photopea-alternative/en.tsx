import { LocalLink as Link } from "@/components/site/LocalLink";
import type { PageCopy } from "../types";

const copy: PageCopy = {
  title: "Picstea: a Photopea alternative",
  description:
    "Looking for a Photopea alternative? Picstea is a free browser photo editor with layers and PSD support, and no third-party ad code inside the editor.",
  lead: "Photopea showed that a serious image editor can live in a browser tab. Picstea follows the same idea with its own focus: a calm workspace, no third-party code in the editor, and a clear list of what it can and can't do.",
  faqs: [
    {
      q: "How is Picstea different from Photopea?",
      a: "Both are free, layer-based editors that run in the browser and edit files on your device. Picstea keeps third-party code, including ads, out of the editor page entirely, and focuses on a clean, focused workspace. Photopea opens more file types and has features Picstea doesn't yet.",
    },
    {
      q: "Does Picstea upload my images?",
      a: "No. Files are opened, edited and saved in your browser; the editor page cannot send document data anywhere.",
    },
    {
      q: "Can I move my PSD files between them?",
      a: "Yes. Both read and write PSD, so you can open a PSD saved by another editor in Picstea and export a layered PSD again.",
    },
  ],
  body: () => (
    <>
      <h2>What both do</h2>
      <ul>
        <li>Run in the browser for free, with layers, masks, adjustment layers and blend modes.</li>
        <li>Open and save layered PSD files and export PNG, JPEG and WebP.</li>
        <li>Edit files locally, with familiar Photoshop-style tools and shortcuts.</li>
      </ul>
      <h2>Why people choose Picstea</h2>
      <ul>
        <li>
          <strong>Nothing third-party in the editor.</strong> The editor page runs no ad or tracking
          code; a strict Content-Security-Policy lets the browser block any attempt to send document
          data elsewhere. Picstea&apos;s own sponsorship space beside the canvas is a plain image
          and link.
        </li>
        <li>
          <strong>Projects saved for you.</strong> Work is saved automatically in your browser and
          can be downloaded as a portable <code>.picstea</code> project file.
        </li>
        <li>
          <strong>Honest limits.</strong> When a PSD feature can&apos;t be kept, Picstea lists
          exactly what changed instead of changing it silently.
        </li>
      </ul>
      <h2>What Photopea has that Picstea doesn&apos;t (yet)</h2>
      <ul>
        <li>Opening more formats, such as AI, XD, Sketch, Figma, PDF and camera RAW files.</li>
        <li>Generative and content-aware tools, object selection and the magnetic lasso.</li>
        <li>
          Opening files directly from cloud storage such as Google Drive, Dropbox or OneDrive.
        </li>
      </ul>
      <p>
        If you need those, Photopea is a good choice. If you want a focused editor that keeps your
        work private by design, <Link href="/docs/getting-started">get started with Picstea</Link>.
      </p>
    </>
  ),
};

export default copy;
