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
    published: "2026-10-18",
    draft: false,
    body: () => (
      <>
        <p>
          Most online editors that open PSD files work the same way: you upload the file, a server
          converts it, and you edit a copy that now lives on someone else&apos;s computer. For
          client work, unreleased designs or personal photos, that is often not acceptable.
        </p>
        <p>
          Picstea takes a different approach. It reads the PSD file inside your browser, so the file
          never leaves your device. Here is how to edit one, and what to expect.
        </p>
        <h2>Step by step</h2>
        <ol>
          <li>
            Open <EditorLink>the Picstea editor</EditorLink>.
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
          Picstea supports 8-bit RGB and greyscale PSD files — the most common kind. Pixel layers,
          groups, layer names, opacity, visibility, blend modes and layer masks are kept. Text
          layers stay editable, and adjustment layers, shapes, smart objects, vector and clipping
          masks and common layer styles open as their Picstea equivalents.
        </p>
        <h2>What changes</h2>
        <p>
          Some Photoshop features have no equivalent yet. Rather than changing them silently,
          Picstea lists them when the file opens:
        </p>
        <ul>
          <li>
            Selective Color and Color Lookup adjustments, warped text and Photoshop smart filters
            keep their look as pixels; Photoshop pattern images become built-in patterns.
          </li>
          <li>PSB, 16/32-bit and CMYK files cannot be opened yet.</li>
        </ul>
        <h2>Why it can work without a server</h2>
        <p>
          Modern browsers can decode images, run code in background threads and store data locally.
          Picstea reads the PSD format itself, inside the page, and keeps projects in your
          browser&apos;s storage. The editor is not even allowed to send document data anywhere: the
          browser enforces that.
        </p>
        <p>
          <EditorLink>Open a PSD in Picstea</EditorLink> — no account, no upload.
        </p>
      </>
    ),
  },
  {
    slug: "png-vs-jpeg-vs-webp",
    title: "PNG vs JPEG vs WebP: which format to use?",
    description:
      "A practical guide to choosing between PNG, JPEG and WebP: transparency, file size, quality and where each format works best.",
    published: "2026-10-18",
    draft: false,
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
          In Picstea, <strong>File → Export As…</strong> offers all three. The quality slider for
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
    published: "2026-10-18",
    draft: false,
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
            Open a photo in <EditorLink>Picstea</EditorLink>.
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
    title: "Levels and Curves: fix brightness and contrast",
    description:
      "What Levels and Curves do, when to use which, and how to correct a dull or dark photo with them — without changing the original pixels.",
    published: "2026-10-18",
    draft: false,
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
          In Picstea, Levels and Curves are adjustment layers. They change how the image looks, not
          its pixels: hide the layer to compare, change the settings later, or paint on its mask to
          apply the correction to only part of the image.
        </p>
        <h2>Try it</h2>
        <ol>
          <li>
            Open a photo in <EditorLink>Picstea</EditorLink>.
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
  {
    slug: "how-to-use-the-pen-tool",
    title: "How to use the Pen tool for shapes and cut-outs",
    description:
      "A practical introduction to the Pen tool: corner and curve points, closing a path, editing it, and turning it into a shape, a selection or a vector mask.",
    published: "2026-10-18",
    draft: false,
    body: () => (
      <>
        <p>
          The Pen tool has a reputation for being hard. It isn&apos;t — it just works differently
          from a brush. Instead of painting pixels, you place points and the editor draws perfectly
          smooth lines between them. Once you have the outline, you can use it for almost anything.
        </p>
        <h2>Two kinds of points</h2>
        <ul>
          <li>
            <strong>Click</strong> to place a corner point. Straight lines connect corner points.
          </li>
          <li>
            <strong>Click and drag</strong> to place a smooth point. The direction you drag sets the
            direction of the curve, and the distance sets how strongly it bends.
          </li>
        </ul>
        <p>
          A good habit: use as few points as you can, and put smooth points at the widest part of a
          curve rather than at its ends.
        </p>
        <h2>Close it, then fix it</h2>
        <p>
          Click the first point to close the path. It rarely comes out perfect the first time —
          that&apos;s expected. Switch to the Direct Selection tool (A) and drag points or their
          handles until the outline sits exactly where you want it. Alt-click a point to switch it
          between corner and smooth.
        </p>
        <h2>What to do with a path</h2>
        <ul>
          <li>
            <strong>A shape</strong>: in Shape mode the path becomes a filled shape layer that stays
            sharp at any size.
          </li>
          <li>
            <strong>A cut-out</strong>: in Path mode, trace around an object, then press
            Cmd/Ctrl+Enter to turn the path into a selection with clean edges.
          </li>
          <li>
            <strong>A mask</strong>: Layer → Add Vector Mask from Path hides everything outside the
            outline, without deleting anything.
          </li>
        </ul>
        <h2>Try it</h2>
        <ol>
          <li>
            Open a photo in <EditorLink>Picstea</EditorLink> and press P.
          </li>
          <li>Choose Path in the options bar and click around an object, closing the path.</li>
          <li>Press A and adjust the points, then press Cmd/Ctrl+Enter.</li>
          <li>Press Cmd/Ctrl+J to copy the object to its own layer.</li>
        </ol>
        <p>
          Read more in <Link href="/docs/paths-and-the-pen-tool">Paths and the Pen tool</Link>.
          Everything happens in your browser — nothing is uploaded.
        </p>
      </>
    ),
  },
  {
    slug: "smart-objects-explained",
    title: "Smart objects: scale without losing quality",
    description:
      "Why resizing pixels loses detail, how smart objects avoid it, and how smart filters let you change your mind later.",
    published: "2026-10-18",
    draft: false,
    body: () => (
      <>
        <p>
          Shrink a photo to place it in a layout, then decide it should be bigger after all — and it
          comes back blurry. That&apos;s because resizing pixels throws detail away. Smart objects
          solve this.
        </p>
        <h2>What a smart object is</h2>
        <p>
          A smart object is a layer that keeps its original contents inside it. When you scale,
          rotate or flip it, the editor draws it again from that original at the new size, instead
          of stretching pixels that were already resized. You can scale it down to 10% and back to
          100% and it looks exactly like it did.
        </p>
        <h2>Smart filters: effects you can undo any time</h2>
        <p>
          Filters normally change pixels for good. On a smart object, a filter becomes a smart
          filter: it sits on top of the contents. You can switch it off to compare, change its
          settings later, reorder several filters or delete one — the original is never touched.
        </p>
        <h2>Edit the contents</h2>
        <p>
          Double-click a smart object to open its contents in their own tab. Change anything, save,
          and every place that smart object appears updates.
        </p>
        <h2>Try it</h2>
        <ol>
          <li>
            In <EditorLink>Picstea</EditorLink>, choose File → Place Embedded… and pick a photo.
          </li>
          <li>Scale it down with the Move tool, then scale it back up — it stays sharp.</li>
          <li>Add Filter → Gaussian Blur, then hide or change it in the Properties panel.</li>
        </ol>
        <p>
          More in{" "}
          <Link href="/docs/smart-objects-and-smart-filters">Smart objects and smart filters</Link>.
          As always, nothing leaves your device.
        </p>
      </>
    ),
  },
  {
    slug: "open-psd-files-with-editable-text-and-adjustments",
    title: "Open PSDs with editable text and adjustments",
    description:
      "Picstea opens Photoshop files with their structure intact: editable text, adjustment layers, shapes, smart objects, vector masks and layer styles.",
    published: "2026-10-18",
    draft: false,
    body: () => (
      <>
        <p>
          A PSD is more than its pixels. The value is in the structure: text you can still change,
          adjustments you can still tweak, shapes that stay sharp. Picstea now keeps much more of
          that structure when it opens a Photoshop file — still entirely in your browser.
        </p>
        <h2>What opens editable</h2>
        <ul>
          <li>
            <strong>Text layers</strong> open as text you can edit, with their size, colour, bold
            and italic, alignment and spacing. Fonts are matched to common fonts, so give the layout
            a quick check.
          </li>
          <li>
            <strong>Adjustment layers</strong> — Levels, Curves, Brightness/Contrast,
            Hue/Saturation, Exposure, Invert, Posterize, Threshold and Black &amp; White.
          </li>
          <li>
            <strong>Shape and fill layers</strong> become path shapes and colour fills.
          </li>
          <li>
            <strong>Smart objects</strong> with embedded images or PSDs open as smart objects —
            double-click to edit their contents.
          </li>
          <li>
            <strong>Vector masks and clipping masks</strong> stay masks.
          </li>
          <li>
            <strong>Layer styles</strong>: drop shadow, outer glow, stroke and colour overlay.
          </li>
        </ul>
        <h2>And back again</h2>
        <p>
          Exported PSDs now keep adjustment layers, vector masks and clipping masks, so a file can
          go back to Photoshop without being flattened.
        </p>
        <h2>What still changes</h2>
        <p>
          Some Photoshop features don&apos;t have a Picstea equivalent yet — for example Selective
          Color, satin styles or warped text. Those layers keep their look as pixels, and Picstea
          lists exactly what changed when the file opens.
        </p>
        <p>
          <EditorLink>Open a PSD in Picstea</EditorLink> — no account, no upload. Details are in{" "}
          <Link href="/docs/file-formats">file formats</Link>.
        </p>
      </>
    ),
  },
  {
    slug: "record-actions-and-batch-process-images",
    title: "Record actions and batch-process images",
    description:
      "Picstea can now record a sequence of edits and replay it on any image — or on a whole folder of photos at once — without uploading anything.",
    published: "2026-10-18",
    draft: false,
    body: () => (
      <>
        <p>
          Resizing a product shot, adding the same adjustment, blurring the same corner: some edits
          are the same every time. Picstea can now record them once and replay them — on one image
          or on a hundred.
        </p>
        <h2>Record once</h2>
        <p>
          Open the Actions panel, choose New… and start editing. Filters, adjustment layers,
          selections, fills, new layers, flips, alignment and crops are recorded with their
          settings. Choose Stop when you&apos;re done; you can see every step and remove the ones
          you don&apos;t want.
        </p>
        <h2>Play anywhere</h2>
        <p>
          Select the action and choose Play. The whole action is a single step in the History panel,
          so one Undo takes it back.
        </p>
        <h2>Batch a whole folder</h2>
        <p>
          File → Batch… applies an action to many files at once and saves the results as one ZIP
          file — PNG, JPEG or WebP. Everything happens in your browser tab: the photos are not
          uploaded and not stored.
        </p>
        <h2>Also new</h2>
        <ul>
          <li>
            A colour picker with a saturation/brightness field, a hue slider and exact Hex, RGB and
            HSB values.
          </li>
          <li>A Swatches panel for your own colours.</li>
          <li>A History panel to jump back to any step — and forward again.</li>
        </ul>
        <p>
          <EditorLink>Try it in Picstea</EditorLink> — no account needed. The details are in{" "}
          <Link href="/docs/actions-batch-colours-and-history">
            Actions, batch processing, colours and history
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    slug: "remove-blemishes-and-retouch-photos-in-your-browser",
    title: "Remove blemishes and retouch photos online",
    description:
      "Picstea now has a Clone Stamp, Healing Brush, Dodge and Burn, Sponge, Blur, Sharpen and Smudge — classic retouching tools that run entirely in your browser.",
    published: "2026-10-18",
    draft: false,
    body: () => (
      <>
        <p>
          A speck of dust on a product shot, a power line across the sky, a blemish in a portrait:
          small distractions that take seconds to fix with the right tool. Picstea now has those
          tools — and like everything else in Picstea, your photos never leave your device.
        </p>
        <h2>Heal it</h2>
        <p>
          Choose the Healing Brush (J), Alt-click on a clean area nearby and paint over the blemish.
          When you let go, the patch takes on the colour and brightness of its new surroundings
          while keeping the texture you copied, so it blends in.
        </p>
        <h2>Clone it</h2>
        <p>
          The Clone Stamp (S) copies exactly, which is what you want for removing an object or
          duplicating a detail. With Sample set to All layers you can clone onto an empty layer and
          keep the original photo untouched.
        </p>
        <h2>Shape the light</h2>
        <p>
          Dodge and Burn (O) lighten or darken just where you paint — shadows, midtones or
          highlights. Sponge adds or removes colour. Blur, Sharpen and Smudge (R) soften, crisp up
          or push pixels around.
        </p>
        <p>
          <EditorLink>Open a photo in Picstea</EditorLink> and try them — no account, no upload. The
          details are in <Link href="/docs/retouching">Retouching</Link>.
        </p>
      </>
    ),
  },
  {
    slug: "select-align-and-distribute-several-layers",
    title: "Select, align and distribute several layers",
    description:
      "Picstea now lets you select several layers, move and transform them together, scale and rotate whole groups, and align or distribute them evenly.",
    published: "2026-10-18",
    draft: false,
    body: () => (
      <>
        <p>
          Laying out a banner, a product grid or a social post means arranging many things at once.
          Until now Picstea worked on one layer at a time. Now you can select as many as you like.
        </p>
        <h2>Select several layers</h2>
        <p>
          Cmd-click (Ctrl-click) layers in the Layers panel to add them, Shift-click to select a
          range, or press Cmd/Ctrl+Alt+A to select them all. On the canvas, Shift-click with the
          Move tool adds the layer under the pointer.
        </p>
        <h2>Move, scale and rotate together</h2>
        <p>
          The selected layers get one frame: drag inside to move them, drag a handle to scale, or
          drag outside a corner to rotate. The same frame appears on a group, so a whole group can
          now be scaled and rotated too. Flip, group, duplicate and delete work on the whole
          selection — and each is a single undo step.
        </p>
        <h2>Align and distribute</h2>
        <p>
          Line layers up by their edges or centres, or spread three or more of them evenly — by
          centre or with equal gaps — from the Layer menu, the Move tool&apos;s options bar or the
          Properties panel.
        </p>
        <p>
          <EditorLink>Try it in Picstea</EditorLink> — free, no account, nothing uploaded. More in{" "}
          <Link href="/docs/layers-groups-and-masks">Layers, groups and masks</Link>.
        </p>
      </>
    ),
  },
  {
    slug: "vibrance-color-balance-gradient-map-and-more",
    title: "Vibrance, Color Balance, Gradient Map and more",
    description:
      "Five new adjustment layers — Vibrance, Color Balance, Photo Filter, Channel Mixer and Gradient Map — plus inner shadow, bevel and gradient overlay effects.",
    published: "2026-10-18",
    draft: false,
    body: () => (
      <>
        <p>
          Colour is where a photo gets its mood. Picstea now has the adjustment layers photographers
          and designers reach for most often after Levels and Curves — all non-destructive, all
          running in your browser.
        </p>
        <h2>Five new adjustments</h2>
        <ul>
          <li>
            <strong>Vibrance</strong> lifts muted colours while leaving already vivid ones (and
            skin) mostly alone.
          </li>
          <li>
            <strong>Color Balance</strong> shifts shadows, midtones and highlights separately — cool
            shadows and warm highlights in a few clicks.
          </li>
          <li>
            <strong>Photo Filter</strong> works like a coloured lens filter, warming or cooling the
            whole image.
          </li>
          <li>
            <strong>Channel Mixer</strong> rebuilds each colour channel from the others, and makes
            precise black-and-white conversions.
          </li>
          <li>
            <strong>Gradient Map</strong> maps the image&apos;s tones onto any gradient — duotones,
            colour grades and glow effects.
          </li>
        </ul>
        <h2>Three new layer styles</h2>
        <p>
          Inner shadow, bevel and gradient overlay join drop shadow, glow, stroke and colour overlay
          in the Properties panel.
        </p>
        <h2>Better PSD round trips</h2>
        <p>
          Photoshop files that use these adjustments and styles now open with them editable instead
          of baked into the pixels.
        </p>
        <p>
          <EditorLink>Try them in Picstea</EditorLink> — free, no account, nothing uploaded.
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
