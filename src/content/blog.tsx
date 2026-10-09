import type { ReactNode } from "react";
import Link from "next/link";
import { EditorLink } from "@/components/site/EditorLink";

/**
 * Blog posts (docs/10 "Content strategy"). A post with `draft: true` is not listed, not in the
 * sitemap and returns 404 in production — posts go live only after the product owner approves
 * them. In development drafts are visible with a "Draft" badge for review.
 */

export interface BlogPost {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  /** ISO date. */
  readonly published: string;
  readonly updated?: string;
  readonly draft: boolean;
  readonly body: () => ReactNode;
}

export const POSTS: readonly BlogPost[] = [
  {
    slug: "edit-psd-online-without-uploading",
    title: "How to edit a PSD file online without uploading it",
    description:
      "Open and edit Photoshop files in your browser while the file stays on your computer — with layers, groups and masks intact.",
    published: "2026-10-09",
    draft: true,
    body: () => (
      <>
        <p>
          Most online editors that open PSD files work the same way: you upload the file, a server
          converts it, and you edit a copy that now lives on someone else&apos;s computer. For
          client work, unreleased designs or personal photos, that is often not acceptable.
        </p>
        <p>
          MYLPER takes a different approach. It reads the PSD file inside your browser, so the file
          never leaves your device. Here is how to edit one, and what to expect.
        </p>
        <h2>Step by step</h2>
        <ol>
          <li>
            Open <EditorLink>the MYLPER editor</EditorLink>.
          </li>
          <li>
            Click <strong>Open image</strong> and choose your <code>.psd</code> file, or drop it
            onto the page.
          </li>
          <li>
            The layers appear in the Layers panel with their names, groups, opacity, visibility,
            blend modes and layer masks.
          </li>
          <li>Edit as usual: move layers, paint, add adjustment layers, mask, select.</li>
          <li>
            Save it back with <strong>File → Export As… → PSD</strong>, or export a PNG, JPEG, WebP
            or PDF.
          </li>
        </ol>
        <h2>What comes across</h2>
        <p>
          MYLPER supports 8-bit RGB and greyscale PSD files — the most common kind. Pixel layers,
          groups, layer names, opacity, visibility, blend modes and layer masks are kept.
        </p>
        <h2>What changes</h2>
        <p>
          Some Photoshop features have no equivalent yet. Rather than changing them silently, MYLPER
          lists them when the file opens:
        </p>
        <ul>
          <li>Text layers and smart objects open as pixels (they keep their names).</li>
          <li>Photoshop adjustment layers and layer styles are not imported.</li>
          <li>Clipping masks open as normal layers.</li>
          <li>PSB, 16/32-bit and CMYK files cannot be opened yet.</li>
        </ul>
        <h2>Why it can work without a server</h2>
        <p>
          Modern browsers can decode images, run code in background threads and store data locally.
          MYLPER reads the PSD format itself, inside the page, and keeps projects in your
          browser&apos;s storage. The editor is not even allowed to send document data anywhere: the
          browser enforces that.
        </p>
        <p>
          <EditorLink>Open a PSD in MYLPER</EditorLink> — no account, no upload.
        </p>
      </>
    ),
  },
  {
    slug: "png-vs-jpeg-vs-webp",
    title: "PNG vs JPEG vs WebP: which image format should you use?",
    description:
      "A practical guide to choosing between PNG, JPEG and WebP: transparency, file size, quality and where each format works best.",
    published: "2026-10-09",
    draft: true,
    body: () => (
      <>
        <p>
          Short answer: use <strong>JPEG</strong> for photos when you need the widest compatibility,{" "}
          <strong>PNG</strong> for graphics, screenshots and anything that needs crisp edges or
          transparency without loss, and <strong>WebP</strong> for the web when you want small files
          — with or without transparency.
        </p>
        <h2>The differences at a glance</h2>
        <table>
          <thead>
            <tr>
              <th scope="col"></th>
              <th scope="col">PNG</th>
              <th scope="col">JPEG</th>
              <th scope="col">WebP</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Compression</th>
              <td>Lossless</td>
              <td>Lossy</td>
              <td>Lossy or lossless</td>
            </tr>
            <tr>
              <th scope="row">Transparency</th>
              <td>Yes</td>
              <td>No</td>
              <td>Yes</td>
            </tr>
            <tr>
              <th scope="row">Best for</th>
              <td>Graphics, logos, screenshots</td>
              <td>Photos, maximum compatibility</td>
              <td>Web images of all kinds</td>
            </tr>
            <tr>
              <th scope="row">File size</th>
              <td>Larger for photos</td>
              <td>Small for photos</td>
              <td>Usually smallest</td>
            </tr>
          </tbody>
        </table>
        <h2>PNG</h2>
        <p>
          PNG never throws away detail. Every save is identical to the original, which makes it
          ideal for screenshots, interface graphics, logos and text. It supports full transparency.
          The downside: photos saved as PNG are often several times larger than as JPEG.
        </p>
        <h2>JPEG</h2>
        <p>
          JPEG discards detail your eye is unlikely to notice, which makes photos small. At high
          quality settings the loss is hard to see; at low settings you get blocky artefacts,
          especially around sharp edges and text. JPEG has no transparency — transparent areas
          become a solid colour, usually white.
        </p>
        <h2>WebP</h2>
        <p>
          WebP can be lossy like JPEG or lossless like PNG, and supports transparency in both modes.
          For the same visual quality it is usually smaller than either. All current major browsers
          support it, but some older software and some upload forms still don&apos;t.
        </p>
        <h2>A simple rule of thumb</h2>
        <ul>
          <li>Sharing a photo anywhere, by email or upload form: JPEG.</li>
          <li>A logo, screenshot or graphic with text: PNG.</li>
          <li>Images for your own website: WebP.</li>
          <li>Anything you will keep editing: keep the original project, not a flattened image.</li>
        </ul>
        <p>
          In MYLPER, <strong>File → Export As…</strong> offers all three. The quality slider for
          JPEG and WebP lets you trade size against detail, and the image is created on your device.{" "}
          <EditorLink>Try it in the editor</EditorLink>.
        </p>
      </>
    ),
  },
  {
    slug: "layers-and-masks-explained",
    title: "Layers and masks explained",
    description:
      "What layers, blend modes, adjustment layers and layer masks are, and how they let you edit images without destroying the original.",
    published: "2026-10-09",
    draft: true,
    body: () => (
      <>
        <p>
          Layers are what separate a real image editor from a simple photo app. They let you change
          one part of an image without touching the rest — and change your mind later.
        </p>
        <h2>Layers: sheets of glass</h2>
        <p>
          Think of layers as sheets of glass stacked on top of each other. Each holds part of the
          image: a photo, some text, a shape. Where a sheet is transparent you see through to the
          ones below. Reordering the sheets changes what covers what.
        </p>
        <h2>Opacity and blend modes</h2>
        <p>
          A layer&apos;s <strong>opacity</strong> makes the whole sheet see-through.
          <strong> Blend modes</strong> change how its colours mix with what is below: Multiply
          darkens (great for shadows), Screen lightens, Overlay adds contrast.
        </p>
        <h2>Adjustment layers: changes you can undo any time</h2>
        <p>
          An adjustment layer doesn&apos;t contain pixels. It changes the colours of everything
          below it — brightness, hue, saturation, black and white — without altering the original
          pixels. Hide or delete it and the original is back, untouched.
        </p>
        <h2>Masks: hide without erasing</h2>
        <p>
          A mask decides which parts of a layer are visible. Paint black on the mask to hide, white
          to reveal, grey for something in between. Unlike the eraser, nothing is lost: paint white
          again and it comes back. Masks on adjustment layers let you apply an adjustment to just
          one area, such as brightening only a face.
        </p>
        <h2>Groups</h2>
        <p>
          Groups collect layers into folders. Moving a group moves everything in it, and a group can
          have its own opacity, blend mode and mask.
        </p>
        <h2>Try it</h2>
        <ol>
          <li>
            Open a photo in <EditorLink>MYLPER</EditorLink>.
          </li>
          <li>Choose Adjustments → Black &amp; White.</li>
          <li>Click the adjustment layer&apos;s mask thumbnail and paint black over one object.</li>
          <li>That object is in colour again; everything else stays black and white.</li>
        </ol>
        <p>
          Read more in the <Link href="/docs/layers-groups-and-masks">layers documentation</Link>.
        </p>
      </>
    ),
  },
  {
    slug: "levels-and-curves-explained",
    title: "Levels and Curves explained: fix brightness and contrast like a pro",
    description:
      "What Levels and Curves do, when to use which, and how to correct a dull or dark photo with them — without changing the original pixels.",
    published: "2026-10-09",
    draft: true,
    body: () => (
      <>
        <p>
          Brightness and contrast sliders are blunt: they move every tone by the same amount. Levels
          and Curves let you decide which tones change and by how much. They are the two tools
          photographers reach for first when a picture looks flat, dark or washed out.
        </p>
        <h2>Levels: set the black point, white point and midtones</h2>
        <p>
          Levels shows a histogram — how many pixels there are at each brightness, from black on the
          left to white on the right. A dull photo often has a histogram that doesn&apos;t reach
          either end.
        </p>
        <ul>
          <li>
            Move <strong>Input black</strong> to where the histogram starts: those pixels become
            pure black.
          </li>
          <li>
            Move <strong>Input white</strong> to where it ends: those become pure white. The tones
            in between stretch to fill the full range, and contrast improves.
          </li>
          <li>
            <strong>Gamma</strong> brightens or darkens the midtones without moving black and white.
          </li>
          <li>
            <strong>Output black and white</strong> do the opposite — they compress the range, for a
            faded, matte look.
          </li>
        </ul>
        <h2>Curves: control every tone</h2>
        <p>
          Curves draws a line from dark (bottom left) to light (top right). Bending it changes
          tones: lift a point and those tones get brighter, lower it and they get darker.
        </p>
        <ul>
          <li>
            <strong>S-curve</strong>: lower a point in the shadows and raise one in the highlights
            for punchier contrast.
          </li>
          <li>
            <strong>Lift the bottom-left end</strong> for faded blacks.
          </li>
          <li>
            <strong>One channel at a time</strong>: switch to Red, Green or Blue to remove a colour
            cast — for example, lower the blue curve slightly to warm up a cold photo.
          </li>
        </ul>
        <h2>Why adjustment layers</h2>
        <p>
          In MYLPER, Levels and Curves are adjustment layers. They change how the image looks, not
          its pixels: hide the layer to compare, change the settings later, or paint on its mask to
          apply the correction to only part of the image.
        </p>
        <h2>Try it</h2>
        <ol>
          <li>
            Open a photo in <EditorLink>MYLPER</EditorLink>.
          </li>
          <li>
            Choose Adjustments → Levels and drag the black and white inputs to the ends of the
            histogram.
          </li>
          <li>Add Adjustments → Curves above it and make a gentle S-curve.</li>
          <li>Toggle the layers&apos; eye icons to compare before and after.</li>
        </ol>
        <p>
          Everything happens in your browser — the photo is never uploaded. Read more in the{" "}
          <Link href="/docs/layers-groups-and-masks">layers documentation</Link>.
        </p>
      </>
    ),
  },
];

const showDrafts = process.env.NODE_ENV !== "production";

/** Posts visible on this build: published ones, plus drafts during development. */
export const visiblePosts = () =>
  POSTS.filter((p) => !p.draft || showDrafts).toSorted((a, b) =>
    b.published.localeCompare(a.published),
  );

export const publishedPosts = () => POSTS.filter((p) => !p.draft);

export const postBySlug = (slug: string) => visiblePosts().find((p) => p.slug === slug);
